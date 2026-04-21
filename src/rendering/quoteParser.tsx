import React from 'react';
import { normalize } from './parser/preprocessor';
import { tokenize } from './parser/tokenizer';
import { enrich } from './parser/enricher';
import { renderAST, PlaybackContext, usePlaybackContext } from './parser/renderer';

// 重新导出 Context 以确保兼容性
export { PlaybackContext, usePlaybackContext };

/**
 * 彻底重构后的 parseQuotes：采用管道模式 (Pipeline Pattern)
 * 1. Normalize (预处理)
 * 2. Tokenize (词法分析 -> AST)
 * 3. Enrich (逻辑增强，如截断)
 * 4. Render (渲染 -> React Node)
 */
export const parseQuotes = (
  text: string,
  parentMaxLimit: number = -1,
  currentDepth: number = 0,
  maxQuoteDepth: number = 4,
  authorPath: string[] = [], // 目前 Tokenizer 尚未完全利用 authorPath，可在后续 Enrich 阶段增强
  hideAudio: boolean = false,
  showMediaControls: boolean = true,
  defaultMaxLimit: number = 150,
  defaultQuoteFontSize: number = 12,
  defaultBackgroundColor?: string,
  defaultBorderColor?: string,
): React.ReactNode => {
  if (!text) return null;

  // Step 1: Normalize
  const normalizedText = normalize(text);

  // Step 2: Tokenize
  const ast = tokenize(normalizedText, {
    defaultMaxLimit,
    maxQuoteDepth,
    authorPath,
  }, currentDepth);

  // Step 3: Enrich (处理截断等逻辑)
  const enrichedAst = enrich(ast, parentMaxLimit);

  // Step 4: Render
  return renderAST(enrichedAst, {
    hideAudio,
    showMediaControls,
    defaultQuoteFontSize,
    defaultBackgroundColor,
    defaultBorderColor
  });
};
