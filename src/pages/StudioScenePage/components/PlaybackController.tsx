import React from 'react';
import { Button, Slider, Space, Typography } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined, StepBackwardOutlined, StepForwardOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PlaybackControllerProps {
  isScenePlaying: boolean;
  setIsScenePlaying: (playing: boolean) => void;
  stepFrame: (delta: number) => void;
  jumpToSceneFrame: (frame: number) => void;
  isLoopEnabled: boolean;
  setIsLoopEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  frameInScene: number;
  sceneRange: { length: number };
  isFullscreen: boolean;
}

export const PlaybackController: React.FC<PlaybackControllerProps> = ({
  isScenePlaying,
  setIsScenePlaying,
  stepFrame,
  jumpToSceneFrame,
  isLoopEnabled,
  setIsLoopEnabled,
  frameInScene,
  sceneRange,
  isFullscreen,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 3,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.15)',
        width: isFullscreen ? 520 : 420,
        maxWidth: 'calc(100% - 170px)',
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Space size={8} align="center" wrap>
          <Button
            size="small"
            icon={isScenePlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setIsScenePlaying(!isScenePlaying)}
          >
            {isScenePlaying ? '暂停' : '播放'}
          </Button>
          <Button size="small" icon={<StepBackwardOutlined />} onClick={() => { setIsScenePlaying(false); stepFrame(-1); }}>
            -1 帧
          </Button>
          <Button size="small" icon={<StepForwardOutlined />} onClick={() => { setIsScenePlaying(false); stepFrame(1); }}>
            +1 帧
          </Button>
          <Button size="small" onClick={() => { setIsScenePlaying(false); jumpToSceneFrame(0); }}>
            回到起始
          </Button>
          <Button
            size="small"
            type={isLoopEnabled ? 'primary' : 'default'}
            onClick={() => setIsLoopEnabled((prev) => !prev)}
          >
            {isLoopEnabled ? '循环: 开' : '循环: 关'}
          </Button>
        </Space>
        <Text style={{ color: '#fff', fontSize: 12 }}>
          场景帧 {frameInScene + 1}/{sceneRange.length}
        </Text>
        <Slider
          min={0}
          max={Math.max(0, sceneRange.length - 1)}
          value={frameInScene}
          step={1}
          onChange={(value) => {
            setIsScenePlaying(false);
            jumpToSceneFrame(Number(value));
          }}
          tooltip={{ formatter: (value) => `第 ${Number(value) + 1} 帧` }}
        />
      </Space>
    </div>
  );
};
