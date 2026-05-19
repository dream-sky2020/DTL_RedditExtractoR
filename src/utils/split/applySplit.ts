import { VideoConfig, VideoScene } from '../../types';
import { toast } from '@components/Toast';
import { createUniqueRandomId } from '../../hooks/multiSelectUtils';
import { stripScene, wrapScene } from './core/sceneProcessor';
import { stripItem, wrapItem } from './core/itemProcessor';
import { stripAuthor } from './core/authorProcessor';
import { stripTitle } from './core/titleProcessor';
import { splitInternalContent } from './core/contentSplitter';

/**
 * 处理 [split] 裁剪逻辑，将一个画面格根据标记拆分为多个
 * 严格按照 剥离作者 -> 剥离标题 -> 剥离 Item -> 剥离 Scene 的逻辑重组
 */
export const applySplit = (
  dslWithSplits: string,
  draftConfig: VideoConfig,
  selectedSceneIds: string[],
  setDraftConfig: (config: VideoConfig) => void,
  setSelectedSceneIds: (ids: string[]) => void
) => {
  try {
    const sourceSceneIndex = draftConfig.scenes.findIndex(scene => scene.id === selectedSceneIds[0]);
    if (sourceSceneIndex === -1) return;

    // 1. 剥离 Scene 外壳
    const sceneInfo = stripScene(dslWithSplits);

    // 2. 识别 [split] 标记
    const splitMarker = '[[INTERNAL_SPLIT_POINT]]';
    const dslWithMarkers = sceneInfo.content.replace(/\[#?split#?\]/g, splitMarker);

    // 3. 处理每个 Item
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    const itemSegmentsMap: string[][] = [];
    const itemAttrsList: string[] = [];

    while ((match = itemRegex.exec(dslWithMarkers)) !== null) {
      const itemDsl = match[0];
      const itemInfo = stripItem(itemDsl);
      itemAttrsList.push(itemInfo.attributes);

      // 4. 剥离作者信息 (包含外层 style)
      const authorInfo = stripAuthor(itemInfo.content);

      // 5. 剥离标题信息 (可选)
      const titleInfo = stripTitle(authorInfo.remainingContent);

      // 6. 内部切割核心内容
      // 注意：这里传入的是已经剥离了作者和标题的内容
      const segments = splitInternalContent(titleInfo.remainingContent, splitMarker);
      
      // 7. 组装每个片段
      const fullSegments = segments.map(seg => {
        // 组装顺序：作者(含外壳) -> 标题 -> 核心内容
        // 这里不需要手动补全外层 style 的闭合，因为 splitInternalContent 会根据栈自动补全
        return authorInfo.fullBlock + titleInfo.fullBlock + seg;
      });

      itemSegmentsMap.push(fullSegments);
    }

    const maxParts = Math.max(...itemSegmentsMap.map(s => s.length));
    if (maxParts <= 1) {
      toast.warning('未检测到有效的 [split] 标记');
      return;
    }

    // 8. 生成新场景
    const sceneIds = new Set(draftConfig.scenes.map(scene => scene.id));
    const itemIds = new Set(draftConfig.scenes.flatMap(scene => scene.items.map(item => item.id)));

    const newGeneratedScenes: VideoScene[] = [];
    for (let i = 0; i < maxParts; i++) {
      // 组装 Item 内容
      const itemsDsl = itemSegmentsMap.map((segments, idx) => {
        const content = segments[i] ?? segments[segments.length - 1];
        return wrapItem(itemAttrsList[idx], content);
      }).join('\n\n');

      // 组装 Scene 内容
      const finalSceneDsl = wrapScene(sceneInfo.attributes, itemsDsl);
      
      // 这里我们需要将 DSL 转换回 VideoScene 对象
      // 为了简单起见，我们克隆原场景并更新内容，因为 wrapScene 已经处理了 DSL 结构
      // 但实际上我们需要一个真正的解析过程或者手动构建对象
      // 由于 applySplit 的目的是更新 draftConfig，我们直接构建对象
      
      // 注意：这里为了保持属性一致，我们直接从原场景复制，只修改 ID 和 Items
      const newScene: VideoScene = {
        ...draftConfig.scenes[sourceSceneIndex],
        id: createUniqueRandomId(sceneIds, 'scene-'),
        items: draftConfig.scenes[sourceSceneIndex].items.map((item, itemIdx) => {
          const segments = itemSegmentsMap[itemIdx];
          const content = segments[i] ?? segments[segments.length - 1];
          return {
            ...item,
            id: createUniqueRandomId(itemIds),
            content: content
          };
        })
      };
      newGeneratedScenes.push(newScene);
    }

    const newScenes = [...draftConfig.scenes];
    newScenes.splice(sourceSceneIndex, 1, ...newGeneratedScenes);

    setDraftConfig({ ...draftConfig, scenes: newScenes });
    setSelectedSceneIds(newGeneratedScenes.map(s => s.id));
    toast.success(`已成功裁剪并生成 ${newGeneratedScenes.length} 个新画面格`);

  } catch (error: any) {
    toast.error(`重构失败: ${error.message}`);
    console.error(error);
  }
};
