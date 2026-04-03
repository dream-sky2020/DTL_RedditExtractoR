import React from 'react';
import { parseQuotes } from '../utils/quoteParser';

interface ScriptContentRendererProps {
  content: string;
  author: string;
  style?: React.CSSProperties;
}

export const ScriptContentRenderer: React.FC<ScriptContentRendererProps> = ({
  content,
  author,
  style,
}) => {
  return (
    <div style={style}>
      {parseQuotes(content, -1, 0, 4, [author])}
      {!content && (
        <span style={{ color: '#999', fontStyle: 'italic' }}>(无内容)</span>
      )}
    </div>
  );
};
