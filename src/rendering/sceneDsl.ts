import { ItemAnimationType, SceneLayoutType, VideoScene } from '../types';

type AttrMap = Record<string, string>;

const ATTR_RE = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

const parseAttrs = (input: string): AttrMap => {
  const attrs: AttrMap = {};
  let match: RegExpExecArray | null;

  while ((match = ATTR_RE.exec(input)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = value;
  }

  return attrs;
};

const escapeAttr = (value: string): string => value.replace(/"/g, '&quot;');

const DSL_LINE_BREAK_TOKEN = '[\\n]';

const encodeDslLineBreaks = (content: string): string =>
  content.replace(/\r\n/g, '\n').replace(/\n/g, DSL_LINE_BREAK_TOKEN);

const decodeDslLineBreaks = (content: string): string =>
  content.replace(new RegExp(DSL_LINE_BREAK_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\n');

const normalizeItemContent = (content: string): string => {
  let normalized = decodeDslLineBreaks(content).replace(/\r\n/g, '\n');
  normalized = normalized.replace(/^\n+/, '').replace(/\n+$/, '');
  return normalized;
};

const buildItemId = (idx: number): string =>
  `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`;

const ITEM_ANIMATION_SET: ReadonlySet<ItemAnimationType> = new Set([
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
]);

const SCENE_LAYOUT_SET: ReadonlySet<SceneLayoutType> = new Set(['top', 'center']);

const parseOptionalSeconds = (value: string | undefined): number | undefined => {
  if (value == null || value.trim() === '') return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return num;
};

const parseOptionalAnimation = (value: string | undefined): ItemAnimationType | undefined => {
  if (!value) return undefined;
  if (ITEM_ANIMATION_SET.has(value as ItemAnimationType)) {
    return value as ItemAnimationType;
  }
  return undefined;
};

export interface SceneDslWarning {
  message: string;
  suggestion: string;
}

export type ParseSceneDslResult =
  | { ok: true; scene: VideoScene; warnings: SceneDslWarning[] }
  | { ok: false; error: string };

export const sceneToDsl = (scene: VideoScene): string => {
  const layout = SCENE_LAYOUT_SET.has((scene.layout || 'top') as SceneLayoutType)
    ? (scene.layout as SceneLayoutType)
    : 'top';
  const sceneAttrs = [
    `id="${escapeAttr(scene.id)}"`,
    `duration=${scene.duration}`,
    `type="${scene.type}"`,
    `layout="${layout}"`,
    `title="${escapeAttr(scene.title || '')}"`,
  ];

  if (scene.backgroundColor) {
    sceneAttrs.push(`bg="${escapeAttr(scene.backgroundColor)}"`);
  }

  const itemBlocks = scene.items
    .map((item) => {
      const itemAttrs = [`id="${escapeAttr(item.id)}"`, `author="${escapeAttr(item.author)}"`];
      const enterAt = Number.isFinite(item.enterAt) && (item.enterAt as number) >= 0 ? item.enterAt : 0;
      const exitAt =
        Number.isFinite(item.exitAt) && (item.exitAt as number) >= 0 ? item.exitAt : scene.duration;
      const enterAnimation = item.enterAnimation || 'none';
      const exitAnimation = item.exitAnimation || 'none';
      itemAttrs.push(`enterAt=${enterAt}`);
      itemAttrs.push(`exitAt=${exitAt}`);
      itemAttrs.push(`enterAnimation="${enterAnimation}"`);
      itemAttrs.push(`exitAnimation="${exitAnimation}"`);
      if (item.backgroundColor) {
        itemAttrs.push(`bg="${escapeAttr(item.backgroundColor)}"`);
      }
      const content = encodeDslLineBreaks((item.content || '').trim());
      return `  <item ${itemAttrs.join(' ')}>\n${content ? `${content}\n` : ''}  </item>`;
    })
    .join('\n\n');

  return `<scene ${sceneAttrs.join(' ')}>\n${itemBlocks}\n</scene>`;
};

export const parseSceneDsl = (
  rawText: string,
  fallbackScene?: VideoScene
): ParseSceneDslResult => {
  const text = rawText.trim();
  const warnings: SceneDslWarning[] = [];
  const sceneMatch = text.match(/^<scene\b([^>]*)>([\s\S]*?)<\/scene>\s*$/i);

  const rootAttrsText = sceneMatch?.[1] ?? '';
  const body = sceneMatch?.[2] ?? text;
  if (!sceneMatch) {
    warnings.push({
      message: '未检测到合法 <scene ...>...</scene> 根节点，已按容错模式继续解析。',
      suggestion: '建议补全根节点，例如：<scene id="scene-001" duration=8 type="comments">...</scene>。',
    });
  }

  const sceneAttrs = parseAttrs(rootAttrsText);

  let id = (sceneAttrs.id || '').trim();
  if (!id) {
    id = (fallbackScene?.id || `scene-${Date.now()}`).trim();
    warnings.push({
      message: 'scene.id 缺失，已自动补全。',
      suggestion: '建议显式设置唯一 id，如 id="scene-001"。',
    });
  }

  const typeRaw = (sceneAttrs.type || '').trim();
  let type: VideoScene['type'];
  if (typeRaw === 'post' || typeRaw === 'comments') {
    type = typeRaw;
  } else {
    type = fallbackScene?.type || 'comments';
    warnings.push({
      message: `scene.type="${typeRaw || '(空)'}" 无效，已自动回退为 "${type}"。`,
      suggestion: 'type 仅支持 "post" 或 "comments"。',
    });
  }

  const durationRaw = sceneAttrs.duration;
  const parsedDuration = Number(durationRaw);
  let duration: number;
  if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
    duration = parsedDuration;
  } else {
    duration = fallbackScene?.duration && fallbackScene.duration > 0 ? fallbackScene.duration : 5;
    warnings.push({
      message: `scene.duration="${durationRaw ?? '(空)'}" 无效，已自动回退为 ${duration}s。`,
      suggestion: '建议填写大于 0 的数字，例如 duration=8。',
    });
  }

  const title = sceneAttrs.title ?? fallbackScene?.title ?? '';
  const backgroundColor = sceneAttrs.bg || sceneAttrs.backgroundColor || fallbackScene?.backgroundColor || '';
  const layoutRaw = (sceneAttrs.layout ?? '').trim();
  const fallbackLayout = fallbackScene?.layout;
  let layout: SceneLayoutType;
  if (!layoutRaw) {
    layout = fallbackLayout && SCENE_LAYOUT_SET.has(fallbackLayout) ? fallbackLayout : 'top';
  } else if (SCENE_LAYOUT_SET.has(layoutRaw as SceneLayoutType)) {
    layout = layoutRaw as SceneLayoutType;
  } else {
    layout = fallbackLayout && SCENE_LAYOUT_SET.has(fallbackLayout) ? fallbackLayout : 'top';
    warnings.push({
      message: `scene.layout="${layoutRaw}" 无效，已自动回退为 "${layout}"。`,
      suggestion: 'layout 仅支持 "top" 或 "center"。',
    });
  }

  const itemRegex = /<item\b([^>]*)>([\s\S]*?)<\/item>/gi;
  const items: VideoScene['items'] = [];
  let itemMatch: RegExpExecArray | null;
  let index = 0;

  while ((itemMatch = itemRegex.exec(body)) !== null) {
    const itemAttrs = parseAttrs(itemMatch[1]);
    const authorRaw = (itemAttrs.author || '').trim();
    const author = authorRaw || fallbackScene?.items?.[index]?.author || `User${index + 1}`;
    if (!authorRaw) {
      warnings.push({
        message: `第 ${index + 1} 个 <item> 缺失 author，已自动补全为 "${author}"。`,
        suggestion: `建议为第 ${index + 1} 个 item 显式填写 author 属性。`,
      });
    }

    const content = normalizeItemContent(itemMatch[2]);
    const fallbackItem = fallbackScene?.items?.[index];
    const fallbackId = fallbackItem?.id;
    const itemId = (itemAttrs.id || fallbackId || buildItemId(index)).trim();
    if (!itemAttrs.id || !itemAttrs.id.trim()) {
      warnings.push({
        message: `第 ${index + 1} 个 <item> 缺失 id，已自动补全为 "${itemId}"。`,
        suggestion: `建议为第 ${index + 1} 个 item 设置稳定 id，便于后续编辑。`,
      });
    }

    const parsedEnterAt = parseOptionalSeconds(itemAttrs.enterAt);
    const parsedExitAt = parseOptionalSeconds(itemAttrs.exitAt);
    const enterAt = parsedEnterAt ?? fallbackItem?.enterAt;
    const exitAt = parsedExitAt ?? fallbackItem?.exitAt;
    if (itemAttrs.enterAt != null && parsedEnterAt == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <item> 的 enterAt="${itemAttrs.enterAt}" 无效，已自动回退。`,
        suggestion: 'enterAt 需为大于等于 0 的数字。',
      });
    }
    if (itemAttrs.exitAt != null && parsedExitAt == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <item> 的 exitAt="${itemAttrs.exitAt}" 无效，已自动回退。`,
        suggestion: 'exitAt 需为大于等于 0 的数字，且建议不早于 enterAt。',
      });
    }

    const parsedEnterAnimation = parseOptionalAnimation(itemAttrs.enterAnimation);
    const parsedExitAnimation = parseOptionalAnimation(itemAttrs.exitAnimation);
    const enterAnimation = parsedEnterAnimation ?? fallbackItem?.enterAnimation;
    const exitAnimation = parsedExitAnimation ?? fallbackItem?.exitAnimation;
    const itemBackgroundColor = itemAttrs.bg || itemAttrs.backgroundColor || fallbackItem?.backgroundColor || '';
    if (itemAttrs.enterAnimation != null && parsedEnterAnimation == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <item> 的 enterAnimation="${itemAttrs.enterAnimation}" 无效，已自动回退。`,
        suggestion: 'enterAnimation 可选值：none/fade/slide-up/slide-left/zoom-in 等。',
      });
    }
    if (itemAttrs.exitAnimation != null && parsedExitAnimation == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <item> 的 exitAnimation="${itemAttrs.exitAnimation}" 无效，已自动回退。`,
        suggestion: 'exitAnimation 可选值：none/fade/slide-down/slide-right/zoom-out 等。',
      });
    }

    items.push({
      ...(fallbackItem || {}),
      id: itemId,
      author,
      content,
      enterAt,
      exitAt,
      enterAnimation,
      exitAnimation,
      backgroundColor: itemBackgroundColor,
    });
    index += 1;
  }

  if (items.length === 0) {
    const fallbackItem = fallbackScene?.items?.[0];
    items.push({
      id: fallbackItem?.id || buildItemId(0),
      author: fallbackItem?.author || 'User1',
      content: normalizeItemContent(body),
      enterAt: fallbackItem?.enterAt,
      exitAt: fallbackItem?.exitAt,
      enterAnimation: fallbackItem?.enterAnimation,
      exitAnimation: fallbackItem?.exitAnimation,
      ...(fallbackItem || {}),
    });
    warnings.push({
      message: '未检测到 <item> 节点，已自动创建 1 个 item 并写入正文内容。',
      suggestion: '建议使用 <item ...>...</item> 包裹每个内容格，以便单独控制作者与动画。',
    });
  }

  return {
    ok: true,
    scene: {
      id,
      type,
      title,
      layout,
      backgroundColor,
      duration,
      items,
    },
    warnings,
  };
};

