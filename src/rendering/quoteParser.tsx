import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Typography, Button, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, SoundOutlined } from '@ant-design/icons';
import { toast } from '../components/Toast';
import axios from 'axios';

const { Text } = Typography;

// 新增：用于在渲染树中共享播放进度的上下文，避免整个树重复解析
export const PlaybackContext = createContext<{
  playbackFrame?: number;
  fps?: number;
}>({});

export const usePlaybackContext = () => useContext(PlaybackContext);

const AUDIO_ITEMS_STORAGE_KEY = 'reddit-extractor.audio-items.v1';

// 辅助函数：触发音频列表刷新并更新缓存
const refreshAudioCache = async () => {
  try {
    const response = await axios.get('http://localhost:5000/list_audio');
    if (response.data.success) {
      const files: string[] = response.data.files;
      const items = files.map((path: string) => {
        const fileName = path.split('/').pop() || path;
        const name = fileName.replace(/\.[^/.]+$/, '');
        const url = '/' + path.replace(/^public\//, '');
        return { name, path, url };
      });
      localStorage.setItem(AUDIO_ITEMS_STORAGE_KEY, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.error('自动刷新音频缓存失败:', err);
  }
  return null;
};

const INLINE_ATTR_RE = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
const QUOTE_OPEN_TAG_RE = /\[quote(?:=[^\]]*|\s[^\]]*)?\]/;
const QUOTE_OPEN_TAG_GLOBAL_RE = /\[quote(?:=[^\]]*|\s[^\]]*)?\]/g;

const parseInlineAttrs = (input: string): Record<string, string> => {
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

const parseQuoteStartTag = (
  source: string,
  defaultMaxLimit: number
): { fullTag: string; author: string; maxLimit: number; itemId: string; customStyle: React.CSSProperties } | null => {
  const startTagMatch = source.match(/^\[quote(?:=[^\]]*|\s[^\]]*)?\]/);
  if (!startTagMatch) return null;

  const fullTag = startTagMatch[0];
  let tail = fullTag.slice('[quote'.length, -1).trim();
  let positionalAuthor = '';

  // 兼容旧语法：[quote=Alice ...]
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

  // 解析样式属性
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

  return { fullTag, author, maxLimit, itemId, customStyle };
};

const DEFAULT_MEDIA_DURATION = 2.5;

interface ParsedMediaItem {
  url: string;
  duration: number;
}

const parseMediaSequence = (source: string, defaultDuration: number = DEFAULT_MEDIA_DURATION): ParsedMediaItem[] =>
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

const resolvePlaybackIndex = (items: ParsedMediaItem[], playbackSeconds: number): number => {
  if (items.length <= 1) return 0;
  const totalDuration = items.reduce((sum, item) => sum + Math.max(item.duration, 0.1), 0);
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;

  let cursor = ((playbackSeconds % totalDuration) + totalDuration) % totalDuration;
  for (let i = 0; i < items.length; i += 1) {
    const itemDuration = Math.max(items[i].duration, 0.1);
    if (cursor < itemDuration) return i;
    cursor -= itemDuration;
  }
  return 0;
};

const buildMediaStyles = (attrStr: string) => {
  const mediaStyle: React.CSSProperties = {
    maxWidth: '100%',
    borderRadius: '4px',
    border: '1px solid var(--image-border)',
    display: 'block',
    margin: '0 auto',
    height: 'auto',
    objectFit: 'contain',
  };

  let maxHeight: string | number = '500px';

  const widthMatch = attrStr.match(/\b(w|width)=([^ \]]+)/);
  if (widthMatch) {
    const val = widthMatch[2];
    mediaStyle.width = isNaN(Number(val)) ? val : `${val}px`;
    mediaStyle.maxWidth = '100%';

    if (val.includes('%')) {
      mediaStyle.display = 'inline-block';
      mediaStyle.margin = '0';
      maxHeight = 'none';
    }
  }

  const heightMatch = attrStr.match(/\b(h|height)=([^ \]]+)/);
  if (heightMatch) {
    const val = heightMatch[2];
    mediaStyle.height = isNaN(Number(val)) ? val : `${val}px`;
    maxHeight = 'none';
  }

  mediaStyle.maxHeight = maxHeight;

  const scaleMatch = attrStr.match(/\b(s|scale)=([^ \]]+)/);
  if (scaleMatch) {
    const scale = parseFloat(scaleMatch[2]);
    if (!isNaN(scale)) {
      mediaStyle.width = `${scale * 100}%`;
    }
  }

  const modeMatch = attrStr.match(/\bmode=([^ \]]+)/);
  if (modeMatch) {
    mediaStyle.objectFit = modeMatch[1] as any;
  }

  const wrapperStyle: React.CSSProperties = {
    margin: mediaStyle.display === 'inline-block' ? '0' : '12px 0',
    textAlign: mediaStyle.display === 'inline-block' ? 'left' : 'center',
    display: mediaStyle.display === 'inline-block' ? 'inline-block' : 'block',
    width: mediaStyle.display === 'inline-block' ? mediaStyle.width : 'auto',
    verticalAlign: 'top',
    position: 'relative',
  };

  return { mediaStyle, wrapperStyle };
};

