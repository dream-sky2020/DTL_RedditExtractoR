/**
 * FramePlayer 组件
 * 功能：封装了 VideoPreviewPlayer 的基础渲染逻辑，支持大图预览和略缩图预览模式。
 * 包含：
 * 1. 自动应用视频配置、帧数、FPS 和 seek 位置。
 * 2. 处理略缩图样式的边框、阴影和鼠标点击事件。
 * 3. 略缩图模式下指示当前激活状态（高亮边框）。
 */
import React from 'react';
import { VideoPreviewPlayer } from '../../../components/VideoPreviewPlayer';
import { VideoConfig } from '../../../types';

interface FramePlayerProps {
  videoConfig: VideoConfig;
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
        style={{ 
          width: '100%',
          aspectRatio: `${width} / ${height}`, 
          position: 'relative',
          background: 'var(--brand-dark)', 
          borderRadius: isThumbnail ? 8 : 12, 
          overflow: 'hidden',
          boxShadow: isThumbnail ? '0 2px 8px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.3)',
          // 使用 outline 代替 border，因为它不占据物理空间
          outline: isThumbnail && isActive ? '3px solid var(--ant-primary-color, #1890ff)' : 'none',
          outlineOffset: '-3px',
          transition: 'all 0.2s',
          boxSizing: 'border-box'
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <VideoPreviewPlayer
            videoConfig={videoConfig}
            durationInFrames={totalFrames}
            fps={fps}
            initialFrame={seekFrame}
            key={uniqueKey}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            controls={false}
            autoPlay={false}
          />
        </div>
      </div>
    </div>
  );
};
