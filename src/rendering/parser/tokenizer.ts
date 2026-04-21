import React from 'react';
import { ASTNode, TextNode, QuoteNode, ImageNode, GalleryNode, StyleNode, AudioNode, RowNode, DepthLimitNode } from './types';
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
    
    const nextImageMatch = subText.match(/\[image[^\]]*\]/);
    const nextImage = nextImageMatch && nextImageMatch.index != null ? currentPos + nextImageMatch.index : -1;
    
    const nextStyleMatch = subText.match(/\[style[^\]]*\]/);
    const nextStyle = nextStyleMatch && nextStyleMatch.index != null ? currentPos + nextStyleMatch.index : -1;
    
    const nextGalleryMatch = subText.match(/\[gallery[^\]]*\]/);
    const nextGallery = nextGalleryMatch && nextGalleryMatch.index != null ? currentPos + nextGalleryMatch.index : -1;
    
    const nextAudioMatch = subText.match(/\[audio[^\]]*\]/);
    const nextAudio = nextAudioMatch && nextAudioMatch.index != null ? currentPos + nextAudioMatch.index : -1;
    
    const nextRowMatch = subText.match(/\[row[^\]]*\]/);
    const nextRow = nextRowMatch && nextRowMatch.index != null ? currentPos + nextRowMatch.index : -1;

    // Determine nearest tag
    let foundIdx = -1;
    let type: 'quote' | 'image' | 'style' | 'gallery' | 'audio' | 'row' | 'none' = 'none';

    const indices: { idx: number; type: 'quote' | 'image' | 'style' | 'gallery' | 'audio' | 'row' }[] = [];
    if (nextQuote !== -1) indices.push({ idx: nextQuote, type: 'quote' });
    if (nextImage !== -1) indices.push({ idx: nextImage, type: 'image' });
    if (nextStyle !== -1) indices.push({ idx: nextStyle, type: 'style' });
    if (nextGallery !== -1) indices.push({ idx: nextGallery, type: 'gallery' });
    if (nextAudio !== -1) indices.push({ idx: nextAudio, type: 'audio' });
    if (nextRow !== -1) indices.push({ idx: nextRow, type: 'row' });

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
        nodes.push({ type: 'text', content: '[quote=' });
        currentPos = foundIdx + 7;
        continue;
      }

      const { fullTag, author, maxLimit, itemId, customStyle } = parsed;
      const startTagEnd = foundIdx + fullTag.length;

      // Find closing tag with nesting support
      let depth = 1;
      let searchPos = startTagEnd;
      let endTagIdx = -1;

      while (depth > 0 && searchPos < text.length) {
        const remaining = text.substring(searchPos);
        const nextStartMatch = remaining.match(QUOTE_OPEN_TAG_RE);
        const nextStart = nextStartMatch && nextStartMatch.index != null ? searchPos + nextStartMatch.index : -1;
        const nextEnd = text.indexOf('[/quote]', searchPos);
        
        if (nextEnd === -1) break;
        if (nextStart !== -1 && nextStart < nextEnd) {
          depth++;
          searchPos = nextStart + 7;
        } else {
          depth--;
          if (depth === 0) endTagIdx = nextEnd;
          else searchPos = nextEnd + 8;
        }
      }

      if (endTagIdx !== -1) {
        nodes.push({
          type: 'quote',
          author,
          maxLimit,
          itemId,
          customStyle,
          children: tokenize(text.substring(startTagEnd, endTagIdx), {
            ...options,
            authorPath: [...authorPath, author]
          }, currentDepth + 1)
        });
        currentPos = endTagIdx + 8;
      } else {
        nodes.push({ type: 'text', content: fullTag });
        currentPos = startTagEnd;
      }
    } else if (type === 'image') {
      const match = text.substring(foundIdx).match(/^\[image([^\]]*)\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        const endTagIdx = text.indexOf('[/image]', startTagEnd);
        if (endTagIdx !== -1) {
          const contentStr = text.substring(startTagEnd, endTagIdx);
          nodes.push({
            type: 'image',
            attrStr,
            mediaItems: parseMediaSequence(contentStr)
          });
          currentPos = endTagIdx + 8;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'style') {
      const match = text.substring(foundIdx).match(/^\[style([^\]]*)\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        
        let depth = 1;
        let searchPos = startTagEnd;
        let endTagIdx = -1;
        while (depth > 0 && searchPos < text.length) {
          const nextStart = text.indexOf('[style', searchPos);
          const nextEnd = text.indexOf('[/style]', searchPos);
          if (nextEnd === -1) break;
          if (nextStart !== -1 && nextStart < nextEnd) {
            depth++;
            searchPos = nextStart + 6;
          } else {
            depth--;
            if (depth === 0) endTagIdx = nextEnd;
            else searchPos = nextEnd + 8;
          }
        }

        if (endTagIdx !== -1) {
          const style: React.CSSProperties = {};
          const colorMatch = attrStr.match(/color=([^ \]]+)/);
          if (colorMatch) style.color = colorMatch[1];
          const sizeMatch = attrStr.match(/size=(\d+)/);
          if (sizeMatch) style.fontSize = parseInt(sizeMatch[1]);
          const alignMatch = attrStr.match(/align=([^ \]]+)/);
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
          currentPos = endTagIdx + 8;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'gallery') {
      const match = text.substring(foundIdx).match(/\[gallery([^\]]*)\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        const endTagIdx = text.indexOf('[/gallery]', startTagEnd);
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
          currentPos = endTagIdx + 10;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    } else if (type === 'audio') {
      const match = text.substring(foundIdx).match(/^\[audio([^\]]*)\]/);
      if (match) {
        const attrStr = match[1];
        const attrs = parseInlineAttrs(attrStr);
        nodes.push({
          type: 'audio',
          src: attrs.src || '',
          volume: parseFloat(attrs.volume || '1.0'),
          start: parseFloat(attrs.start || '0')
        });
        currentPos = foundIdx + match[0].length;
      }
    } else if (type === 'row') {
      const match = text.substring(foundIdx).match(/^\[row([^\]]*)\]/);
      if (match) {
        const attrStr = match[1];
        const startTagEnd = foundIdx + match[0].length;
        
        let depth = 1;
        let searchPos = startTagEnd;
        let endTagIdx = -1;
        while (depth > 0 && searchPos < text.length) {
          const nextStart = text.indexOf('[row', searchPos);
          const nextEnd = text.indexOf('[/row]', searchPos);
          if (nextEnd === -1) break;
          if (nextStart !== -1 && nextStart < nextEnd) {
            depth++;
            searchPos = nextStart + 4;
          } else {
            depth--;
            if (depth === 0) endTagIdx = nextEnd;
            else searchPos = nextEnd + 6;
          }
        }

        if (endTagIdx !== -1) {
          const attrs = parseInlineAttrs(attrStr);
          const rowStyle: React.CSSProperties = {
            display: 'flex', 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            gap: attrs.gap ? (isNaN(Number(attrs.gap)) ? attrs.gap : `${attrs.gap}px`) : '8px', 
            alignItems: (attrs.align || 'center') as any, 
            justifyContent: (attrs.justify || 'start') === 'between' ? 'space-between' : (attrs.justify || 'start') === 'around' ? 'space-around' : (attrs.justify || 'start') as any, 
            margin: '12px 0', 
            width: '100%'
          };
          nodes.push({
            type: 'row',
            style: rowStyle,
            children: tokenize(text.substring(startTagEnd, endTagIdx), options, currentDepth)
          });
          currentPos = endTagIdx + 6;
        } else {
          nodes.push({ type: 'text', content: match[0] });
          currentPos = startTagEnd;
        }
      }
    }
  }

  return nodes;
};
