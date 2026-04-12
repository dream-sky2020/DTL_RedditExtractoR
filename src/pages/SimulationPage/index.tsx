import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, message } from 'antd';
import { PhysicsEngine, RigidBody, createRect, createRegularPolygon, createCircle, PhysicalDataCompressor, Vector2, FrameData } from '../../utils/simulationEngine/physicsEngine/index';

// 组件拆分
import { HeaderActions } from './components/HeaderActions';
import { SimulationControls } from './components/SimulationControls';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Timeline } from './components/Timeline';

interface SimulationPageProps {
  onBack: () => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({ onBack }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [fps, setFps] = useState(30);
  const [subSteps, setSubSteps] = useState(50);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  
  const bodyIdsRef = useRef<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const engineRef = useRef<PhysicsEngine>(new PhysicsEngine());

  const initScene = () => {
    const engine = new PhysicsEngine();
    engine.addBody(createRect('ground', 400, 430, 780, 20, { isStatic: true, restitution: 0.6 }));
    engine.addBody(createRect('left-wall', 10, 225, 20, 430, { isStatic: true, restitution: 0.6 }));
    engine.addBody(createRect('right-wall', 790, 225, 20, 430, { isStatic: true, restitution: 0.6 }));
    
    const polygonConfigs = [
      { sides: 3, name: 'triangle' },
      { sides: 4, name: 'square' },
      { sides: 5, name: 'pentagon' },
      { sides: 6, name: 'hexagon' },
      { sides: 7, name: 'heptagon' },
      { sides: 8, name: 'octagon' },
    ];

    polygonConfigs.forEach((config, i) => {
      engine.addBody(createRegularPolygon(
        `${config.name}-${i}`, 
        100 + i * 120, 
        150, 
        config.sides, 
        25, 
        { 
          restitution: 0.6,
          angle: Math.random() * Math.PI,
          velocity: { x: (Math.random() - 0.5) * 150, y: 50 },
          angularVelocity: (Math.random() - 0.5) * 2
        }
      ));
    });

    // 添加一些圆形
    for (let i = 0; i < 3; i++) {
      engine.addBody(createCircle(
        `circle-${i}`,
        150 + i * 200,
        50,
        20,
        {
          restitution: 0.8,
          velocity: { x: (Math.random() - 0.5) * 200, y: 100 }
        }
      ));
    }

    bodyIdsRef.current = engine.bodies.map(b => b.id);
    engineRef.current = engine;
    (window as any).physicsEngine = engine; // 暴露给全局以便 Canvas 访问
  };

  useEffect(() => {
    initScene();
    draw();
  }, []);

  const draw = (customBodies?: any[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= canvas.width; i += 50) {
      ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
    }
    for (let i = 0; i <= canvas.height; i += 50) {
      ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    const engine = engineRef.current;
    const bodiesToDraw = customBodies || engine.bodies;

    // 分两批绘制：先画普通物体，最后画选中的物体（确保高亮框在最上层，且不改变原始数组顺序）
    bodiesToDraw.forEach(bodyOrState => {
      if (bodyOrState.id === selectedBodyId) return;
      drawSingleBody(ctx, bodyOrState, engine, false);
    });

    if (selectedBodyId) {
      const selectedBody = bodiesToDraw.find(b => b.id === selectedBodyId);
      if (selectedBody) {
        drawSingleBody(ctx, selectedBody, engine, true);
      }
    }
  };

  const drawSingleBody = (ctx: CanvasRenderingContext2D, bodyOrState: any, engine: PhysicsEngine, isSelected: boolean) => {
    let verts: Vector2[] = [];
    let pos: Vector2;
    let angle: number;
    let isStatic: boolean;
    let shapeType: 'circle' | 'polygon';
    let radius: number = 0;

    if ('shapeType' in bodyOrState && !('pos' in bodyOrState)) {
      pos = bodyOrState.position;
      angle = bodyOrState.angle;
      isStatic = bodyOrState.isStatic;
      shapeType = bodyOrState.shapeType;
      radius = bodyOrState.radius;
      if (shapeType === 'polygon') {
        verts = engine.getWorldVertices(bodyOrState as RigidBody);
      }
    } else {
      pos = bodyOrState.position;
      angle = bodyOrState.angle;
      isStatic = bodyOrState.isStatic;
      shapeType = bodyOrState.shapeType;
      radius = bodyOrState.radius;

      if (shapeType === 'polygon') {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        verts = (bodyOrState.vertices as Vector2[]).map(v => ({
          x: pos.x + v.x * cos - v.y * sin,
          y: pos.y + v.x * sin + v.y * cos
        }));
      }
    }
    
    ctx.beginPath();
    if (shapeType === 'circle') {
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    } else {
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x, verts[i].y);
      }
      ctx.closePath();
    }

    ctx.fillStyle = isSelected ? '#ffec3d' : (isStatic ? '#444' : '#1890ff');
    ctx.strokeStyle = isSelected ? '#fadb14' : (isStatic ? '#666' : '#096dd9');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    const lineLength = 20;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    const forward = {
      x: pos.x + Math.cos(angle) * lineLength,
      y: pos.y + Math.sin(angle) * lineLength
    };
    ctx.lineTo(forward.x, forward.y);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  };

