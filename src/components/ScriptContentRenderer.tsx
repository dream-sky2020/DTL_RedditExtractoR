import React from 'react';
import { parseQuotes } from '../utils/quoteParser';

interface ScriptContentRendererProps {
  content: string;
  author: string;
  style?: React.CSSProperties;
  hideAudio?: boolean;
  showMediaControls?: boolean;
  playbackFrame?: number;
  fps?: number;
}

export const ScriptContentRenderer: React.FC<ScriptContentRendererProps> = ({
  content,
  author,
  style,
  hideAudio = false,
  showMediaControls = true,
  playbackFrame,
  fps,
}) => {
  return (
    <div style={{ whiteSpace: 'pre-wrap', ...style }}>
      {parseQuotes(content, -1, 0, 4, [author], hideAudio, showMediaControls, playbackFrame, fps)}
      {!content && (
        <span style={{ color: '#999', fontStyle: 'italic' }}>(无内容)</span>
      )}
    </div>
  );
};
