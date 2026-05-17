import React from 'react';
import { ASTNode, QuoteNode, ImageNode, GalleryNode, StyleNode, RowNode, DepthLimitNode, AnimateNode, EasingType } from './types';
import {
  QUOTE_OPEN_TAG_RE,
  QUOTE_OPEN_TAG_GLOBAL_RE,
  parseQuoteStartTag,
  parseMediaSequence,
  parseInlineAttrs
} from './utils';

export interface TokenizerOptions {
  defaultMaxLimit?: number;
  maxQuoteDepth?: number;
  authorPath?: string[];
}

const IGNORE_TAGS = ['audio'] as const;

const toCssLength = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return isNaN(Number(value)) ? value : `${value}px`;
};

const toInlineAttr = (name: string, value: string | undefined): string => {
  if (!value) return '';
  return /\s/.test(value) ? `${name}="${value}"` : `${name}=${value}`;
};

const buildRowMediaAttrStr = (
  attrs: Record<string, string>,
  isGrid: boolean
): string | undefined => {
  const itemWidth = attrs.itemw || attrs.imagew || attrs.iw || attrs.cell || attrs.size;
  const itemHeight = attrs.itemh || attrs.imageh || attrs.ih || attrs.cell || attrs.size;
  const mode = attrs.mode || attrs.fit;
  const pos = attrs.pos;

  const parts = [
    toInlineAttr('w', isGrid ? '100%' : toCssLength(itemWidth)),
    toInlineAttr('h', toCssLength(itemHeight)),
    toInlineAttr('mode', mode),
    toInlineAttr('pos', pos),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : undefined;
};

const findNextIgnoredTag = (subText: string, currentPos: number): number => {
  let nearest = -1;
  for (const tag of IGNORE_TAGS) {
    const match = subText.match(new RegExp(`\\[#${tag}[^#]*#\\]`));
    if (!match || match.index == null) continue;
    const idx = currentPos + match.index;
    if (nearest === -1 || idx < nearest) {
      nearest = idx;
    }
  }
  return nearest;
};

const matchIgnoredTagAt = (text: string, start: number): RegExpMatchArray | null => {
  const pattern = `^\\[#(?:${IGNORE_TAGS.join('|')})[^#]*#\\]`;
  return text.substring(start).match(new RegExp(pattern));
};

export const tokenize = (
  text: string,
  options: TokenizerOptions = {},
  currentDepth: number = 0
): ASTNode[] => {
  const { defaultMaxLimit = 150, maxQuoteDepth = 4, authorPath = [] } = options;
  if (!text) return [];

  const nodes: ASTNode[] = [];
  let currentPos = 0;

  if (currentDepth >= maxQuoteDepth) {
    const fullChain = [...authorPath];
    const quoteRegex = new RegExp(QUOTE_OPEN_TAG_GLOBAL_RE);
    let match;
    while ((match = quoteRegex.exec(text)) !== null) {
      const parsed = parseQuoteStartTag(match[0], defaultMaxLimit);
      if (parsed?.author) {
        fullChain.push(parsed.author);
      }
    }
    return [{ type: 'depthLimit', authorChain: fullChain }];
  }

  while (currentPos < text.length) {
    const subText = text.substring(currentPos);

    // Find next tags
    const nextQuoteMatch = subText.match(QUOTE_OPEN_TAG_RE);
    const nextQuote = nextQuoteMatch && nextQuoteMatch.index != null ? currentPos + nextQuoteMatch.index : -1;

    const nextImageMatch = subText.match(/\[#image[^#]*#\]/);
    const nextImage = nextImageMatch && nextImageMatch.index != null ? currentPos + nextImageMatch.index : -1;

    const nextStyleMatch = subText.match(/\[#style[^#]*#\]/);
    const nextStyle = nextStyleMatch && nextStyleMatch.index != null ? currentPos + nextStyleMatch.index : -1;

    const nextGalleryMatch = subText.match(/\[#gallery[^#]*#\]/);
    const nextGallery = nextGalleryMatch && nextGalleryMatch.index != null ? currentPos + nextGalleryMatch.index : -1;

    const nextIgnoredTag = findNextIgnoredTag(subText, currentPos);

    const nextRowMatch = subText.match(/\[#row[^#]*#\]/);
    const nextRow = nextRowMatch && nextRowMatch.index != null ? currentPos + nextRowMatch.index : -1;

    const nextAnimateMatch = subText.match(/\[#animate[^#]*#\]/);
    const nextAnimate = nextAnimateMatch && nextAnimateMatch.index != null ? currentPos + nextAnimateMatch.index : -1;

    const nextAvatarMatch = subText.match(/\[#avatar[^#]*#\]/);
    const nextAvatar = nextAvatarMatch && nextAvatarMatch.index != null ? currentPos + nextAvatarMatch.index : -1;

    const nextTextTagMatch = subText.match(/<#text#?(?:\s[^>]*)?>|<\/#text#?>/);
    const nextTextTag = nextTextTagMatch && nextTextTagMatch.index != null ? currentPos + nextTextTagMatch.index : -1;

    // Determine nearest tag
    let foundIdx = -1;
    let type: 'quote' | 'image' | 'style' | 'gallery' | 'ignoredTag' | 'row' | 'animate' | 'avatar' | 'textTag' | 'none' = 'none';

    const indices: { idx: number; type: 'quote' | 'image' | 'style' | 'gallery' | 'ignoredTag' | 'row' | 'animate' | 'avatar' | 'textTag' }[] = [];
    if (nextQuote !== -1) indices.push({ idx: nextQuote, type: 'quote' });
    if (nextImage !== -1) indices.push({ idx: nextImage, type: 'image' });
    if (nextStyle !== -1) indices.push({ idx: nextStyle, type: 'style' });
    if (nextGallery !== -1) indices.push({ idx: nextGallery, type: 'gallery' });
    if (nextIgnoredTag !== -1) indices.push({ idx: nextIgnoredTag, type: 'ignoredTag' });
    if (nextRow !== -1) indices.push({ idx: nextRow, type: 'row' });
    if (nextAnimate !== -1) indices.push({ idx: nextAnimate, type: 'animate' });
    if (nextAvatar !== -1) indices.push({ idx: nextAvatar, type: 'avatar' });
    if (nextTextTag !== -1) indices.push({ idx: nextTextTag, type: 'textTag' });

    indices.sort((a, b) => a.idx - b.idx);

    if (indices.length > 0) {
      foundIdx = indices[0].idx;
      type = indices[0].type;
    }

    if (type === 'none') {
      nodes.push({ type: 'text', content: text.substring(currentPos) });
      break;
    }

    // Handle text before tag
    if (foundIdx > currentPos) {
      nodes.push({ type: 'text', content: text.substring(currentPos, foundIdx) });
    }

    if (type === 'quote') {
      const parsed = parseQuoteStartTag(text.substring(foundIdx), defaultMaxLimit);
      if (!parsed) {
        nodes.push({ type: 'text', content: '[#quote=' });
        currentPos = foundIdx + 8;
        continue;
      }

      const {
        fullTag, author, maxLimit, itemId, customStyle, maxQuoteDepthOverride,
        glass, glassBlur, glassOpacity, glassBorderColor, glassShadow,
        glassDistort, glassAberration, glassEdgeGlow, glassFresnel, glassGrain, glassRefraction
      } = parsed;
      const startTagEnd = foundIdx + fullTag.length;

      // Find closing tag with nesting support
      let depth = 1;
      let searchPos = startTagEnd;
      let endTagIdx = -1;

      while (depth > 0 && searchPos < text.length) {
        const remaining = text.substring(searchPos);
        const nextStartMatch = remaining.match(QUOTE_OPEN_TAG_RE);
        const nextStart = nextStartMatch && nextStartMatch.index != null ? searchPos + nextStartMatch.index : -1;
        const nextEnd = text.indexOf('[/#quote#]', searchPos);

        if (nextEnd === -1) break;
        if (nextStart !== -1 && nextStart < nextEnd) {
          depth++;
          searchPos = nextStart + 8;
        } else {
          depth--;
          if (depth === 0) endTagIdx = nextEnd;
          else searchPos = nextEnd + 10;
        }
      }

      if (endTagIdx !== -1) {
        nodes.push({
          type: 'quote',
          author,
          maxLimit,
          itemId,
          customStyle,
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
          glassRefraction,
          children: tokenize(text.substring(startTagEnd, endTagIdx), {
            ...options,
            maxQuoteDepth: maxQuoteDepthOverride ?? options.maxQuoteDepth,
            authorPath: [...authorPath, author]
          }, currentDepth + 1)
        });
        currentPos = endTagIdx + 10;
      } else {
        nodes.push({ type: 'text', content: fullTag });
        currentPos = startTagEnd;
      }
    } else if (type === 'image') {
      const match = text.substring(foundIdx).match(/^\[#image([^#]*)#\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        const endTagIdx = text.indexOf('[/#image#]', startTagEnd);
        if (endTagIdx !== -1) {
          const contentStr = text.substring(startTagEnd, endTagIdx);
          nodes.push({
            type: 'image',
            attrStr,
            mediaItems: parseMediaSequence(contentStr)
          });
          currentPos = endTagIdx + 10;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'style') {
      const match = text.substring(foundIdx).match(/^\[#style([^#]*)#\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;

        let depth = 1;
        let searchPos = startTagEnd;
        let endTagIdx = -1;
        while (depth > 0 && searchPos < text.length) {
          const nextStart = text.indexOf('[#style', searchPos);
          const nextEnd = text.indexOf('[/#style#]', searchPos);
          if (nextEnd === -1) break;
          if (nextStart !== -1 && nextStart < nextEnd) {
            depth++;
            searchPos = nextStart + 7;
          } else {
            depth--;
            if (depth === 0) endTagIdx = nextEnd;
            else searchPos = nextEnd + 10;
          }
        }

        if (endTagIdx !== -1) {
          const style: React.CSSProperties = {};
          const colorMatch = attrStr.match(/color=([^ #\]]+)/);
          if (colorMatch) style.color = colorMatch[1];
          const sizeMatch = attrStr.match(/size=(\d+)/);
          if (sizeMatch) style.fontSize = parseInt(sizeMatch[1]);
          const alignMatch = attrStr.match(/align=([^ #\]]+)/);
          if (alignMatch) {
            style.textAlign = alignMatch[1] as any;
            style.display = 'block';
            style.width = '100%';
          }
          if (attrStr.match(/\bb\b/)) style.fontWeight = 'bold';
          if (attrStr.match(/\bi\b/)) style.fontStyle = 'italic';
          if (attrStr.match(/\bu\b/)) style.textDecoration = 'underline';

          nodes.push({
            type: 'style',
            style,
            children: tokenize(text.substring(startTagEnd, endTagIdx), options, currentDepth)
          });
          currentPos = endTagIdx + 10;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'gallery') {
      const match = text.substring(foundIdx).match(/\[#gallery([^#]*)#\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        const endTagIdx = text.indexOf('[/#gallery#]', startTagEnd);
        if (endTagIdx !== -1) {
          const contentStr = text.substring(startTagEnd, endTagIdx);
          let defaultDuration = 2.5;
          const durationMatch = attrStr.match(/duration=([\d.]+)/);
          if (durationMatch) defaultDuration = parseFloat(durationMatch[1]);
          nodes.push({
            type: 'gallery',
            attrStr,
            mediaItems: parseMediaSequence(contentStr, defaultDuration)
          });
          currentPos = endTagIdx + 12;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'ignoredTag') {
      const match = matchIgnoredTagAt(text, foundIdx);
      if (match) {
        currentPos = foundIdx + match[0].length;
      } else {
        currentPos = foundIdx + 1;
      }
    } else if (type === 'row') {
      const match = text.substring(foundIdx).match(/^\[#row([^#]*)#\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;

        let depth = 1;
        let searchPos = startTagEnd;
        let endTagIdx = -1;
        while (depth > 0 && searchPos < text.length) {
          const nextStart = text.indexOf('[#row', searchPos);
          const nextEnd = text.indexOf('[/#row#]', searchPos);
          if (nextEnd === -1) break;
          if (nextStart !== -1 && nextStart < nextEnd) {
            depth++;
            searchPos = nextStart + 5;
          } else {
            depth--;
            if (depth === 0) endTagIdx = nextEnd;
            else searchPos = nextEnd + 8;
          }
        }

        if (endTagIdx !== -1) {
          const attrs = parseInlineAttrs(attrStr);
          const columns = Number.parseInt(attrs.cols || attrs.columns || '', 10);
          const isGrid = attrs.layout === 'grid' || Number.isFinite(columns);
          const gap = toCssLength(attrs.gap) || '0px';
          const justify = (attrs.justify || 'start') === 'between'
            ? 'space-between'
            : (attrs.justify || 'start') === 'around'
              ? 'space-around'
              : (attrs.justify || 'start');
          const rowStyle: React.CSSProperties = {
            display: isGrid ? 'grid' : 'flex',
            gap,
            alignItems: (attrs.align || 'center') as any,
            justifyContent: justify as any,
            margin: '12px 0',
            width: '100%'
          };

          if (isGrid) {
            const itemWidth = toCssLength(attrs.itemw || attrs.imagew || attrs.iw || attrs.cell || attrs.size);
            const columnCount = Number.isFinite(columns) && columns > 0 ? columns : 'auto-fit';
            rowStyle.gridTemplateColumns = `repeat(${columnCount}, ${itemWidth || 'minmax(0, 1fr)'})`;
            rowStyle.justifyItems = (attrs.justifyitems || 'stretch') as any;
          } else {
            rowStyle.flexDirection = 'row';
            rowStyle.flexWrap = 'wrap';
          }

          nodes.push({
            type: 'row',
            style: rowStyle,
            mediaAttrStr: buildRowMediaAttrStr(attrs, isGrid),
            children: tokenize(text.substring(startTagEnd, endTagIdx), options, currentDepth)
          });
          currentPos = endTagIdx + 8;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'animate') {
      const match = text.substring(foundIdx).match(/^\[#animate([^#]*)#\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;

        let depth = 1;
        let searchPos = startTagEnd;
        let endTagIdx = -1;
        while (depth > 0 && searchPos < text.length) {
          const nextStart = text.indexOf('[#animate', searchPos);
          const nextEnd = text.indexOf('[/#animate#]', searchPos);
          if (nextEnd === -1) break;
          if (nextStart !== -1 && nextStart < nextEnd) {
            depth++;
            searchPos = nextStart + 9;
          } else {
            depth--;
            if (depth === 0) endTagIdx = nextEnd;
            else searchPos = nextEnd + 12;
          }
        }

        if (endTagIdx !== -1) {
          const attrs = parseInlineAttrs(attrStr);

          const parseStyleStr = (str: string): React.CSSProperties => {
            const style: React.CSSProperties = {};
            if (!str) return style;
            str.split(';').forEach(pair => {
              const [key, val] = pair.split(':').map(s => s.trim());
              if (key && val) {
                if (key === 'x' || key === 'y' || key === 'scale' || key === 'scaleX' || key === 'scaleY' || key === 'rotate') {
                  (style as any)[key] = val;
                } else if (key === 'opacity') style.opacity = val;
                else (style as any)[key] = val;
              }
            });
            return style;
          };

          nodes.push({
            type: 'animate',
            from: parseStyleStr(attrs.from || ''),
            to: parseStyleStr(attrs.to || ''),
            keyframes: attrs.keyframes || attrs.kf,
            start: parseFloat(attrs.start || '0'),
            duration: parseFloat(attrs.duration || '1'),
            easing: attrs.easing || 'ease-out',
            children: tokenize(text.substring(startTagEnd, endTagIdx), options, currentDepth)
          });
          currentPos = endTagIdx + 12;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'avatar') {
      const match = text.substring(foundIdx).match(/^\[#avatar([^#]*)#\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        const endTagIdx = text.indexOf('[/#avatar#]', startTagEnd);
        if (endTagIdx !== -1) {
          const url = text.substring(startTagEnd, endTagIdx).trim();
          const typeMatch = attrStr.match(/type=([^ #\]]+)/);
          nodes.push({
            type: 'avatar',
            url,
            avatarType: typeMatch ? typeMatch[1] : undefined
          });
          currentPos = endTagIdx + 11;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'textTag') {
      const match = text.substring(foundIdx).match(/^<#text#?(?:\s[^>]*)?>|^<\/#text#?>/);
      if (match) {
        currentPos = foundIdx + match[0].length;
      }
    }
  }

  return nodes;
};
