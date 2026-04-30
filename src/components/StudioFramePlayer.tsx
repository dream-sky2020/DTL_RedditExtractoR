import React from 'react';
import { Typography, Tag } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { VideoPreviewPlayer, getSceneStartFrame } from './VideoPreviewPlayer';
import { VideoConfig, VideoScene } from '../types';

const { Text } = Typography;

interface StudioFramePlayerProps {
  idx: number;
  isSelected: boolean;
  isCompact: boolean;
  videoConfig: VideoConfig;
  totalFrames: number;
  fps: number;
  frameOffset: number;
  activeCanvas: { width: number; height: number };
  isMultiSelectMode: boolean;
  onViewScene?: (idx: number) => void;
  setSelectedSceneIds: React.Dispatch<React.SetStateAction<string[]>>;
  scenes: VideoScene[];
  selectionIndex?: number; // 选中的顺序，1开始
}

export const StudioFramePlayer: React.FC<StudioFramePlayerProps> = ({
  idx,
  isSelected,
  isCompact,
  videoConfig,
  totalFrames,
  fps,
  frameOffset,
  activeCanvas,
  isMultiSelectMode,
  onViewScene,
  setSelectedSceneIds,
  scenes,
  selectionIndex,
}) => {
  const scene = scenes[idx];

  return (
    <div
      style={{
        position: 'relative',
        background: isCompact ? 'var(--brand-bg-subtle)' : 'var(--brand-dark)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: isCompact ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: (onViewScene || isMultiSelectMode) ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        // 使用 outline 代替 border 避免布局抖动
        outline: isSelected ? '2px solid var(--ant-primary-color)' : '1px solid var(--brand-border)',
        outlineOffset: isSelected ? '-2px' : '-1px',
        height: isCompact ? 60 : 'auto',
      }}
      onClick={() => {
        if (isMultiSelectMode) {
          setSelectedSceneIds(prev =>
            prev.includes(scene.id) ? prev.filter(sid => sid !== scene.id) : [...prev, scene.id]
          );
        } else {
          onViewScene?.(idx);
        }
      }}
    >
      {!isCompact ? (
        <VideoPreviewPlayer
          videoConfig={videoConfig}
          durationInFrames={totalFrames}
          fps={fps}
          initialFrame={getSceneStartFrame(videoConfig, idx, fps) + frameOffset}
          key={`studio-scene-${idx}-${frameOffset}`}
          style={{
            width: '100%',
            aspectRatio: `${activeCanvas.width} / ${activeCanvas.height}`,
            opacity: isMultiSelectMode && !isSelected ? 0.7 : 1,
            pointerEvents: isMultiSelectMode ? 'none' : 'auto',
          }}
          controls={false}
          autoPlay={false}
        />
      ) : (
        <div style={{ padding: '0 12px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 13 }}>#{idx + 1}</Text>
          <Tag color="blue" style={{ margin: 0 }}>{scene.duration}s</Tag>
        </div>
      )}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: isCompact ? 4 : 10,
          right: isCompact ? 4 : 10,
          zIndex: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#f0f0f0',
            color: '#595959', // 灰色数字
            borderRadius: '50%',
            width: isCompact ? 18 : 24,
            height: isCompact ? 18 : 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isCompact ? 10 : 12,
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #d9d9d9',
          }}>
            {selectionIndex}
          </div>
        </div>
      )}
      {isSelected && !isCompact && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '50%',
          width: 64,
          height: 64,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          <CheckCircleFilled style={{ fontSize: 48, color: 'var(--ant-primary-color)' }} />
        </div>
      )}
    </div>
  );
};
