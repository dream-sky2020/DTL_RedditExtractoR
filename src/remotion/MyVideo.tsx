import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoConfig, VideoSegment } from '../types';

export interface MyVideoProps extends VideoConfig {}

export const MyVideo: React.FC<MyVideoProps> = ({ title, subreddit, segments = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 计算每个分段的起止帧
  let currentStartFrame = 0;
  const segmentFrames = segments.map((seg) => {
    const start = currentStartFrame;
    const end = start + seg.duration * fps;
    currentStartFrame = end;
    return { start, end, ...seg };
  });

  // 找到当前帧属于哪个分段
  const activeSegment = segmentFrames.find(
    (seg) => frame >= seg.start && frame < seg.end
  );

  if (!activeSegment) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;

  const relativeFrame = frame - activeSegment.start;
  const segmentDurationFrames = activeSegment.duration * fps;

  // 简单的淡入淡出动画
  const opacity = interpolate(
    relativeFrame,
    [0, 10, segmentDurationFrames - 10, segmentDurationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f3f4f6',
        padding: 60,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', opacity }}>
        {/* Subreddit Header */}
        <div style={{ fontSize: 28, color: '#ff4500', fontWeight: 'bold', marginBottom: 10 }}>
          r/{subreddit} {activeSegment.type === 'post' ? '• 原贴' : '• 热门评论'}
        </div>

        {/* Author & Reply Indicator */}
        <div style={{ fontSize: 24, color: '#4b5563', marginBottom: 30, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          u/{activeSegment.author}
          {activeSegment.parentAuthor && (
            <span style={{ fontSize: 18, color: '#1890ff', backgroundColor: '#e6f7ff', padding: '2px 8px', borderRadius: 4 }}>
              回复 u/{activeSegment.parentAuthor}
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            fontSize: activeSegment.type === 'post' ? 54 : 42, 
            fontWeight: 800, 
            color: '#1a1a1b', 
            lineHeight: 1.3,
            marginBottom: 40
          }}>
            {activeSegment.content}
          </div>

          {activeSegment.image && (
            <div style={{ 
              marginTop: 'auto', 
              width: '100%', 
              height: 400, 
              borderRadius: 20, 
              overflow: 'hidden',
              backgroundColor: '#e5e7eb'
            }}>
              <img 
                src={activeSegment.image} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                alt="Segment Image"
              />
            </div>
          )}
        </div>

        {/* Progress Bar (Per Segment) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 12,
          backgroundColor: activeSegment.type === 'post' ? '#ff4500' : '#1890ff',
          width: `${(relativeFrame / segmentDurationFrames) * 100}%`
        }} />
      </div>
    </AbsoluteFill>
  );
};
