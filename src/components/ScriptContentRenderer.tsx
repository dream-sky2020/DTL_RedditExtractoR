import React, { useMemo } from 'react';
import { parseQuotes, PlaybackContext } from '../utils/quoteParser';

interface ScriptContentRendererProps {
  content: string;
  author: string;
  style?: React.CSSProperties;
  hideAudio?: boolean;
  showMediaControls?: boolean;
  playbackFrame?: number;
  fps?: number;
}

export const ScriptContentRenderer: React.FC<ScriptContentRendererProps> = React.memo(({
  content,
  author,
  style,
  hideAudio = false,
  showMediaControls = true,
  playbackFrame,
  fps,
}) => {
  // 核心优化：将播放进度通过 Context 下发，而不是作为 parseQuotes 的参数
  // 这样 parseQuotes 只需要在内容变化时执行一次，而不是每帧执行
  const playbackValue = useMemo(() => ({
    playbackFrame,
    fps
  }), [playbackFrame, fps]);

  const parsedContent = useMemo(() => {
    return parseQuotes(content, -1, 0, 4, [author], hideAudio, showMediaControls);
  }, [content, author, hideAudio, showMediaControls]);

  return (
    <PlaybackContext.Provider value={playbackValue}>
      <div style={{ whiteSpace: 'pre-wrap', ...style }}>
        {parsedContent}
        {!content && (
          <span style={{ color: '#999', fontStyle: 'italic' }}>(无内容)</span>
        )}
      </div>
    </PlaybackContext.Provider>
  );
});