const MediaContent: React.FC<{
  mediaItems: ParsedMediaItem[];
  attrStr: string;
  showControls: boolean;
}> = ({ mediaItems, attrStr, showControls }) => {
  const { playbackFrame, fps } = usePlaybackContext();
  const [manualIndex, setManualIndex] = useState(0);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    setManualIndex(0);
    // 预加载所有图片
    mediaItems.forEach((item) => {
      const img = new Image();
      img.src = item.url;
      img.onload = () => {
        setLoadedUrls((prev) => new Set(prev).add(item.url));
      };
    });
  }, [mediaItems.map((item) => `${item.url}|${item.duration}`).join(',')]);

  const playbackSeconds = playbackFrame != null && fps ? playbackFrame / fps : 0;
  const autoIndex = useMemo(
    () => resolvePlaybackIndex(mediaItems, playbackSeconds),
    [mediaItems, playbackSeconds]
  );
  const currentIndex = mediaItems.length <= 1 ? 0 : (showControls ? manualIndex : autoIndex);
  const currentItem = mediaItems[currentIndex] || mediaItems[0];
  const { mediaStyle, wrapperStyle } = buildMediaStyles(attrStr);
  const navButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.2s',
    zIndex: 3,
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    backdropFilter: 'blur(6px)',
  };

  if (!currentItem) return null;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualIndex((prev) => (prev + 1) % mediaItems.length);
  };

  return (
    <div key={currentItem.url} style={wrapperStyle}>
      {/* 预渲染所有已加载的图片，但只显示当前的，以利用浏览器缓存和减少闪烁 */}
      <div style={{ position: 'relative', width: '100%', ...mediaStyle }}>
        {mediaItems.map((item, index) => (
          <img
            key={item.url}
            src={item.url}
            style={{
              ...mediaStyle,
              width: '100%',
              display: index === currentIndex ? 'block' : 'none',
              // 如果是当前图片但还没加载完，可以加个占位或者保持透明
              visibility: index === currentIndex && !loadedUrls.has(item.url) ? 'hidden' : 'visible'
            }}
            alt="Content"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>

      {showControls && mediaItems.length > 1 && (
        <>
          <div
            onClick={goPrev}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              ...navButtonStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.88)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.72)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <LeftOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
          <div
            onClick={goNext}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              ...navButtonStyle,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.88)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.72)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <RightOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
          <div
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
              zIndex: 2,
            }}
          >
            {currentIndex + 1} / {mediaItems.length}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * 递归解析嵌套的 [quote] 和 [image] 标签
 *
 * @param text 待解析文本
 * @param parentMaxLimit 父级 quote 设定的最大文本长度限制，-1 表示不限制
 */
