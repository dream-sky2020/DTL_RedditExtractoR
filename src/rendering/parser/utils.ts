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
): { 
  fullTag: string; 
  author: string; 
  maxLimit: number; 
  itemId: string; 
  customStyle: React.CSSProperties; 
  maxQuoteDepthOverride?: number;
  glass?: boolean;
  glassBlur?: number;
  glassOpacity?: number;
  glassBorderColor?: string;
  glassShadow?: string;
  glassDistort?: number;
  glassAberration?: number;
  glassEdgeGlow?: string;
  glassFresnel?: number;
  glassGrain?: number;
  glassRefraction?: number;
} | null => {
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

  const glass = attrs.glass === 'true' || attrs.glass === '';
  const glassBlur = attrs.glassblur || attrs.gb ? Number(attrs.glassblur || attrs.gb) : undefined;
  const glassOpacity = attrs.glassopacity || attrs.go ? Number(attrs.glassopacity || attrs.go) : undefined;
  const glassBorderColor = attrs.glassborder || attrs.glassbordercolor || attrs.gbc;
  const glassShadow = attrs.glassshadow || attrs.gs;
  const glassDistort = attrs.glassdistort || attrs.gd ? Number(attrs.glassdistort || attrs.gd) : undefined;
  const glassAberration = attrs.glassaberration || attrs.ga ? Number(attrs.glassaberration || attrs.ga) : undefined;
  const glassEdgeGlow = attrs.glassedgeglow || attrs.geg;
  const glassFresnel = attrs.glassfresnel || attrs.gf ? Number(attrs.glassfresnel || attrs.gf) : undefined;
  const glassGrain = attrs.glassgrain || attrs.gg ? Number(attrs.glassgrain || attrs.gg) : undefined;
  const glassRefraction = attrs.glassrefraction || attrs.gr ? Number(attrs.glassrefraction || attrs.gr) : undefined;

  return { 
    fullTag, 
    author, 
    maxLimit, 
    itemId, 
    customStyle, 
    maxQuoteDepthOverride,
    glass,
    glassBlur,
    glassOpacity,
    glassBorderColor,
    glassShadow,
    glassDistort,
    glassAberration,
    glassEdgeGlow,
    glassFresnel,
    glassGrain,
    glassRefraction
  };
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
