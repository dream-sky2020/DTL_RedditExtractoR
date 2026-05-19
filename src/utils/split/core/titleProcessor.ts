import { TitleInfo } from './types';

/**
 * 剥离并组装标题信息 (可选)
 */
export const stripTitle = (content: string): TitleInfo => {
  // 匹配标题区块：通常包含 type=title 的 style 标签
  const titleRegex = /\[style[^\]]*type=title[^\]]*\][\s\S]*?\[\/style\]\s*(\[\/style\])?/i;
  const match = content.match(titleRegex);

  if (!match) {
    return {
      fullBlock: '',
      remainingContent: content
    };
  }

  const endIndex = match.index! + match[0].length;
  const fullBlock = content.substring(match.index!, endIndex);
  
  // 拼接剩余内容（跳过标题区块）
  const remainingContent = content.substring(0, match.index!) + content.substring(endIndex);

  return {
    fullBlock,
    remainingContent: remainingContent.trim()
  };
};
