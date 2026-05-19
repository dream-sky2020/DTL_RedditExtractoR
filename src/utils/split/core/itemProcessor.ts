import { ItemInfo } from './types';

/**
 * 剥离并组装 Item
 */
export const stripItem = (content: string): ItemInfo => {
  const itemMatch = content.match(/^<item\b([^>]*)>([\s\S]*)<\/item>\s*$/i);
  if (!itemMatch) {
    throw new Error('未找到完整的 <item> 标签包围');
  }
  return {
    attributes: itemMatch[1],
    content: itemMatch[2].trim()
  };
};

export const wrapItem = (attributes: string, content: string): string => {
  return `  <item ${attributes.trim()}>\n${content}\n  </item>`;
};
