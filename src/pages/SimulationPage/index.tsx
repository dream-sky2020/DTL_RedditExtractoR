import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, message } from 'antd';
import { PhysicsEngine, RigidBody, createRect, createRegularPolygon, PhysicalDataCompressor, Vector2 } from '../../utils/physicsEngine';

// 组件拆分
import { HeaderActions } from './components/HeaderActions';
import { SimulationControls } from './components/SimulationControls';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Timeline } from './components/Timeline';

interface SimulationPageProps {
  onBack: () => void;
}

interface FrameData {
  frame: number;
  timestamp: number;
  data: Float32Array;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({ onBack }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [fps, setFps] = useState(30);
  const [subSteps, setSubSteps] = useState(50);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(null);
  
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

    bodyIdsRef.current = engine.bodies.map(b => b.id);
    engineRef.current = engine;
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

    bodiesToDraw.forEach(bodyOrState => {
      let verts: Vector2[];
      let pos: Vector2;
      let angle: number;
      let isStatic: boolean;

      if ('vertices' in bodyOrState) {
        verts = engine.getWorldVertices(bodyOrState as RigidBody);
        pos = bodyOrState.position;
        angle = bodyOrState.angle;
        isStatic = bodyOrState.isStatic;
      } else {
        const originalBody = engine.bodies.find(b => b.id === bodyOrState.id);
        if (!originalBody) return;
        pos = bodyOrState.pos;
        angle = bodyOrState.angle;
        isStatic = originalBody.isStatic;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        verts = originalBody.vertices.map(v => ({
          x: pos.x + v.x * cos - v.y * sin,
          y: pos.y + v.x * sin + v.y * cos
        }));
      }
      
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();

      ctx.fillStyle = isStatic ? '#444' : '#1890ff';
      ctx.strokeStyle = isStatic ? '#666' : '#096dd9';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + Math.cos(angle) * 20, pos.y + Math.sin(angle) * 20);
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    });
  };

  const animate = (time: number) => {
    if (lastTimeRef.current !== null) {
      const engine = engineRef.current;
      engine.step(1 / fps, subSteps);
      draw();
      
      setCurrentFrame(prev => {
        const nextFrame = prev + 1;
        const frameData = PhysicalDataCompressor.encodeFrame(engine.bodies);
        setFrames(f => [...f, { frame: nextFrame, timestamp: Date.now(), data: frameData }]);
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
      frames: frames.map(f => ({ f: f.frame, t: f.timestamp, d: Array.from(f.data) }))
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
    draw(PhysicalDataCompressor.decodeFrame(frames[index].data, bodyIdsRef.current));
  };

  return (
    <div className="simulation-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <HeaderActions 
        onBack={onBack}
        currentFrame={currentFrame}
        recordedFrames={frames.length}
        onSave={handleSave}
        onClear={() => { setFrames([]); setCurrentFrame(0); setSelectedFrameIdx(null); }}
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
                onReset={() => { setIsRunning(false); setCurrentFrame(0); setFrames([]); setSelectedFrameIdx(null); initScene(); draw(); }}
                fps={fps}
                onFpsChange={setFps}
                subSteps={subSteps}
                onSubStepsChange={setSubSteps}
              />
            }
          >
            <SimulationCanvas 
              canvasRef={canvasRef}
              selectedFrame={selectedFrameIdx !== null ? frames[selectedFrameIdx] : null}
              bodyIds={bodyIdsRef.current}
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
