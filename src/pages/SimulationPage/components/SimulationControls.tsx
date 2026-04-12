import React from 'react';
import { Space, Button, InputNumber } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, SelectOutlined, DragOutlined } from '@ant-design/icons';

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
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  isDragMode: boolean;
  onToggleDragMode: () => void;
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
  onStartFromSelected,
  isSelectMode,
  onToggleSelectMode,
  isDragMode,
  onToggleDragMode
}) => {
  return (
    <Space>
      <Button 
        type={isSelectMode ? 'primary' : 'default'}
        icon={<SelectOutlined />} 
        onClick={onToggleSelectMode}
      >
        选中模式
      </Button>
      <Button 
        type={isDragMode ? 'primary' : 'default'}
        icon={<DragOutlined />} 
        onClick={onToggleDragMode}
        disabled={!isSelectMode}
      >
        拖拽模式
      </Button>
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
