import React, { useState } from 'react';
import { Typography, Button } from 'antd';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 内部组件：图集轮播
 */
const Gallery: React.FC<{ urls: string[]; isVideo: boolean }> = ({ urls, isVideo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isVideo) {
    const next = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % urls.length);
    };
    const prev = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
    };

    return (
      <div style={{ 
        position: 'relative', 
        marginTop: 10, 
        width: '100%', 
        height: 240, 
        borderRadius: 8, 
        overflow: 'hidden', 
        backgroundColor: '#1a1a1a', 
        border: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        group: 'gallery' // 用于 CSS 选择器（虽然这里是 inline style）
      }}>
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
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                zIndex: 2
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
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
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                zIndex: 2
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
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
                  backgroundColor: currentIndex === idx ? 'white' : 'rgba(255,255,255,0.4)',
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
  }

  // 视频模式下的自动轮播
  try {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const secondsPerImage = 2.5; // 每张图显示 2.5 秒
    const framesPerImage = Math.floor(fps * secondsPerImage);
    const currentIndex = Math.floor(frame / framesPerImage) % urls.length;

    return (
      <div style={{ marginTop: 20, width: '100%', height: 400, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', border: '2px solid #eee' }}>
        <img 
          src={urls[currentIndex]} 
          key={urls[currentIndex]}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          alt="Gallery Video"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  } catch (e) {
    // 兜底方案
    return <img src={urls[0]} style={{ width: '100%', height: 'auto' }} alt="Gallery Fallback" />;
  }
};

/**
 * 递归解析嵌套的 [quote] 和 [image] 标签
 * 
 * @param text 待解析文本
 * @param isVideo 是否在视频中渲染
 * @param parentMaxLimit 父级 quote 设定的最大文本长度限制，-1 表示不限制
 */
export const parseQuotes = (text: string, isVideo: boolean = false, parentMaxLimit: number = -1): React.ReactNode => {
  if (!text) return null;

  const nodes: React.ReactNode[] = [];
  let currentPos = 0;
  let currentLevelChars = 0; // 当前层级已经积累的纯文本字符数
  const DEFAULT_MAX_LIMIT = 150;
  
  // 只有当 parentMaxLimit > 0 时才启用截断逻辑
  const hasLimit = parentMaxLimit > 0;
  let limitReached = false;

  while (currentPos < text.length) {
    // 寻找最近的标签 [quote=... , [image , 或 [style
    const nextQuote = text.indexOf('[quote=', currentPos);
    const nextImageMatch = text.substring(currentPos).match(/\[image[^\]]*\]/);
    const nextImage = nextImageMatch ? text.indexOf(nextImageMatch[0], currentPos) : -1;
    const nextStyle = text.indexOf('[style', currentPos);
    const nextGallery = text.indexOf('[gallery]', currentPos);

    // 确定哪个标签更近
    let foundIdx = -1;
    let type: 'quote' | 'image' | 'style' | 'gallery' | 'none' = 'none';

    const indices: { idx: number; type: 'quote' | 'image' | 'style' | 'gallery' }[] = [];
    if (nextQuote !== -1) indices.push({ idx: nextQuote, type: 'quote' });
    if (nextImage !== -1) indices.push({ idx: nextImage, type: 'image' });
    if (nextStyle !== -1) indices.push({ idx: nextStyle, type: 'style' });
    if (nextGallery !== -1) indices.push({ idx: nextGallery, type: 'gallery' });

    indices.sort((a, b) => a.idx - b.idx);

    if (indices.length > 0) {
      foundIdx = indices[0].idx;
      type = indices[0].type;
    }

    if (type === 'none') {
      // 1. 处理剩余普通文本
      const remainingText = text.substring(currentPos);
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
      const prefixText = text.substring(currentPos, foundIdx);
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
      // 3. 处理 [quote=作者 max=100 #备注]
      const authorMatch = text.substring(foundIdx).match(/^\[quote=([^\] #]+)(?:\s+max=(\d+))?([^\]]*)\]/);
      if (!authorMatch) {
        // 匹配失败，跳过 [quote=
        nodes.push('[quote=');
        currentPos = foundIdx + 7;
        continue;
      }
      
      const author = authorMatch[1];
      const maxAttr = authorMatch[2] ? parseInt(authorMatch[2]) : DEFAULT_MAX_LIMIT;
      const startTagEnd = foundIdx + authorMatch[0].length;
      
      // 寻找匹配的 [/quote]，需要考虑嵌套深度
      let depth = 1;
      let searchPos = startTagEnd;
      let endTagIdx = -1;
      
      while (depth > 0 && searchPos < text.length) {
        const nextStart = text.indexOf('[quote=', searchPos);
        const nextEnd = text.indexOf('[/quote]', searchPos);
        
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
        const innerText = text.substring(startTagEnd, endTagIdx);
        // 渲染 quote 容器。注意：即便父级已经 limitReached，我们也应该渲染嵌套的 quote，
        // 除非逻辑要求父级截断后直接丢弃所有后续节点。但根据您的需求“不影响内部 quote”，
        // 这里我们选择始终渲染嵌套的 quote。
        nodes.push(
          <div 
            key={foundIdx}
            style={isVideo ? {
              border: '2px solid #e5e7eb',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              padding: '20px',
              margin: '10px 0',
              borderRadius: '12px',
            } : {
              border: '1px solid #e8e8e8',
              backgroundColor: '#f9f9f9',
              padding: '8px 12px',
              margin: '4px 0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <div style={isVideo ? { color: '#374151' } : { color: 'inherit' }}>
              {/* 递归调用：每个 quote 独立计算自己的限制，且不会破坏标签结构 */}
              {parseQuotes(innerText, isVideo, maxAttr)}
            </div>
          </div>
        );
        currentPos = endTagIdx + 8;
      } else {
        // 未闭合标签
        nodes.push(authorMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'image') {
      // 4. 处理 [image #备注]URL[/image]
      const imgStartMatch = text.substring(foundIdx).match(/^\[image([^\]]*)\]/);
      if (!imgStartMatch) {
        nodes.push('[image]');
        currentPos = foundIdx + 7;
        continue;
      }

      const startTagEnd = foundIdx + imgStartMatch[0].length;
      const endTagIdx = text.indexOf('[/image]', startTagEnd);
      
      if (endTagIdx !== -1) {
        const url = text.substring(startTagEnd, endTagIdx);
        nodes.push(isVideo ? (
          <div key={foundIdx} style={{ marginTop: 20, width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
            <img 
              src={url} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              alt="Content" 
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div key={foundIdx} style={{ margin: '8px 0', textAlign: 'center' }}>
            <img 
              src={url} 
              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', border: '1px solid #eee' }} 
              alt="Content" 
              referrerPolicy="no-referrer"
            />
          </div>
        ));
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(imgStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'style') {
      // 5. 处理 [style color=#FF0000 size=24 b i u]内容[/style]
      const styleStartMatch = text.substring(foundIdx).match(/^\[style([^\]]*)\]/);
      if (!styleStartMatch) {
        nodes.push('[style]');
        currentPos = foundIdx + 7;
        continue;
      }

      const attrStr = styleStartMatch[1];
      const startTagEnd = foundIdx + styleStartMatch[0].length;
      
      // 寻找匹配的 [/style]
      const endTagIdx = text.indexOf('[/style]', startTagEnd);
      
      if (endTagIdx !== -1) {
        const innerText = text.substring(startTagEnd, endTagIdx);
        
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
        
        // 加粗: b
        if (attrStr.match(/\bb\b/)) style.fontWeight = 'bold';
        
        // 斜体: i
        if (attrStr.match(/\bi\b/)) style.fontStyle = 'italic';
        
        // 下划线: u
        if (attrStr.match(/\bu\b/)) style.textDecoration = 'underline';

        nodes.push(
          <span key={foundIdx} style={style}>
            {parseQuotes(innerText, isVideo, parentMaxLimit)}
          </span>
        );
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(styleStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'gallery') {
      // 6. 处理 [gallery]URL1,URL2[/gallery]
      const startTagEnd = foundIdx + 9; // "[gallery]".length
      const endTagIdx = text.indexOf('[/gallery]', startTagEnd);
      
      if (endTagIdx !== -1) {
        const urlsStr = text.substring(startTagEnd, endTagIdx);
        const urls = urlsStr.split(',').map(u => u.trim()).filter(u => u !== '');
        
        if (urls.length > 0) {
          nodes.push(
            <Gallery key={foundIdx} urls={urls} isVideo={isVideo} />
          );
        }
        currentPos = endTagIdx + 10;
      } else {
        nodes.push('[gallery]');
        currentPos = startTagEnd;
      }
    }
  }

  return nodes.length > 0 ? nodes : text;
};
