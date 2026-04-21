import { ASTNode } from './types';

/**
 * 增强阶段：处理截断逻辑 (Max Limit)
 * 这是一个纯函数，通过遍历 AST 并计算文本长度来实现截断
 */
export const enrich = (nodes: ASTNode[], parentMaxLimit: number = -1): ASTNode[] => {
  if (parentMaxLimit <= 0) return nodes;

  let currentLevelChars = 0;
  let limitReached = false;
  const enrichedNodes: ASTNode[] = [];

  for (const node of nodes) {
    if (limitReached) break;

    if (node.type === 'text') {
      if (currentLevelChars + node.content.length > parentMaxLimit) {
        const remainingLimit = parentMaxLimit - currentLevelChars;
        enrichedNodes.push({
          ...node,
          content: node.content.substring(0, remainingLimit) + '... (内容已省略)'
        });
        limitReached = true;
      } else {
        enrichedNodes.push(node);
        currentLevelChars += node.content.length;
      }
    } else if (node.type === 'quote') {
      // Quote 节点内部有自己的限制 (maxLimit)
      // 处理子节点的增强逻辑（递归处理截断）
      const enrichedChildren = enrich(node.children, node.maxLimit);
      enrichedNodes.push({
        ...node,
        children: enrichedChildren
      });
    } else if (node.type === 'style' || node.type === 'row') {
      // 对于 style 和 row，继承当前的限制 (原逻辑直接继承 parentMaxLimit)
      const enrichedChildren = enrich(node.children, parentMaxLimit);
      enrichedNodes.push({
        ...node,
        children: enrichedChildren
      });
    } else {
      // 其他标签（image, audio 等）在原代码中也不计入字符数
      enrichedNodes.push(node);
    }
  }

  return enrichedNodes;
};
