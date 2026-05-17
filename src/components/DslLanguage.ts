import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// 使用 StreamLanguage 实现简单的 DSL 高亮
export const dslLanguage = StreamLanguage.define({
  token(stream) {
    // 匹配开始标签 [#tag# 或 <#tag#
    if (stream.match(/^\[#[\/]?[a-zA-Z0-9]+#/) || stream.match(/^<#[\/]?[a-zA-Z0-9]+#/)) {
      return 'keyword'; // 使用 keyword 标签，通常显示为深粉色/紫色
    }
    
    // 匹配结束括号 #] 或 #>
    if (stream.match(/^#\]/) || stream.match(/^#>/)) {
      return 'punctuation';
    }

    // 匹配属性名 key=
    if (stream.match(/^[a-zA-Z_][\w-]*\s*=/)) {
      return 'propertyName'; // 橙色/蓝色
    }

    // 匹配属性值
    if (stream.match(/^"[^"]*"/ ) || stream.match(/^'[^']*'/)) {
      return 'string'; // 绿色
    }
    
    // 匹配数字
    if (stream.match(/^-?\d+\.?\d*/)) {
      return 'number'; // 青色
    }

    // 匹配其他字符
    stream.next();
    return null;
  }
});

export function dsl() {
  return new LanguageSupport(dslLanguage);
}
