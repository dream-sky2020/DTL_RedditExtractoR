/**
 * 预处理阶段：规范化文本
 * 处理特殊符号，确保后续解析的一致性
 */
export const normalize = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/[‘’]/g, "'") // 统一单引号
    .replace(/[“”]/g, '"') // 统一双引号
    .replace(/…/g, '...'); // 统一省略号
};
