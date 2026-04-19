/**
 * Filmstrip 组件
 * 功能：StudioScenePage 顶部的“胶片栏”，展示场景序列的略缩图，用于快速切换。
 * 包含：
 * 1. 横向滚动列表展示多个场景的预览图。
 * 2. 指示当前激活场景（缩放与不透明度变化）。
 * 3. 显示场景索引和标题文字。
 */
import React from 'react';
import { Typography } from 'antd';
import { FramePlayer } from './FramePlayer';
import { VideoConfig, VideoScene } from '../../../types';

const { Text } = Typography;

interface FilmstripProps {
  videoConfig: VideoConfig;
  scenes: VideoScene[];
  currentSceneIdx: number;
  visibleScenes: { sceneIdx: number; scene: VideoScene }[];
  totalFrames: number;
  fps: number;
  canvasWidth: number;
  canvasHeight: number;
  getSeekFrame: (idx: number) => number;
  onSceneSelect: (idx: number) => void;
}

export const Filmstrip: React.FC<FilmstripProps> = ({
  videoConfig,
  scenes,
  currentSceneIdx,
  visibleScenes,
  totalFrames,
  fps,
  canvasWidth,
  canvasHeight,
  getSeekFrame,
  onSceneSelect,
}) => {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      gap: 12,
      padding: '10px 5px',
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 12,
      marginBottom: 24,
      border: '1px solid rgba(0,0,0,0.05)'
    }}>
      {visibleScenes.map(({ scene, sceneIdx: idx }) => (
        <div
          key={`filmstrip-${scene.id}`}
          style={{
            flex: '0 0 140px',
            width: 140, // 显式强制宽度一致
            opacity: currentSceneIdx === idx ? 1 : 0.6,
            transition: 'all 0.3s'
          }}
        >
          <FramePlayer
            videoConfig={videoConfig}
            totalFrames={totalFrames}
            fps={fps}
            seekFrame={getSeekFrame(idx)}
            width={canvasWidth}
            height={canvasHeight}
            isThumbnail
            isActive={currentSceneIdx === idx}
            onClick={() => onSceneSelect(idx)}
            uniqueKey={`filmstrip-frame-${idx}`}
          />
          <div style={{
            marginTop: 8,
            textAlign: 'center',
            height: '1.2em', // 锁定文本高度，防止抖动
            overflow: 'hidden'
          }}>
            <Text strong ellipsis style={{ fontSize: '10px', display: 'block', lineHeight: '1.2' }}>
              {idx + 1}. {scene.title}
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
};