  const animate = (time: number) => {
    if (lastTimeRef.current !== null) {
      const engine = engineRef.current;
      engine.step(1 / fps, subSteps);
      draw();
      
      setCurrentFrame(prev => {
        const nextFrame = prev + 1;
        const engine = engineRef.current;
        
        // 执行物理步进并获取本帧产生的事件
        const frameEvents = engine.step(1 / fps, subSteps);
        
        const frameData = PhysicalDataCompressor.encodeFrame(engine.bodies);
        setFrames(f => [...f, { 
          frame: nextFrame, 
          timestamp: Date.now(), 
          data: frameData,
          events: frameEvents // 保存事件
        }]);
        return nextFrame;
      });
      lastTimeRef.current = time;
    } else {
      lastTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isRunning) {
      setSelectedFrameIdx(null);
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    }
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, fps, subSteps]);

  const handleSave = () => {
    const exportData = {
      metadata: { fps, totalFrames: frames.length, bodyIds: bodyIdsRef.current, recordedAt: new Date().toISOString() },
      frames: frames.map(f => ({ 
        f: f.frame, 
        t: f.timestamp, 
        d: Array.from(f.data),
        e: f.events // 导出事件
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation-compressed-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`已保存 ${frames.length} 帧数据`);
  };

  const jumpToFrame = (index: number) => {
    if (isRunning) setIsRunning(false);
    setSelectedFrameIdx(index);
    
    // 数据的统一驱动：直接通过 loadFrame 重建引擎内部状态
    engineRef.current.loadFrame(frames[index].data, bodyIdsRef.current);
    
    const decoded = PhysicalDataCompressor.decodeFrame(frames[index].data, bodyIdsRef.current);
    draw(decoded);
  };

  const handleStartFromSelected = () => {
    if (selectedFrameIdx === null) return;
    
    // 剪断时间轴：保留 0 到 selectedFrameIdx 的帧
    const newFrames = frames.slice(0, selectedFrameIdx + 1);
    setFrames(newFrames);
    setCurrentFrame(newFrames.length);
    setSelectedFrameIdx(null);
    
    // 开始运行
    setIsRunning(true);
  };

  useEffect(() => {
    draw();
  }, [selectedBodyId, isSelectMode]);

  const handleCanvasClick = (point: { x: number, y: number }) => {
    if (!isSelectMode && !isDragMode) return;
    const body = engineRef.current.getBodyAtPoint(point);
    setSelectedBodyId(body ? body.id : null);
  };

  const handleBodyDrag = (id: string, pos: { x: number, y: number }, isDragging: boolean = true) => {
    if (!isDragMode) return;
    const body = engineRef.current.bodies.find(b => b.id === id);
    if (body) {
      (body as any).isDragging = isDragging;
      if (isDragging) {
        body.position = { ...pos };
        body.velocity = { x: 0, y: 0 }; // 拖拽时重置速度
        body.angularVelocity = 0;      // 拖拽时重置角速度
        body.isSleeping = false;
        body.sleepTimer = 0;
      }
      draw();
    }
  };

  return (
    <div className="simulation-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <HeaderActions 
        onBack={onBack}
        currentFrame={currentFrame}
        recordedFrames={frames.length}
        onSave={handleSave}
        onClear={() => { setFrames([]); setCurrentFrame(0); setSelectedFrameIdx(null); setSelectedBodyId(null); }}
        isSaveDisabled={frames.length === 0}
      />

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card 
            title="模拟画布" 
            extra={
              <SimulationControls 
                isRunning={isRunning}
                onToggle={() => setIsRunning(!isRunning)}
                onReset={() => { setIsRunning(false); setCurrentFrame(0); setFrames([]); setSelectedFrameIdx(null); setSelectedBodyId(null); initScene(); draw(); }}
                fps={fps}
                onFpsChange={setFps}
                subSteps={subSteps}
                onSubStepsChange={setSubSteps}
                selectedFrameIdx={selectedFrameIdx}
                onStartFromSelected={handleStartFromSelected}
                isSelectMode={isSelectMode}
                onToggleSelectMode={() => { setIsSelectMode(!isSelectMode); if (isSelectMode) { setSelectedBodyId(null); setIsDragMode(false); } }}
                isDragMode={isDragMode}
                onToggleDragMode={() => setIsDragMode(!isDragMode)}
              />
            }
          >
            <SimulationCanvas 
              canvasRef={canvasRef}
              selectedFrame={selectedFrameIdx !== null ? frames[selectedFrameIdx] : null}
              bodyIds={bodyIdsRef.current}
              selectedBodyId={selectedBodyId}
              onCanvasClick={handleCanvasClick}
              isDragMode={isDragMode}
              onBodyDrag={handleBodyDrag}
            />
            
            <Timeline 
              frames={frames}
              selectedFrameIdx={selectedFrameIdx}
              onJumpToFrame={jumpToFrame}
              isRunning={isRunning}
              fps={fps}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
