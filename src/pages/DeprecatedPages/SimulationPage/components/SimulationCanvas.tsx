import React from 'react';
import { PhysicalDataCompressor, FrameData } from '../../../../utils/simulationEngine/physicsEngine/index';

interface SimulationCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  selectedFrame: FrameData | null;
  bodyIds: string[];
  selectedBodyId: string | null;
  onCanvasClick: (point: { x: number, y: number }) => void;
  isDragMode: boolean;
  onBodyDrag?: (id: string, pos: { x: number, y: number }, isDragging?: boolean) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  canvasRef,
  selectedFrame,
  bodyIds,
  selectedBodyId,
  onCanvasClick,
  isDragMode,
  onBodyDrag
}) => {
  const isDraggingRef = React.useRef(false);
  const dragOffsetRef = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // 1. 无论是否在拖拽模式，点击都先尝试选中
    onCanvasClick({ x, y });
    
    // 2. 如果是拖拽模式，且点中了某个物体（或者之前已经选中了物体且当前点也在物体上）
    if (isDragMode) {
      const engine = (window as any).physicsEngine;
      const body = engine?.getBodyAtPoint({ x, y });
      
      if (body) {
        isDraggingRef.current = true;
        // 记录点击位置相对于物体中心的偏移，防止物体中心直接跳到鼠标位置
        dragOffsetRef.current = {
          x: x - body.position.x,
          y: y - body.position.y
        };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !selectedBodyId || !onBodyDrag) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // 应用偏移量，保持点击时的相对位置
    onBodyDrag(selectedBodyId, { 
      x: x - dragOffsetRef.current.x, 
      y: y - dragOffsetRef.current.y 
    }, true);
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current && selectedBodyId && onBodyDrag) {
      onBodyDrag(selectedBodyId, { x: 0, y: 0 }, false);
    }
    isDraggingRef.current = false;
  };

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current && selectedBodyId && onBodyDrag) {
        onBodyDrag(selectedBodyId, { x: 0, y: 0 }, false);
      }
      isDraggingRef.current = false;
    };
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !selectedBodyId || !onBodyDrag || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      onBodyDrag(selectedBodyId, { 
        x: x - dragOffsetRef.current.x, 
        y: y - dragOffsetRef.current.y 
      }, true);
    };

    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragMode, selectedBodyId, onBodyDrag]);

  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: '4px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={450} 
        style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          cursor: isDragMode ? (selectedBodyId ? 'move' : 'crosshair') : 'default',
          touchAction: 'none' 
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      
      {/* 详细数据浮层 (始终显示，选中物体时高亮显示该物体数据) */}
      {(selectedFrame || selectedBodyId) && (
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          width: 280, 
          maxHeight: '80%', 
          background: 'rgba(0,0,0,0.85)', 
          color: '#fff', 
          padding: 12, 
          borderRadius: 8, 
          fontSize: 11, 
          overflowY: 'auto',
          border: selectedBodyId ? '1px solid #ff4d4f' : '1px solid #1890ff',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {selectedBodyId && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#ff4d4f', fontWeight: 'bold', borderBottom: '1px solid #ff4d4f', paddingBottom: 4, marginBottom: 8 }}>
                选中物体: {selectedBodyId}
              </div>
              {/* 实时物理参数展示 */}
              {(() => {
                const engine = (window as any).physicsEngine;
                if (!engine) return null;
                const body = engine.bodies.find((b: any) => b.id === selectedBodyId);
                if (!body) return <div style={{ fontSize: 10, color: '#666' }}>未找到物体数据</div>;
                
                return (
                  <div style={{ fontSize: 10, color: '#ddd', fontFamily: 'monospace', background: '#222', padding: 8, borderRadius: 4 }}>
                    <div>位置: ({body.position.x.toFixed(1)}, {body.position.y.toFixed(1)})</div>
                    <div>速度: ({body.velocity.x.toFixed(1)}, {body.velocity.y.toFixed(1)})</div>
                    <div>角度: {(body.angle * 180 / Math.PI).toFixed(1)}°</div>
                    <div>角速度: {body.angularVelocity.toFixed(2)}</div>
                    <div style={{ color: body.isSleeping ? '#52c41a' : '#1890ff' }}>
                      状态: {body.isSleeping ? '睡眠' : '活跃'}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {selectedFrame && (
            <>
              <div style={{ marginBottom: 8, borderBottom: '1px solid #555', paddingBottom: 4, fontWeight: 'bold' }}>
                第 {selectedFrame.frame} 帧数据 {selectedBodyId ? '(已过滤选中物体)' : '(显示全部)'}
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 10 }}>
                {(() => {
                  const allBodies = PhysicalDataCompressor.decodeFrame(selectedFrame.data, bodyIds);
                  if (selectedBodyId) {
                    const found = allBodies.find(b => b.id === selectedBodyId);
                    return JSON.stringify(found || { error: '未在当前帧找到该物体' }, null, 2);
                  }
                  return JSON.stringify(allBodies, null, 2);
                })()}
              </pre>

              <div style={{ marginTop: 12, marginBottom: 8, borderBottom: '1px solid #555', paddingBottom: 4, fontWeight: 'bold', color: '#aaa' }}>
                本帧产生的物理事件 ({selectedFrame.events.length})
              </div>
              <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                {selectedFrame.events.length > 0 ? (
                  <pre style={{ margin: 0, fontSize: 10, color: '#ffcc00' }}>
                    {JSON.stringify(
                      selectedBodyId 
                        ? selectedFrame.events.filter(e => e.type === 'collision' && (e.bodyAId === selectedBodyId || e.bodyBId === selectedBodyId))
                        : selectedFrame.events, 
                      null, 2
                    )}
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
            </>
          )}
        </div>
      )}
    </div>
  );
};
