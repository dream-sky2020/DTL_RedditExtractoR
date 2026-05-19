import { getClosingTag, getAllTags, isSelfClosingOrLineBreak } from './utils';

/**
 * 内部切割逻辑 V2
 * 采用更安全的标记，并确保在每个切割点正确闭合和重开标签栈
 */
export function splitInternalContent(content: string, splitMarker: string): string[] {
  // 使用 split() 而不是正则来分割，彻底避免正则转义和残留问题
  const parts = content.split(splitMarker);
  if (parts.length <= 1) return [content];

  const segments: string[] = [];
  let currentStack: string[] = [];
  
  // 我们需要遍历整个内容来追踪标签栈，但要在 splitMarker 处断开
  // 重新实现：先获取所有标签
  const allTags = getAllTags(content);
  
  let lastPos = 0;
  let currentSegmentText = "";
  let tagIdx = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partEndPos = lastPos + part.length;
    
    // 处理当前 part 中的所有标签
    while (tagIdx < allTags.length && allTags[tagIdx].index < partEndPos) {
      const t = allTags[tagIdx];
      if (!isSelfClosingOrLineBreak(t.tag)) {
        if (t.isClosing) {
          currentStack.pop();
        } else {
          currentStack.push(t.tag);
        }
      }
      tagIdx++;
    }

    if (i < parts.length - 1) {
      // 还没到最后一段，说明遇到了一个切割点
      // 1. 闭合当前栈
      const closing = [...currentStack].reverse().map(t => getClosingTag(t)).join('');
      segments.push(part + closing);
      
      // 2. 下一段开头重开当前栈
      parts[i + 1] = currentStack.join('') + parts[i + 1];
      
      // 更新 lastPos，跳过 marker 长度
      lastPos = partEndPos + splitMarker.length;
    } else {
      // 最后一段
      segments.push(part);
    }
  }

  return segments;
}
