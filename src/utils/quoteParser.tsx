import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

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
    // 寻找最近的标签 [quote=... 或 [image
    const nextQuote = text.indexOf('[quote=', currentPos);
    const nextImageMatch = text.substring(currentPos).match(/\[image[^\]]*\]/);
    const nextImage = nextImageMatch ? text.indexOf(nextImageMatch[0], currentPos) : -1;

    // 确定哪个标签更近
    let foundIdx = -1;
    let type: 'quote' | 'image' | 'none' = 'none';

    if (nextQuote !== -1 && (nextImage === -1 || nextQuote < nextImage)) {
      foundIdx = nextQuote;
      type = 'quote';
    } else if (nextImage !== -1) {
      foundIdx = nextImage;
      type = 'image';
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
            <div style={isVideo ? { fontSize: '18px', color: '#1890ff', fontWeight: 'bold', marginBottom: '8px' } : { marginBottom: 4 }}>
              <Text strong style={isVideo ? { color: '#1890ff' } : { color: '#1890ff', fontSize: '11px' }}>u/{author}{isVideo ? ' 说道:' : ':'}</Text>
            </div>
            <div style={isVideo ? { color: '#374151' } : { color: '#595959', fontStyle: 'italic' }}>
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
    }
  }

  return nodes.length > 0 ? nodes : text;
};
