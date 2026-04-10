import React from 'react';
import { Space, Button, InputNumber } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

interface SimulationControlsProps {
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  fps: number;
  onFpsChange: (val: number) => void;
  subSteps: number;
  onSubStepsChange: (val: number) => void;
  selectedFrameIdx: number | null;
  onStartFromSelected: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  onToggle,
  onReset,
  fps,
  onFpsChange,
  subSteps,
  onSubStepsChange,
  selectedFrameIdx,
  onStartFromSelected
}) => {
  return (
    <Space>
      {selectedFrameIdx !== null && (
        <Button 
          type="primary" 
          danger 
          icon={<PlayCircleOutlined />} 
          onClick={onStartFromSelected}
        >
          从当前帧重新录制
        </Button>
      )}
      <span>子步(精度):</span>
      <InputNumber size="small" min={1} max={1000} value={subSteps} onChange={v => onSubStepsChange(v || 50)} style={{ width: 70 }} />
      <span>FPS:</span>
      <InputNumber size="small" min={1} max={60} value={fps} onChange={v => onFpsChange(v || 30)} style={{ width: 60 }} />
      <Button 
        type={isRunning ? 'primary' : 'default'} 
        danger={isRunning}
        icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
        onClick={onToggle}
      >
        {isRunning ? '停止' : '开始'}
      </Button>
      <Button icon={<ReloadOutlined />} onClick={onReset}>重置</Button>
    </Space>
  );
};