export const parseQuotes = (
  text: string,
  parentMaxLimit: number = -1,
  currentDepth: number = 0,
  maxQuoteDepth: number = 4,
  authorPath: string[] = [],
  hideAudio: boolean = false,
  showMediaControls: boolean = true,
  defaultMaxLimit: number = 150,
  defaultQuoteFontSize: number = 12,
  defaultBackgroundColor?: string,
  defaultBorderColor?: string,
): React.ReactNode => {
  if (!text) return null;

  // 规范化特殊字符，解决 UI 和视频渲染不一致的问题
  // 将智能引号、特殊省略号等统一转换为标准 ASCII 字符
  const normalizedText = text
    .replace(/[‘’]/g, "'") // 统一单引号
    .replace(/[“”]/g, '"') // 统一双引号
    .replace(/…/g, '...'); // 统一省略号

  const nodes: React.ReactNode[] = [];
  let currentPos = 0;
  let currentLevelChars = 0; // 当前层级已经积累的纯文本字符数

  // 只有当 parentMaxLimit > 0 时才启用截断逻辑
  const hasLimit = parentMaxLimit > 0;
  let limitReached = false;

  // 如果已经超过最大嵌套层级，直接返回一个提示或空（根据需求隐藏）
  if (currentDepth >= maxQuoteDepth) {
    // 完整路径：已经经过的作者路径 + 当前文本中剩余的所有 [quote] 作者
    const fullChain = [...authorPath];

    // 使用正则提取剩余文本中的所有 quote 开标签，并解析 author（属性顺序无关）
    const quoteRegex = new RegExp(QUOTE_OPEN_TAG_GLOBAL_RE);
    let match;
    while ((match = quoteRegex.exec(normalizedText)) !== null) {
      const parsed = parseQuoteStartTag(match[0], defaultMaxLimit);
      if (parsed?.author) {
        fullChain.push(parsed.author);
      }
    }

    if (fullChain.length > 0) {
      const authorChain = fullChain.map((a) => `u/${a}:...`).join('->');
      return (
        <Text type="secondary" italic style={{ fontSize: '11px' }}>
          {authorChain} (已达到最大嵌套层级)
        </Text>
      );
    }

    return <Text type="secondary" italic style={{ fontSize: '11px' }}>... (已达到最大嵌套层级)</Text>;
  }

  while (currentPos < normalizedText.length) {
    // 寻找最近的标签 [quote=... , [image , 或 [style
    const nextQuoteMatch = normalizedText.substring(currentPos).match(QUOTE_OPEN_TAG_RE);
    const nextQuote =
      nextQuoteMatch && nextQuoteMatch.index != null ? currentPos + nextQuoteMatch.index : -1;
    const nextImageMatch = normalizedText.substring(currentPos).match(/\[image[^\]]*\]/);
    const nextImage = nextImageMatch ? normalizedText.indexOf(nextImageMatch[0], currentPos) : -1;
    const nextStyle = normalizedText.indexOf('[style', currentPos);
    const nextGalleryMatch = normalizedText.substring(currentPos).match(/\[gallery[^\]]*\]/);
    const nextGallery = nextGalleryMatch ? normalizedText.indexOf(nextGalleryMatch[0], currentPos) : -1;
    const nextAudioMatch = normalizedText.substring(currentPos).match(/\[audio[^\]]*\]/);
    const nextAudio = nextAudioMatch ? normalizedText.indexOf(nextAudioMatch[0], currentPos) : -1;
    const nextRowMatch = normalizedText.substring(currentPos).match(/\[row[^\]]*\]/);
    const nextRow = nextRowMatch ? normalizedText.indexOf(nextRowMatch[0], currentPos) : -1;

    // 确定哪个标签更近
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
      // 1. 处理剩余普通文本
      const remainingText = normalizedText.substring(currentPos);
      if (hasLimit && !limitReached) {
        if (currentLevelChars + remainingText.length > parentMaxLimit) {
          nodes.push(remainingText.substring(0, parentMaxLimit - currentLevelChars) + '... (内容已省略)');
          limitReached = true;
        } else {
          nodes.push(remainingText);
          currentLevelChars += remainingText.length;
        }
      } else if (!limitReached) {
        nodes.push(remainingText);
      }
      break;
    }

    // 2. 处理标签之前的普通文本
    if (foundIdx > currentPos) {
      const prefixText = normalizedText.substring(currentPos, foundIdx);
      if (hasLimit && !limitReached) {
        if (currentLevelChars + prefixText.length > parentMaxLimit) {
          nodes.push(prefixText.substring(0, parentMaxLimit - currentLevelChars) + '... (内容已省略)');
          limitReached = true;
        } else {
          nodes.push(prefixText);
          currentLevelChars += prefixText.length;
        }
      } else if (!limitReached) {
        nodes.push(prefixText);
      }
    }

    if (type === 'quote') {
      const parsedStartTag = parseQuoteStartTag(normalizedText.substring(foundIdx), defaultMaxLimit);
      if (!parsedStartTag) {
        nodes.push('[quote=');
        currentPos = foundIdx + 7;
        continue;
      }

      const author = parsedStartTag.author;
      const maxAttr = parsedStartTag.maxLimit;
      const quotedItemId = parsedStartTag.itemId;
      const customStyle = parsedStartTag.customStyle;
      const startTagEnd = foundIdx + parsedStartTag.fullTag.length;

      let depth = 1;
      let searchPos = startTagEnd;
      let endTagIdx = -1;

      while (depth > 0 && searchPos < normalizedText.length) {
        const nextStartMatch = normalizedText.substring(searchPos).match(QUOTE_OPEN_TAG_RE);
        const nextStart = nextStartMatch && nextStartMatch.index != null ? searchPos + nextStartMatch.index : -1;
        const nextEnd = normalizedText.indexOf('[/quote]', searchPos);
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
        const innerText = normalizedText.substring(startTagEnd, endTagIdx);
        
        // 确定最终背景色和边框颜色（支持继承）
        const resolvedBg = customStyle.backgroundColor || defaultBackgroundColor || 'var(--quote-bg)';
        const resolvedBorderColor = (customStyle.borderColor as string) || defaultBorderColor || 'var(--quote-border)';

        nodes.push(
          <div
            key={foundIdx}
            data-quote-id={quotedItemId || undefined}
            style={{
              padding: '8px 12px',
              margin: '4px 0',
              borderRadius: '4px',
              fontSize: `${defaultQuoteFontSize}px`,
              ...customStyle,
              // 显式覆盖，确保使用计算后的颜色（处理继承逻辑）
              border: `1px solid ${resolvedBorderColor}`,
              backgroundColor: resolvedBg,
              borderColor: resolvedBorderColor,
            }}
          >
            <div style={{ color: 'inherit' }}>
              {parseQuotes(
                innerText,
                maxAttr,
                currentDepth + 1,
                maxQuoteDepth,
                [...authorPath, author],
                hideAudio,
                showMediaControls,
                defaultMaxLimit,
                defaultQuoteFontSize,
                resolvedBg,
                resolvedBorderColor
              )}
            </div>
          </div>
        );
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(parsedStartTag.fullTag);
        currentPos = startTagEnd;
      }
    } else if (type === 'image') {
      const imgStartMatch = normalizedText.substring(foundIdx).match(/^\[image([^\]]*)\]/);
      if (!imgStartMatch) {
        nodes.push('[image]');
        currentPos = foundIdx + 7;
        continue;
      }
      const attrStr = imgStartMatch[1];
      const startTagEnd = foundIdx + imgStartMatch[0].length;
      const endTagIdx = normalizedText.indexOf('[/image]', startTagEnd);
      if (endTagIdx !== -1) {
        const contentStr = normalizedText.substring(startTagEnd, endTagIdx);
        const mediaItems = parseMediaSequence(contentStr);
        if (mediaItems.length > 0) {
          nodes.push(<MediaContent key={foundIdx} mediaItems={mediaItems} attrStr={attrStr} showControls={showMediaControls} />);
        }
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(imgStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'style') {
      const styleStartMatch = normalizedText.substring(foundIdx).match(/^\[style([^\]]*)\]/);
      if (!styleStartMatch) {
        nodes.push('[style]');
        currentPos = foundIdx + 7;
        continue;
      }
      const attrStr = styleStartMatch[1];
      const startTagEnd = foundIdx + styleStartMatch[0].length;
      
      // 深度优先匹配闭合标签，支持嵌套 [style]
      let depth = 1;
      let searchPos = startTagEnd;
      let endTagIdx = -1;
      while (depth > 0 && searchPos < normalizedText.length) {
        const nextStart = normalizedText.indexOf('[style', searchPos);
        const nextEnd = normalizedText.indexOf('[/style]', searchPos);
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
        const innerText = normalizedText.substring(startTagEnd, endTagIdx);
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
        nodes.push(<span key={foundIdx} style={style}>{parseQuotes(innerText, parentMaxLimit, currentDepth, maxQuoteDepth, authorPath, hideAudio, showMediaControls, defaultMaxLimit, defaultQuoteFontSize, defaultBackgroundColor, defaultBorderColor)}</span>);
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(styleStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'gallery') {
      const galleryStartTagMatch = normalizedText.substring(foundIdx).match(/\[gallery([^\]]*)\]/);
      if (galleryStartTagMatch) {
        const startTagFull = galleryStartTagMatch[0];
        const attrStr = galleryStartTagMatch[1];
        const startTagEnd = foundIdx + startTagFull.length;
        const endTagIdx = normalizedText.indexOf('[/gallery]', startTagEnd);
        if (endTagIdx !== -1) {
          const contentStr = normalizedText.substring(startTagEnd, endTagIdx);
          let defaultDuration = 2.5;
          const durationMatch = attrStr.match(/duration=([\d.]+)/);
          if (durationMatch) defaultDuration = parseFloat(durationMatch[1]);
          const mediaItems = parseMediaSequence(contentStr, defaultDuration);
          if (mediaItems.length > 0) {
            nodes.push(<MediaContent key={foundIdx} mediaItems={mediaItems} attrStr="" showControls={showMediaControls} />);
          }
          currentPos = endTagIdx + 10;
        } else {
          nodes.push(startTagFull);
          currentPos = startTagEnd;
        }
      } else {
        nodes.push('[gallery]');
        currentPos = foundIdx + 9;
      }
    } else if (type === 'audio') {
      const audioMatch = normalizedText.substring(foundIdx).match(/^\[audio([^\]]*)\]/);
      if (audioMatch) {
        const fullTag = audioMatch[0];
        const attrStr = audioMatch[1];
        const attrs = parseInlineAttrs(attrStr);
        const src = attrs.src || '';
        const volume = parseFloat(attrs.volume || '1.0');
        const start = parseFloat(attrs.start || '0');
        if (hideAudio) {
          currentPos = foundIdx + fullTag.length;
          continue;
        }
        nodes.push(
          <Tooltip key={foundIdx} title={`音频: ${src} (Vol: ${volume}, Start: ${start}s)`}>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(24, 144, 255, 0.1)', border: '1px solid #1890ff', borderRadius: '4px', padding: '0 4px', margin: '0 2px', cursor: 'pointer', color: '#1890ff', fontSize: '12px' }}
              onClick={(e) => {
                e.stopPropagation();
                const audioUrl = `/audio/shortAudio/Unassigned/${src}`;
                const audio = new Audio(audioUrl);
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().catch(() => {
                  new Audio(`/audio/${src}`).play().catch(() => {
                    toast.error(`音频文件不存在: ${src}`);
                    refreshAudioCache();
                  });
                });
              }}
            >
              <SoundOutlined style={{ marginRight: 4 }} />
              {src}
            </span>
          </Tooltip>
        );
        currentPos = foundIdx + fullTag.length;
      } else {
        nodes.push('[audio]');
        currentPos = foundIdx + 7;
      }
    } else if (type === 'row') {
      const rowStartMatch = normalizedText.substring(foundIdx).match(/^\[row([^\]]*)\]/);
      if (rowStartMatch) {
        const fullTag = rowStartMatch[0];
        const attrStr = rowStartMatch[1];
        const startTagEnd = foundIdx + fullTag.length;
        
        // 深度优先匹配闭合标签，支持嵌套 [row]
        let depth = 1;
        let searchPos = startTagEnd;
        let endTagIdx = -1;
        while (depth > 0 && searchPos < normalizedText.length) {
          const nextStart = normalizedText.indexOf('[row', searchPos);
          const nextEnd = normalizedText.indexOf('[/row]', searchPos);
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
          const innerText = normalizedText.substring(startTagEnd, endTagIdx);
          const attrs = parseInlineAttrs(attrStr);
          const rowStyle: React.CSSProperties = {
            display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: attrs.gap ? (isNaN(Number(attrs.gap)) ? attrs.gap : `${attrs.gap}px`) : '8px', alignItems: (attrs.align || 'center') as any, justifyContent: (attrs.justify || 'start') === 'between' ? 'space-between' : (attrs.justify || 'start') === 'around' ? 'space-around' : (attrs.justify || 'start') as any, margin: '12px 0', width: '100%'
          };
          nodes.push(<div key={foundIdx} style={rowStyle} className="script-row">{parseQuotes(innerText, parentMaxLimit, currentDepth, maxQuoteDepth, authorPath, hideAudio, showMediaControls, defaultMaxLimit, defaultQuoteFontSize, defaultBackgroundColor, defaultBorderColor)}</div>);
          currentPos = endTagIdx + 6;
        } else {
          nodes.push(fullTag);
          currentPos = startTagEnd;
        }
      } else {
        nodes.push('[row]');
        currentPos = foundIdx + 5;
      }
    }
  }

  return nodes.length > 0 ? nodes : normalizedText;
};

