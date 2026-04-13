import React from 'react';
import { parseQuotes } from '../utils/quoteParser';

interface ScriptContentRendererProps {
  content: string;
  author: string;
  style?: React.CSSProperties;
  hideAudio?: boolean;
}

export const ScriptContentRenderer: React.FC<ScriptContentRendererProps> = ({
  content,
  author,
  style,
  hideAudio = false,
}) => {
  return (
    <div style={{ whiteSpace: 'pre-wrap', ...style }}>
      {parseQuotes(content, -1, 0, 4, [author], hideAudio)}
      {!content && (
        <span style={{ color: '#999', fontStyle: 'italic' }}>(无内容)</span>
      )}
    </div>
  );
};
