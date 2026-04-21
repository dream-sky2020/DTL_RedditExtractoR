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
      // 但它也受父级限制的影响。如果进入 Quote 前已经快到限制了，
      // 这里的逻辑可以根据需求调整。
      // 目前保持原样：Quote 节点本身不计入父级的字符数（或者可以计入）
      // 原代码中 Quote 标签本身不计入 currentLevelChars，只有 prefixText 计入。
      enrichedNodes.push(node);
    } else {
      // 其他标签（image, audio 等）在原代码中也不计入字符数
      enrichedNodes.push(node);
    }
  }

  return enrichedNodes;
};
