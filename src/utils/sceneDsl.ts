import { ItemAnimationType, VideoScene } from '../types';

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

const normalizeItemContent = (content: string): string => {
  let normalized = content.replace(/\r\n/g, '\n');
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

export const sceneToDsl = (scene: VideoScene): string => {
  const sceneAttrs = [
    `id="${escapeAttr(scene.id)}"`,
    `duration=${scene.duration}`,
    `type="${scene.type}"`,
    `title="${escapeAttr(scene.title || '')}"`,
  ];

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
      const content = (item.content || '').trim();
      return `  <item ${itemAttrs.join(' ')}>\n${content ? `${content}\n` : ''}  </item>`;
    })
    .join('\n\n');

  return `<scene ${sceneAttrs.join(' ')}>\n${itemBlocks}\n</scene>`;
};

export const parseSceneDsl = (
  rawText: string,
  fallbackScene?: VideoScene
): { ok: true; scene: VideoScene } | { ok: false; error: string } => {
  const text = rawText.trim();
  const sceneMatch = text.match(/^<scene\b([^>]*)>([\s\S]*?)<\/scene>\s*$/i);

  if (!sceneMatch) {
    return { ok: false, error: '场景脚本格式错误：需要且只能有一个 <scene ...>...</scene> 根节点' };
  }

  const sceneAttrs = parseAttrs(sceneMatch[1]);
  const body = sceneMatch[2];

  const id = (sceneAttrs.id || '').trim();
  if (!id) return { ok: false, error: 'scene.id 缺失或为空' };

  const type = (sceneAttrs.type || '').trim();
  if (type !== 'post' && type !== 'comments') {
    return { ok: false, error: 'scene.type 只能是 post 或 comments' };
  }

  const duration = Number(sceneAttrs.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { ok: false, error: 'scene.duration 必须是大于 0 的数字' };
  }

  const title = sceneAttrs.title ?? '';
  const itemRegex = /<item\b([^>]*)>([\s\S]*?)<\/item>/gi;
  const items: VideoScene['items'] = [];
  let itemMatch: RegExpExecArray | null;
  let index = 0;

  while ((itemMatch = itemRegex.exec(body)) !== null) {
    const itemAttrs = parseAttrs(itemMatch[1]);
    const author = (itemAttrs.author || '').trim();
    if (!author) {
      return { ok: false, error: `第 ${index + 1} 个 <item> 缺失 author` };
    }

    const content = normalizeItemContent(itemMatch[2]);
    const fallbackItem = fallbackScene?.items?.[index];
    const fallbackId = fallbackItem?.id;
    const itemId = (itemAttrs.id || fallbackId || buildItemId(index)).trim();
    if (!itemId) {
      return { ok: false, error: `第 ${index + 1} 个 <item> 缺失 id` };
    }

    const enterAt = parseOptionalSeconds(itemAttrs.enterAt) ?? fallbackItem?.enterAt;
    const exitAt = parseOptionalSeconds(itemAttrs.exitAt) ?? fallbackItem?.exitAt;
    const enterAnimation = parseOptionalAnimation(itemAttrs.enterAnimation) ?? fallbackItem?.enterAnimation;
    const exitAnimation = parseOptionalAnimation(itemAttrs.exitAnimation) ?? fallbackItem?.exitAnimation;

    items.push({
      ...(fallbackItem || {}),
      id: itemId,
      author,
      content,
      enterAt,
      exitAt,
      enterAnimation,
      exitAnimation,
    });
    index += 1;
  }

  if (items.length === 0) {
    return { ok: false, error: 'scene.items 不能为空：至少需要一个 <item>...</item>' };
  }

  return {
    ok: true,
    scene: {
      id,
      type,
      title,
      duration,
      items,
    },
  };
};
