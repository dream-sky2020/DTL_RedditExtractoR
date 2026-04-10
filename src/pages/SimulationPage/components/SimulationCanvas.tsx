import React from 'react';
import { PhysicalDataCompressor, FrameData } from '../../../utils/simulationEngine/physicsEngine/index';

interface SimulationCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  selectedFrame: FrameData | null;
  bodyIds: string[];
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  canvasRef,
  selectedFrame,
  bodyIds
}) => {
  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: '4px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={450} 
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* 详细数据浮层 (仅在选中帧时显示) */}
      {selectedFrame && (
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          width: 240, 
          maxHeight: '80%', 
          background: 'rgba(0,0,0,0.75)', 
          color: '#fff', 
          padding: 12, 
          borderRadius: 8, 
          fontSize: 11, 
          overflowY: 'auto',
          border: '1px solid #444',
          zIndex: 100
        }}>
          <div style={{ marginBottom: 8, borderBottom: '1px solid #555', paddingBottom: 4, fontWeight: 'bold' }}>
            第 {selectedFrame.frame} 帧数据
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(PhysicalDataCompressor.decodeFrame(selectedFrame.data, bodyIds), null, 2)}
          </pre>

          <div style={{ marginTop: 12, marginBottom: 8, borderBottom: '1px solid #555', paddingBottom: 4, fontWeight: 'bold', color: '#aaa' }}>
            本帧产生的物理事件 ({selectedFrame.events.length})
          </div>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {selectedFrame.events.length > 0 ? (
              <pre style={{ margin: 0, fontSize: 10, color: '#ffcc00' }}>
                {JSON.stringify(selectedFrame.events, null, 2)}
              </pre>
            ) : (
              <div style={{ fontSize: 10, color: '#666' }}>无事件</div>
            )}
          </div>
          
          <div style={{ marginTop: 12, marginBottom: 8, borderBottom: '1px solid #555', paddingBottom: 4, fontWeight: 'bold', color: '#aaa' }}>
            原始二进制数据 (Float32Array)
          </div>
          <div style={{ 
            background: '#222', 
            padding: '8px', 
            borderRadius: 4, 
            fontSize: 10, 
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            color: '#00ff00'
          }}>
            [{Array.from(selectedFrame.data).map((v: any) => v.toFixed(2)).join(', ')}]
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: '#888' }}>
            大小: {selectedFrame.data.byteLength} 字节
          </div>
        </div>
      )}
    </div>
  );
};
