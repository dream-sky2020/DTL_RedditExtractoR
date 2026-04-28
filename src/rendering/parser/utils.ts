import React from 'react';
import { MediaItem } from './types';

export const INLINE_ATTR_RE = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
export const QUOTE_OPEN_TAG_RE = /\[quote(?:=[^\]]*|\s[^\]]*)?\]/;
export const QUOTE_OPEN_TAG_GLOBAL_RE = /\[quote(?:=[^\]]*|\s[^\]]*)?\]/g;

export const parseInlineAttrs = (input: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  INLINE_ATTR_RE.lastIndex = 0;
  while ((match = INLINE_ATTR_RE.exec(input)) !== null) {
    const key = (match[1] || '').trim().toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (key) attrs[key] = value;
  }
  return attrs;
};

export const parseQuoteStartTag = (
  source: string,
  defaultMaxLimit: number
): { fullTag: string; author: string; maxLimit: number; itemId: string; customStyle: React.CSSProperties; maxQuoteDepthOverride?: number } | null => {
  const startTagMatch = source.match(/^\[quote(?:=[^\]]*|\s[^\]]*)?\]/);
  if (!startTagMatch) return null;

  const fullTag = startTagMatch[0];
  let tail = fullTag.slice('[quote'.length, -1).trim();
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
  const author = (attrs.author || positionalAuthor || '').trim();
  const maxFromAttr = Number(attrs.max);
  const maxLimit = Number.isFinite(maxFromAttr) && maxFromAttr > 0 ? maxFromAttr : defaultMaxLimit;
  const itemId = (attrs.id || '').trim();
  
  // 新增：解析 depth 属性作为嵌套深度覆盖
  const depthFromAttr = Number(attrs.depth);
  const maxQuoteDepthOverride = Number.isFinite(depthFromAttr) && depthFromAttr > 0 ? depthFromAttr : undefined;

  const customStyle: React.CSSProperties = {};
  if (attrs.size) {
    const size = parseInt(attrs.size);
    if (!isNaN(size)) customStyle.fontSize = size;
  }
  if (attrs.color) customStyle.color = attrs.color;
  if (attrs.bg) customStyle.backgroundColor = attrs.bg;
  if (attrs.bc || attrs.bordercolor) customStyle.borderColor = attrs.bc || attrs.bordercolor;
  if (attrs.bold === 'true' || attrs.bold === '') customStyle.fontWeight = 'bold';
  if (attrs.italic === 'true' || attrs.italic === '') customStyle.fontStyle = 'italic';

  return { fullTag, author, maxLimit, itemId, customStyle, maxQuoteDepthOverride };
};

export const parseMediaSequence = (source: string, defaultDuration: number = 2.5): MediaItem[] =>
  source
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item) => {
      const [rawUrl, rawDuration] = item.split('|');
      return {
        url: (rawUrl || '').trim(),
        duration: Number(rawDuration) > 0 ? Number(rawDuration) : defaultDuration,
      };
    })
    .filter((item) => item.url !== '');
