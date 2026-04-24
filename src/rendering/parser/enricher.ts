import { ASTNode } from './types';

/**
 * 增强阶段：处理截断逻辑 (Max Limit)
 * 这是一个纯函数，通过遍历 AST 并计算文本长度来实现截断
 */
export const enrich = (nodes: ASTNode[], parentMaxLimit: number = -1): ASTNode[] => {
  let currentLevelChars = 0;
  let limitReached = false;
  const enrichedNodes: ASTNode[] = [];
  const hasLimit = parentMaxLimit > 0;

  for (const node of nodes) {
    if (hasLimit && limitReached) break;

    if (node.type === 'text') {
      if (hasLimit && currentLevelChars + node.content.length > parentMaxLimit) {
        const remainingLimit = Math.max(0, parentMaxLimit - currentLevelChars);
        enrichedNodes.push({
          ...node,
          content: node.content.substring(0, remainingLimit) + '... (内容已省略)'
        });
        limitReached = true;
      } else {
        enrichedNodes.push(node);
        if (hasLimit) {
          currentLevelChars += node.content.length;
        }
      }
    } else if (node.type === 'quote') {
      // Quote 节点内部有自己的限制 (maxLimit)，无论父层是否有限制都要递归处理
      const enrichedChildren = enrich(node.children, node.maxLimit);
      enrichedNodes.push({
        ...node,
        children: enrichedChildren
      });
      // 根据老代码逻辑，quote 内部文字不计入当前层级的 currentLevelChars
    } else if (node.type === 'style' || node.type === 'row') {
      // 对于 style 和 row，递归处理。
      // 传递 parentMaxLimit（如果 parentMaxLimit 为 -1，则子层 text 也不会被截断）
      const enrichedChildren = enrich(node.children, parentMaxLimit);
      enrichedNodes.push({
        ...node,
        children: enrichedChildren
      });
      // 注意：老代码中 style/row 内部文字其实也不计入 currentLevelChars，
      // 因为老代码在处理这些标签时会开启全新的 parseQuotes 调用且 currentLevelChars 重置为 0。
    } else {
      // 其他标签（image, audio 等）不计入字符数
      enrichedNodes.push(node);
    }
  }

  return enrichedNodes;
};
