import React from 'react';
import { SceneRenderer } from '../../../remotion/MyVideo';
import { VideoConfig, VideoScene } from '../../../types';

interface FramePlayerProps {
  videoConfig: VideoConfig;
  scene?: VideoScene; // 新增：直接传入场景对象
  totalFrames: number;
  fps: number;
  seekFrame: number;
  width: number;
  height: number;
  isThumbnail?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  uniqueKey: string;
}

export const FramePlayer: React.FC<FramePlayerProps> = ({
  videoConfig,
  scene,
  totalFrames,
  fps,
  seekFrame,
  width,
  height,
  isThumbnail = false,
  isActive = false,
  onClick,
  uniqueKey,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.1);

  // 寻找当前 seekFrame 落在哪个场景，以及在该场景中的相对帧
  const activeScene = scene || videoConfig.scenes.find((s, idx) => {
    let start = 0;
    for (let i = 0; i < idx; i++) start += videoConfig.scenes[i].duration * fps;
    let end = start + s.duration * fps;
    return seekFrame >= start && seekFrame < end;
  });

  const relativeFrame = React.useMemo(() => {
    if (activeScene) {
      let startFrame = 0;
      for (const s of videoConfig.scenes) {
        if (s.id === activeScene.id) break;
        startFrame += (s.duration || 0) * fps;
      }
      return Math.max(0, seekFrame - Math.round(startFrame));
    }
    return 0;
  }, [activeScene, seekFrame, videoConfig.scenes, fps]);

  React.useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      if (containerWidth > 0 && width > 0) {
        setScale(containerWidth / width);
      }
    }
  }, [width]);

  return (
    <div 
      style={{ 
        width: '100%',
        position: 'relative',
        cursor: isThumbnail ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div 
        ref={containerRef}
        style={{ 
          width: '100%',
          aspectRatio: `${width} / ${height}`, 
          position: 'relative',
          background: '#000', 
          borderRadius: isThumbnail ? 8 : 12, 
          overflow: 'hidden',
          boxShadow: isThumbnail ? '0 2px 8px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.3)',
          outline: isThumbnail && isActive ? '3px solid var(--ant-primary-color, #1890ff)' : 'none',
          outlineOffset: '-3px',
          transition: 'all 0.2s',
          boxSizing: 'border-box'
        }}
      >
        {activeScene ? (
          <div style={{
            width: width,
            height: height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0
          }}>
            <SceneRenderer 
              scene={activeScene}
              frame={relativeFrame}
              fps={fps}
              config={videoConfig}
              isRemotion={false}
            />
          </div>
        ) : (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: '#666' 
          }}>
            无画面
          </div>
        )}
      </div>
    </div>
  );
};
