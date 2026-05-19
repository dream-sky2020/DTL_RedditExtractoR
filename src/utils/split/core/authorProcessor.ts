import { AuthorInfo } from './types';

/**
 * 剥离作者信息
 * 严格要求：从内容开头捕获，直到包含 type=author 的 style 标签闭合为止
 */
export const stripAuthor = (content: string): AuthorInfo => {
  // 寻找 type=author 的 style 标签的闭合位置
  const authorStyleEndRegex = /\[style[^\]]*type=author[^\]]*\][\s\S]*?\[\/style\]/i;
  const match = content.match(authorStyleEndRegex);
  
  if (!match) {
    throw new Error('未找到完整的作者信息区块 (需包含 type=author 的 style 标签)');
  }

  const endIndex = match.index! + match[0].length;
  
  // 必须从 0 开始截取，确保包含外层可能存在的 style 标签和 avatar
  const fullBlock = content.substring(0, endIndex);
  const remainingContent = content.substring(endIndex);

  return {
    fullBlock,
    remainingContent
  };
};
