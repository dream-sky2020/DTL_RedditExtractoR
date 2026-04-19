import React from 'react';
import { Typography, Tag } from 'antd';
import { FrameData } from '../../../../utils/simulationEngine/physicsEngine/index';

const { Text } = Typography;

interface TimelineProps {
  frames: FrameData[];
  selectedFrameIdx: number | null;
  onJumpToFrame: (index: number) => void;
  isRunning: boolean;
  fps: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  selectedFrameIdx,
  onJumpToFrame,
  isRunning,
  fps
}) => {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ 
        width: '100%', 
        height: 100, 
        background: '#1a1a1a', 
        borderRadius: 4, 
        position: 'relative',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '20px 10px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: 2, 
          minWidth: 'max-content',
          height: '100%',
          alignItems: 'center'
        }}>
          {frames.map((f, i) => (
            <div 
              key={i}
              onClick={() => onJumpToFrame(i)}
              style={{
                width: 12,
                height: 40,
                background: selectedFrameIdx === i ? '#1890ff' : (i % fps === 0 ? '#555' : '#333'),
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
                border: selectedFrameIdx === i ? '1px solid #fff' : 'none'
              }}
              title={`第 ${f.frame} 帧`}
            />
          ))}
          {frames.length === 0 && (
            <div style={{ color: '#666', width: '100%', textAlign: 'center' }}>
              暂无录制数据，点击“开始”进行物理模拟
            </div>
          )}
        </div>
        
        {/* 当前播放/渲染头 */}
        {isRunning && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 10 + (frames.length * 14),
            width: 2,
            height: '100%',
            background: '#ff4d4f',
            boxShadow: '0 0 8px rgba(255,77,79,0.5)',
            zIndex: 10
          }} />
        )}
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          * 每一个方块代表一帧。深灰色方块为秒标记 (每 {fps} 帧)。点击方块可预览该帧画面。
        </Text>
        {selectedFrameIdx !== null && (
          <Tag color="blue">正在预览第 {frames[selectedFrameIdx].frame} 帧</Tag>
        )}
      </div>
    </div>
  );
};
