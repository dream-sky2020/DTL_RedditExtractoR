import { VideoContentItem, VideoScene } from '../types';

export interface QuoteBlock {
  startIdx: number;
  endIdx: number;
  startTag: string;
  innerText: string;
  attrs: Record<string, string>;
}

const INLINE_ATTR_RE = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
const QUOTE_OPEN_TAG_RE = /\[quote(?:=[^\]]*|\s[^\]]*)?\]/g;
const DSL_LINE_BREAK_TOKEN = '[\\n]';

export const normalizeDslText = (text: string): string =>
  (text || '')
    .replace(/\r\n/g, '\n')
    .replace(new RegExp(DSL_LINE_BREAK_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\n');

export const normalizeComparableText = (text: string): string =>
  normalizeDslText(text)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

export const stripLeadingAuthorHeader = (content: string): string =>
  (content || '').replace(/^\[style[^\]]*\]u\/[^:\]]+:\[\/style\]\s*/i, '').trim();

const parseInlineAttrs = (input: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  INLINE_ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_ATTR_RE.exec(input)) !== null) {
    const key = (match[1] || '').trim().toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (key) attrs[key] = value;
  }
  return attrs;
};

export const parseQuoteStartTag = (startTag: string): Record<string, string> => {
  let tail = startTag.slice('[quote'.length, -1).trim();
  let positionalAuthor = '';

  if (tail.startsWith('=')) {
    tail = tail.slice(1).trim();
    const positionalMatch = tail.match(/^(?:"([^"]+)"|'([^']+)'|([^\s#\]]+))(.*)$/);
    if (positionalMatch) {
      positionalAuthor = (positionalMatch[1] ?? positionalMatch[2] ?? positionalMatch[3] ?? '').trim();
      tail = (positionalMatch[4] || '').trim();
    }
  }

  const attrs = parseInlineAttrs(tail);
  if (positionalAuthor && !attrs.author) {
    attrs.author = positionalAuthor;
  }
  return attrs;
};

const findMatchingQuoteEnd = (content: string, startTagEnd: number): number => {
  let depth = 1;
  let cursor = startTagEnd;

  while (depth > 0 && cursor < content.length) {
    QUOTE_OPEN_TAG_RE.lastIndex = cursor;
    const nextOpen = QUOTE_OPEN_TAG_RE.exec(content);
    const nextOpenIdx = nextOpen?.index ?? -1;
    const nextCloseIdx = content.indexOf('[/quote]', cursor);

    if (nextCloseIdx < 0) return -1;
    if (nextOpenIdx >= 0 && nextOpenIdx < nextCloseIdx) {
      depth += 1;
      cursor = nextOpenIdx + (nextOpen?.[0].length || 6);
      continue;
    }

    depth -= 1;
    if (depth === 0) return nextCloseIdx;
    cursor = nextCloseIdx + 8;
  }

  return -1;
};

export const extractTopLevelQuoteBlocks = (content: string): QuoteBlock[] => {
  const blocks: QuoteBlock[] = [];
  const source = content || '';
  let cursor = 0;

  while (cursor < source.length) {
    QUOTE_OPEN_TAG_RE.lastIndex = cursor;
    const open = QUOTE_OPEN_TAG_RE.exec(source);
    if (!open || open.index < 0) break;

    const startIdx = open.index;
    const startTag = open[0];
    const startTagEnd = startIdx + startTag.length;
    const endTagIdx = findMatchingQuoteEnd(source, startTagEnd);
    if (endTagIdx < 0) break;

    const endIdx = endTagIdx + 8;
    const innerText = source.slice(startTagEnd, endTagIdx);
    blocks.push({
      startIdx,
      endIdx,
      startTag,
      innerText,
      attrs: parseQuoteStartTag(startTag),
    });

    cursor = endIdx;
  }

  return blocks;
};

export const getFirstQuoteBlock = (content: string): QuoteBlock | null => {
  const blocks = extractTopLevelQuoteBlocks(content);
  if (blocks.length === 0) return null;
  return blocks[0];
};

export const getContentAfterFirstQuote = (content: string): string => {
  const firstQuote = getFirstQuoteBlock(content);
  if (!firstQuote) return '';
  return (content || '').slice(firstQuote.endIdx).trim();
};

export const hasQuoteTag = (content: string): boolean => /\[quote(?:=[^\]]*|\s[^\]]*)?\]/.test(content || '');

export const getSceneById = (scenes: VideoScene[], sceneId: string): VideoScene | null =>
  scenes.find((scene) => scene.id === sceneId) || null;

export const getPrimaryScene = (scenes: VideoScene[], primarySceneId: string): VideoScene | null =>
  getSceneById(scenes, primarySceneId);

export const getCandidateScenes = (scenes: VideoScene[], selectedSceneIds: string[], primarySceneId: string): VideoScene[] =>
  selectedSceneIds
    .filter((id) => id !== primarySceneId)
    .map((id) => getSceneById(scenes, id))
    .filter((scene): scene is VideoScene => scene != null);

export const cloneScenes = (scenes: VideoScene[]): VideoScene[] =>
  scenes.map((scene) => ({
    ...scene,
    items: scene.items.map((item) => ({ ...item })),
  }));

export const replaceSceneById = (scenes: VideoScene[], nextScene: VideoScene): VideoScene[] =>
  scenes.map((scene) => (scene.id === nextScene.id ? nextScene : scene));

export const removeScenesByIds = (scenes: VideoScene[], removeIds: Set<string>): VideoScene[] =>
  scenes.filter((scene) => !removeIds.has(scene.id));

export const patchQuoteMax = (startTag: string, maxValue: number): string => {
  const cleanMax = Math.max(1, Math.floor(maxValue));
  const maxRe = /\bmax\s*=\s*(?:"[^"]*"|'[^']*'|[^\s\]]+)/i;
  if (maxRe.test(startTag)) {
    return startTag.replace(maxRe, `max=${cleanMax}`);
  }
  return `${startTag.slice(0, -1)} max=${cleanMax}]`;
};

export const computeQuoteMaxByContent = (content: string, padding = 12): number => {
  const normalized = normalizeDslText(content);
  return Math.max(1, normalized.length + padding);
};

export const updateItemContent = (item: VideoContentItem, content: string): VideoContentItem => ({
  ...item,
  content,
});

export const textsLookEquivalent = (left: string, right: string): boolean => {
  const leftVariants = [
    normalizeComparableText(left),
    normalizeComparableText(stripLeadingAuthorHeader(left)),
  ];
  const rightVariants = [
    normalizeComparableText(right),
    normalizeComparableText(stripLeadingAuthorHeader(right)),
  ];

  for (const l of leftVariants) {
    for (const r of rightVariants) {
      if (l && r && l === r) return true;
    }
  }
  return false;
};

export const safeConcatBlocks = (base: string, append: string): string => {
  const left = (base || '').trimEnd();
  const right = (append || '').trim();
  if (!left) return right;
  if (!right) return left;
  return `${left}\n${right}`;
};

export const ensureUniqueItemId = (existingIds: Set<string>, itemId: string): string => {
  if (!existingIds.has(itemId)) return itemId;
  let cursor = 1;
  let nextId = `${itemId}-merged-${cursor}`;
  while (existingIds.has(nextId)) {
    cursor += 1;
    nextId = `${itemId}-merged-${cursor}`;
  }
  return nextId;
};
