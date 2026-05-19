/**
 * 更加健壮的标签识别工具
 */

// 匹配 BBCode 标签：[tag attrs] 或 [/tag]
export const BBCODE_TAG_RE = /\[#?\/?[a-zA-Z_][^\]]*\]/g;

// 匹配 XML 风格标签：<tag attrs> 或 </tag>
export const XML_TAG_RE = /<#?\/?[a-zA-Z_][^>]*>/g;

export interface TagToken {
  tag: string;
  index: number;
  length: number;
  name: string;
  isClosing: boolean;
  isXml: boolean;
}

/**
 * 获取内容中的所有标签，并按索引排序
 */
export function getAllTags(content: string): TagToken[] {
  const tags: TagToken[] = [];
  
  const bbcodeMatches = content.matchAll(BBCODE_TAG_RE);
  for (const match of bbcodeMatches) {
    const tag = match[0];
    const isClosing = tag.startsWith('[/');
    const nameMatch = tag.match(/\[#?\/?([a-zA-Z0-9_]+)/);
    tags.push({
      tag,
      index: match.index!,
      length: tag.length,
      name: nameMatch ? nameMatch[1] : '',
      isClosing,
      isXml: false
    });
  }

  const xmlMatches = content.matchAll(XML_TAG_RE);
  for (const match of xmlMatches) {
    const tag = match[0];
    const isClosing = tag.startsWith('</');
    const nameMatch = tag.match(/<#?\/?([a-zA-Z0-9_]+)/);
    tags.push({
      tag,
      index: match.index!,
      length: tag.length,
      name: nameMatch ? nameMatch[1] : '',
      isClosing,
      isXml: true
    });
  }
  
  return tags.sort((a, b) => a.index - b.index);
}

/**
 * 根据起始标签生成对应的闭合标签
 */
export function getClosingTag(openingTag: string): string {
  const isXml = openingTag.startsWith('<');
  
  let name = '';
  let hasStartHash = false;
  let hasEndHash = false;

  if (isXml) {
    const match = openingTag.match(/<(#?)([a-zA-Z0-9_]+)(#?)/);
    if (match) {
      hasStartHash = match[1] === '#';
      name = match[2];
      hasEndHash = match[3] === '#';
    }
    return (hasStartHash && hasEndHash) ? `</#${name}#>` : `</${name}>`;
  } else {
    const match = openingTag.match(/\[(#?)([a-zA-Z0-9_]+)(#?)/);
    if (match) {
      hasStartHash = match[1] === '#';
      name = match[2];
      hasEndHash = match[3] === '#';
    }
    return (hasStartHash && hasEndHash) ? `[/#${name}#]` : `[/${name}]`;
  }
}

/**
 * 检查是否是换行标签或自闭合标签
 */
export function isSelfClosingOrLineBreak(tag: string): boolean {
  const lower = tag.toLowerCase();
  return lower === '[#\\n#]' || lower === '[\\n]' || tag.endsWith('/>') || lower.startsWith('[image') || lower.startsWith('[avatar');
}
