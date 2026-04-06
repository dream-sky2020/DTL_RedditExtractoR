import React, { useState } from 'react';
import { Typography, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Text } = Typography;

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
        backgroundColor: '#1a1a1a', 
        border: '1px solid #ddd',
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
  authorPath: string[] = []
): React.ReactNode => {
  if (!text) return null;

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
    
    // 使用正则提取剩余文本中的所有 [quote=作者]
    const quoteRegex = /\[quote=([^\] #]+)/g;
    let match;
    while ((match = quoteRegex.exec(text)) !== null) {
      fullChain.push(match[1]);
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

  while (currentPos < text.length) {
    // 寻找最近的标签 [quote=... , [image , 或 [style
    const nextQuote = text.indexOf('[quote=', currentPos);
    const nextImageMatch = text.substring(currentPos).match(/\[image[^\]]*\]/);
    const nextImage = nextImageMatch ? text.indexOf(nextImageMatch[0], currentPos) : -1;
    const nextStyle = text.indexOf('[style', currentPos);
    const nextGalleryMatch = text.substring(currentPos).match(/\[gallery[^\]]*\]/);
    const nextGallery = nextGalleryMatch ? text.indexOf(nextGalleryMatch[0], currentPos) : -1;

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
            style={{
              border: '1px solid #e8e8e8',
              backgroundColor: '#f9f9f9',
              padding: '8px 12px',
              margin: '4px 0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <div style={{ color: 'inherit' }}>
              {/* 递归调用：每个 quote 独立计算自己的限制，且不会破坏标签结构 */}
              {parseQuotes(innerText, maxAttr, currentDepth + 1, maxQuoteDepth, [...authorPath, author])}
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
      // 4. 处理 [image w=300 h=200 mode=contain]URL[/image]
      const imgStartMatch = text.substring(foundIdx).match(/^\[image([^\]]*)\]/);
      if (!imgStartMatch) {
        nodes.push('[image]');
        currentPos = foundIdx + 7;
        continue;
      }

      const attrStr = imgStartMatch[1];
      const startTagEnd = foundIdx + imgStartMatch[0].length;
      const endTagIdx = text.indexOf('[/image]', startTagEnd);
      
      if (endTagIdx !== -1) {
        const url = text.substring(startTagEnd, endTagIdx);
        
        // 解析图像属性
        const imgStyle: React.CSSProperties = { 
          maxWidth: '100%', 
          maxHeight: '500px', // 默认最大高度
          borderRadius: '4px', 
          border: '1px solid #eee',
          display: 'block',
          margin: '0 auto'
        };

        // 宽度: w=300 或 width=50%
        const widthMatch = attrStr.match(/\b(w|width)=([^ \]]+)/);
        if (widthMatch) {
          const val = widthMatch[2];
          imgStyle.width = isNaN(Number(val)) ? val : `${val}px`;
          // 如果指定了宽度，通常希望取消默认的 100% 限制以展示原始比例
          imgStyle.maxWidth = '100%'; 
        }

        // 高度: h=200 或 height=150px
        const heightMatch = attrStr.match(/\b(h|height)=([^ \]]+)/);
        if (heightMatch) {
          const val = heightMatch[2];
          imgStyle.height = isNaN(Number(val)) ? val : `${val}px`;
          imgStyle.maxHeight = 'none';
        }

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
          <div key={foundIdx} style={{ margin: '12px 0', textAlign: 'center' }}>
            <img 
              src={url} 
              style={imgStyle} 
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
            {parseQuotes(innerText, parentMaxLimit, currentDepth, maxQuoteDepth, authorPath)}
          </span>
        );
        currentPos = endTagIdx + 8;
      } else {
        nodes.push(styleStartMatch[0]);
        currentPos = startTagEnd;
      }
    } else if (type === 'gallery') {
      // 6. 处理 [gallery]URL1,URL2[/gallery] 或 [gallery duration=3]URL1|2,URL2[/gallery]
      const galleryStartTagMatch = text.substring(foundIdx).match(/\[gallery([^\]]*)\]/);
      if (galleryStartTagMatch) {
        const startTagFull = galleryStartTagMatch[0];
        const attrStr = galleryStartTagMatch[1];
        const startTagEnd = foundIdx + startTagFull.length;
        const endTagIdx = text.indexOf('[/gallery]', startTagEnd);

        if (endTagIdx !== -1) {
          const contentStr = text.substring(startTagEnd, endTagIdx);
          
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
    }
  }

  return nodes.length > 0 ? nodes : text;
};
