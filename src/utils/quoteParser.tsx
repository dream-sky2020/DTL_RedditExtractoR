import React, { useState, useEffect, useRef } from 'react';
import { Typography, Button, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, SoundOutlined } from '@ant-design/icons';
import { toast } from '../components/Toast';
import axios from 'axios';

const { Text } = Typography;

const AUDIO_ITEMS_STORAGE_KEY = 'reddit-extractor.audio-items.v1';

// 辅助函数：触发音频列表刷新并更新缓存
const refreshAudioCache = async () => {
  try {
    const response = await axios.get('http://localhost:5000/list_audio');
    if (response.data.success) {
      const files: string[] = response.data.files;
      const items = files.map((path: string) => {
        const fileName = path.split('/').pop() || path;
        const name = fileName.replace(/\.[^/.]+$/, "");
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
): { fullTag: string; author: string; maxLimit: number; itemId: string } | null => {
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

  return { fullTag, author, maxLimit, itemId };
};

/**
 * 内部组件：图集轮播
 */
const Gallery: React.FC<{ 
  urls: string[];
}> = ({ urls }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  return (
    <div 
      className="gallery-group"
      style={{ 
        position: 'relative', 
        marginTop: 10, 
        width: '100%', 
        height: 240, 
        borderRadius: 8, 
        overflow: 'hidden', 
        backgroundColor: 'var(--gallery-bg)', 
        border: '1px solid var(--gallery-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <img 
        src={urls[currentIndex]} 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
        alt={`Gallery ${currentIndex}`} 
        referrerPolicy="no-referrer" 
      />
      
      {/* 左右导航按钮 */}
      {urls.length > 1 && (
        <>
          <div 
            onClick={prev}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              backgroundColor: 'var(--gallery-nav-bg)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              zIndex: 2
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gallery-nav-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--gallery-nav-bg)'}
          >
            <LeftOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
          <div 
            onClick={next}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              backgroundColor: 'var(--gallery-nav-bg)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              zIndex: 2
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gallery-nav-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--gallery-nav-bg)'}
          >
            <RightOutlined style={{ color: 'white', fontSize: 16 }} />
          </div>
        </>
      )}

      {/* 底部指示圆点 (胶囊容器) */}
      {urls.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          zIndex: 2,
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: '4px 8px',
          borderRadius: '12px',
          backdropFilter: 'blur(4px)' // 加上磨砂玻璃效果，更有质感
        }}>
          {urls.map((_, idx) => (
            <div 
              key={idx}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: currentIndex === idx ? 'white' : 'var(--gallery-dot-bg)',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>
      )}

      {/* 右下角页码 */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11, zIndex: 2 }}>
        {currentIndex + 1} / {urls.length}
      </div>
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
  hideAudio: boolean = false
): React.ReactNode => {
  if (!text) return null;

  // 规范化特殊字符，解决 UI 和视频渲染不一致的问题
  // 将智能引号、特殊省略号等统一转换为标准 ASCII 字符
  const normalizedText = text
    .replace(/[‘’]/g, "'")  // 统一单引号
    .replace(/[“”]/g, '"')  // 统一双引号
    .replace(/…/g, '...'); // 统一省略号

  const nodes: React.ReactNode[] = [];
  let currentPos = 0;
  let currentLevelChars = 0; // 当前层级已经积累的纯文本字符数
  const DEFAULT_MAX_LIMIT = 150;
  
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
      const parsed = parseQuoteStartTag(match[0], DEFAULT_MAX_LIMIT);
      if (parsed?.author) {
        fullChain.push(parsed.author);
      }
    }
    
    if (fullChain.length > 0) {
      const authorChain = fullChain.map(a => `u/${a}:...`).join('->');
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
      // 3. 处理 [quote ...]，支持属性无序 + 两种 author 写法：
      // - [quote=Alice id=odu5u6a max=120]
      // - [quote author=Alice max=120 id=odu5u6a]
      const parsedStartTag = parseQuoteStartTag(normalizedText.substring(foundIdx), DEFAULT_MAX_LIMIT);
      if (!parsedStartTag) {
        // 匹配失败，跳过 [quote=
        nodes.push('[quote=');
        currentPos = foundIdx + 7;
        continue;
      }
      
      const author = parsedStartTag.author;
      const maxAttr = parsedStartTag.maxLimit;
      const quotedItemId = parsedStartTag.itemId;
      const startTagEnd = foundIdx + parsedStartTag.fullTag.length;
      
      // 寻找匹配的 [/quote]，需要考虑嵌套深度
      let depth = 1;
      let searchPos = startTagEnd;
      let endTagIdx = -1;
      
      while (depth > 0 && searchPos < normalizedText.length) {
        const nextStartMatch = normalizedText.substring(searchPos).match(QUOTE_OPEN_TAG_RE);
        const nextStart =
          nextStartMatch && nextStartMatch.index != null ? searchPos + nextStartMatch.index : -1;
        const nextEnd = normalizedText.indexOf('[/quote]', searchPos);
        
        if (nextEnd === -1) break; 
        
        if (nextStart !== -1 && nextStart < nextEnd) {
          depth++;
          searchPos = nextStart + 7;
        } else {
          depth--;
          if (depth === 0) {
            endTagIdx = nextEnd;
          } else {
            searchPos = nextEnd + 8;
          }
        }
      }
      
      if (endTagIdx !== -1) {
        const innerText = normalizedText.substring(startTagEnd, endTagIdx);
        // 渲染 quote 容器。注意：即便父级已经 limitReached，我们也应该渲染嵌套的 quote，
        // 除非逻辑要求父级截断后直接丢弃所有后续节点。但根据您的需求“不影响内部 quote”，
        // 这里我们选择始终渲染嵌套的 quote。
        nodes.push(
          <div 
            key={foundIdx}
            data-quote-id={quotedItemId || undefined}
            style={{
              border: '1px solid var(--quote-border)',
              backgroundColor: 'var(--quote-bg)',
              padding: '8px 12px',
              margin: '4px 0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <div style={{ color: 'inherit' }}>
              {/* 递归调用：每个 quote 独立计算自己的限制，且不会破坏标签结构 */}
              {parseQuotes(innerText, maxAttr, currentDepth + 1, maxQuoteDepth, [...authorPath, author], hideAudio)}
            </div>
          </div>
        );
        currentPos = endTagIdx + 8;
      } else {
        // 未闭合标签
        nodes.push(parsedStartTag.fullTag);
        currentPos = startTagEnd;
      }
    } else if (type === 'image') {
      // 4. 处理 [image w=300 h=200 mode=contain]URL[/image]
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
        const url = normalizedText.substring(startTagEnd, endTagIdx);
        
        // 解析图像属性
        const imgStyle: React.CSSProperties = { 
          maxWidth: '100%', 
          borderRadius: '4px', 
          border: '1px solid var(--image-border)',
          display: 'block',
          margin: '0 auto',
          height: 'auto', // 强制高度自动，保持比例
          objectFit: 'contain' // 默认包含模式，不裁剪
        };

        // 默认最大高度限制（仅针对非并列模式）
        let maxHeight: string | number = '500px';

        // 宽度: w=300 或 width=50%
        const widthMatch = attrStr.match(/\b(w|width)=([^ \]]+)/);
        if (widthMatch) {
          const val = widthMatch[2];
          imgStyle.width = isNaN(Number(val)) ? val : `${val}px`;
          imgStyle.maxWidth = '100%'; 
          
          if (val.includes('%')) {
            imgStyle.display = 'inline-block';
            imgStyle.margin = '0';
            maxHeight = 'none'; // 并列模式下取消高度限制，由宽度决定比例
          }
        }

        // 高度: h=200 或 height=150px
        const heightMatch = attrStr.match(/\b(h|height)=([^ \]]+)/);
        if (heightMatch) {
          const val = heightMatch[2];
          imgStyle.height = isNaN(Number(val)) ? val : `${val}px`;
          maxHeight = 'none';
        }

        imgStyle.maxHeight = maxHeight;

        // 缩放: s=0.5 或 scale=0.8
        const scaleMatch = attrStr.match(/\b(s|scale)=([^ \]]+)/);
        if (scaleMatch) {
          const scale = parseFloat(scaleMatch[2]);
          if (!isNaN(scale)) {
            imgStyle.width = `${scale * 100}%`;
          }
        }

        // 模式: mode=cover/contain/fill
        const modeMatch = attrStr.match(/\bmode=([^ \]]+)/);
        if (modeMatch) {
          imgStyle.objectFit = modeMatch[1] as any;
        }

        nodes.push(
          <div 
            key={foundIdx} 
            style={{ 
              margin: imgStyle.display === 'inline-block' ? '0' : '12px 0', 
              textAlign: imgStyle.display === 'inline-block' ? 'left' : 'center',
              display: imgStyle.display === 'inline-block' ? 'inline-block' : 'block',
              width: imgStyle.display === 'inline-block' ? imgStyle.width : 'auto',
              verticalAlign: 'top'
            }}
          >
            <img 
              src={url} 
              style={{...imgStyle, width: '100%'}} 
              alt="Content" 
              referrerPolicy="no-referrer"
            />
          </div>
        );
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(imgStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'style') {
      // 5. 处理 [style color=#FF0000 size=24 b i u]内容[/style]
      const styleStartMatch = normalizedText.substring(foundIdx).match(/^\[style([^\]]*)\]/);
      if (!styleStartMatch) {
        nodes.push('[style]');
        currentPos = foundIdx + 7;
        continue;
      }

      const attrStr = styleStartMatch[1];
      const startTagEnd = foundIdx + styleStartMatch[0].length;
      
      // 寻找匹配的 [/style]
      const endTagIdx = normalizedText.indexOf('[/style]', startTagEnd);
      
      if (endTagIdx !== -1) {
        const innerText = normalizedText.substring(startTagEnd, endTagIdx);
        
        // 解析属性
        const style: React.CSSProperties = {};
        
        // 颜色: color=#FF0000 或 color=red
        const colorMatch = attrStr.match(/color=([^ \]]+)/);
        if (colorMatch) style.color = colorMatch[1];
        
        // 大小: size=24
        const sizeMatch = attrStr.match(/size=(\d+)/);
        if (sizeMatch) {
            style.fontSize = parseInt(sizeMatch[1]);
        }
        
        // 对齐方式: align=center|left|right
        const alignMatch = attrStr.match(/align=([^ \]]+)/);
        if (alignMatch) {
          style.textAlign = alignMatch[1] as any;
          style.display = 'block';
          style.width = '100%';
        }
        
        // 加粗: b
        if (attrStr.match(/\bb\b/)) style.fontWeight = 'bold';
        
        // 斜体: i
        if (attrStr.match(/\bi\b/)) style.fontStyle = 'italic';
        
        // 下划线: u
        if (attrStr.match(/\bu\b/)) style.textDecoration = 'underline';

        nodes.push(
          <span key={foundIdx} style={style}>
            {parseQuotes(innerText, parentMaxLimit, currentDepth, maxQuoteDepth, authorPath, hideAudio)}
          </span>
        );
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(styleStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'gallery') {
      // 6. 处理 [gallery]URL1,URL2[/gallery] 或 [gallery duration=3]URL1|2,URL2[/gallery]
      const galleryStartTagMatch = normalizedText.substring(foundIdx).match(/\[gallery([^\]]*)\]/);
      if (galleryStartTagMatch) {
        const startTagFull = galleryStartTagMatch[0];
        const attrStr = galleryStartTagMatch[1];
        const startTagEnd = foundIdx + startTagFull.length;
        const endTagIdx = normalizedText.indexOf('[/gallery]', startTagEnd);

        if (endTagIdx !== -1) {
          const contentStr = normalizedText.substring(startTagEnd, endTagIdx);
          
          // 解析全局时长属性
          let defaultDuration = 2.5;
          const durationMatch = attrStr.match(/duration=([\d.]+)/);
          if (durationMatch) {
            defaultDuration = parseFloat(durationMatch[1]);
          }

          const rawItems = contentStr.split(',').map(u => u.trim()).filter(u => u !== '');
          const urls: string[] = [];
          const durations: number[] = [];

          rawItems.forEach(item => {
            if (item.includes('|')) {
              const [url, dur] = item.split('|');
              urls.push(url.trim());
              durations.push(parseFloat(dur) || defaultDuration);
            } else {
              urls.push(item);
              durations.push(defaultDuration);
            }
          });

          if (urls.length > 0) {
            nodes.push(
              <Gallery key={foundIdx} urls={urls} />
            );
          }
          currentPos = endTagIdx + 10;
        } else {
          nodes.push(startTagFull);
          currentPos = startTagEnd;
        }
      } else {
        // 理论上不会走到这里，因为 Grep 已经匹配到了 [gallery]
        nodes.push('[gallery]');
        currentPos = foundIdx + 9;
      }
    } else if (type === 'audio') {
      // 7. 处理 [audio src="filename.mp3" start="0" volume="1.0"]
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
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                backgroundColor: 'rgba(24, 144, 255, 0.1)', 
                border: '1px solid #1890ff',
                borderRadius: '4px',
                padding: '0 4px',
                margin: '0 2px',
                cursor: 'pointer',
                color: '#1890ff',
                fontSize: '12px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                const audioUrl = `/audio/shortAudio/Unassigned/${src}`;
                const audio = new Audio(audioUrl);
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().catch(err => {
                  console.error('预览播放失败:', err);
                  // 尝试备用路径
                  new Audio(`/audio/${src}`).play().catch(() => {
                    toast.error(`音频文件不存在: ${src}`, {
                      description: '正在尝试自动刷新音频缓存，请稍后重试。',
                      duration: 5
                    });
                    // 触发后台刷新
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
      // 8. 处理 [row gap=10 align=center justify=between]内容[/row]
      const rowStartMatch = normalizedText.substring(foundIdx).match(/^\[row([^\]]*)\]/);
      if (rowStartMatch) {
        const fullTag = rowStartMatch[0];
        const attrStr = rowStartMatch[1];
        const startTagEnd = foundIdx + fullTag.length;
        const endTagIdx = normalizedText.indexOf('[/row]', startTagEnd);

        if (endTagIdx !== -1) {
          const innerText = normalizedText.substring(startTagEnd, endTagIdx);
          const attrs = parseInlineAttrs(attrStr);
          
          const rowStyle: React.CSSProperties = {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: attrs.gap ? (isNaN(Number(attrs.gap)) ? attrs.gap : `${attrs.gap}px`) : '8px',
            alignItems: (attrs.align || 'center') as any,
            justifyContent: (attrs.justify || 'start') === 'between' ? 'space-between' : 
                            (attrs.justify || 'start') === 'around' ? 'space-around' : 
                            (attrs.justify || 'start') as any,
            margin: '12px 0',
            width: '100%'
          };

          nodes.push(
            <div key={foundIdx} style={rowStyle} className="script-row">
              {parseQuotes(innerText, parentMaxLimit, currentDepth, maxQuoteDepth, authorPath, hideAudio)}
            </div>
          );
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
