import { VideoConfig, VideoScene } from '../../types';
import { toast } from '@components/Toast';
import { parseSceneDsl } from '../../rendering/sceneDsl';
import { createUniqueRandomId } from '../../hooks/multiSelectUtils';

/**
 * 根据起始标签生成对应的闭合标签
 * 例如: [#style size=43#] -> [/#style#]
 * 例如: <#text#> -> </#text#>
 * 例如: <#text color=red#> -> </#text#>
 */
function getClosingTag(openingTag: string): string {
  if (openingTag.startsWith('<')) {
    // XML 风格标签
    // 匹配标签名，包括可能存在的 # 前缀或后缀
    const match = openingTag.match(/<#([a-zA-Z0-9_]+)/);
    if (!match) return '';
    const name = match[1];
    return `</#${name}#>`;
  } else {
    // BBCode 风格标签
    const match = openingTag.match(/\[#([a-zA-Z0-9_]+)/);
    if (!match) return '';
    const name = match[1];
    return `[/#${name}#]`;
  }
}

/**
 * 标签感知的 DSL 内容分割
 * 采用流式处理：遍历所有标签和分割点，在分割点自动闭合当前栈中的所有标签，并在新段落重新开启
 * 核心要求：重新开启标签时必须完整保留原始属性
 */
function splitContentWithTags(content: string, splitMarker: string): string[] {
  // 匹配标签的正则：[#tag ...#], [/#tag#], <#text#>, </#text#>
  const tagRegex = /\[#\/?[a-zA-Z_#][^#]*#\]|<#?\/?[a-zA-Z_#][^#]*#>/g;
  const markerRegex = new RegExp(splitMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

  const allTokens: { type: 'tag' | 'marker'; value: string; index: number; length: number }[] = [];

  let match;
  tagRegex.lastIndex = 0;
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[0];
    // 排除自闭合或单点标记，如 [#\n#]
    if (tag !== '[#\\n#]') {
      allTokens.push({ type: 'tag', value: tag, index: match.index, length: tag.length });
    }
  }

  markerRegex.lastIndex = 0;
  while ((match = markerRegex.exec(content)) !== null) {
    allTokens.push({ type: 'marker', value: match[0], index: match.index, length: match[0].length });
  }

  // 按在原内容中的顺序排序
  allTokens.sort((a, b) => a.index - b.index);

  const segments: string[] = [];
  let currentStack: string[] = []; // 存储完整的起始标签字符串，包含属性
  let lastIndex = 0;
  let currentSegment = "";

  for (const token of allTokens) {
    // 累加当前 token 之前的文本
    currentSegment += content.substring(lastIndex, token.index);
    lastIndex = token.index + token.length;

    if (token.type === 'tag') {
      const tag = token.value;
      currentSegment += tag;
      if (tag.startsWith('[/') || tag.startsWith('</')) {
        // 闭合标签，从栈中弹出
        currentStack.pop();
      } else {
        // 开始标签，压入栈中（保留完整字符串，包括属性）
        currentStack.push(tag);
      }
    } else {
      // 遇到分割标记！
      // 1. 生成闭合标签序列（逆序弹出）
      const closingTags = [...currentStack].reverse().map(t => getClosingTag(t));

      // 2. 结束当前段落
      segments.push(currentSegment + closingTags.join(''));

      // 3. 开启新段落，并自动重开之前所有未闭合的标签（完整保留属性）
      currentSegment = currentStack.join('');
    }
  }

  // 处理剩余文本
  currentSegment += content.substring(lastIndex);
  segments.push(currentSegment);

  return segments;
}

/**
 * 处理 [split] 裁剪逻辑，将一个画面格根据标记拆分为多个
 */
export const applySplit = (
  dslWithSplits: string,
  draftConfig: VideoConfig,
  selectedSceneIds: string[],
  setDraftConfig: (config: VideoConfig) => void,
  setSelectedSceneIds: (ids: string[]) => void
) => {
  const sourceSceneIndex = draftConfig.scenes.findIndex(scene => scene.id === selectedSceneIds[0]);
  if (sourceSceneIndex === -1) return;

  const sourceScene = draftConfig.scenes[sourceSceneIndex];

  // 使用随机标记替换 [#split#]，避免正则冲突
  const splitMarker = `__SPLIT_${Math.random().toString(36).slice(2, 9)}__`;
  const dslForParsing = dslWithSplits.replace(/\[#split#\]/g, splitMarker);

  const parseResult = parseSceneDsl(dslForParsing, sourceScene);
  if (!parseResult.ok) {
    toast.error(`解析失败: ${parseResult.error}`);
    return;
  }

  const parsedScene = parseResult.scene;

  let maxParts = 1;
  const itemPartsMap = parsedScene.items.map(item => {
    const segments = splitContentWithTags(item.content, splitMarker);
    if (segments.length > maxParts) maxParts = segments.length;
    return segments;
  });

  if (maxParts <= 1) {
    toast.warning('未检测到有效的 [#split#] 标记');
    return;
  }

  const sceneIds = new Set(draftConfig.scenes.map(scene => scene.id));
  const itemIds = new Set(draftConfig.scenes.flatMap(scene => scene.items.map(item => item.id)));

  const newGeneratedScenes: VideoScene[] = [];
  for (let i = 0; i < maxParts; i++) {
    const newScene: VideoScene = {
      ...parsedScene,
      id: createUniqueRandomId(sceneIds, 'scene-'),
      items: parsedScene.items.map((item, itemIdx) => ({
        ...item,
        id: createUniqueRandomId(itemIds),
        content: itemPartsMap[itemIdx][i] ?? itemPartsMap[itemIdx][itemPartsMap[itemIdx].length - 1]
      }))
    };
    newGeneratedScenes.push(newScene);
  }

  const newScenes = [...draftConfig.scenes];
  newScenes.splice(sourceSceneIndex, 1, ...newGeneratedScenes);

  setDraftConfig({ ...draftConfig, scenes: newScenes });
  setSelectedSceneIds(newGeneratedScenes.map(s => s.id));
  toast.success(`已成功裁剪并生成 ${newGeneratedScenes.length} 个新画面格`);
};
