export interface Vector2 {
  x: number;
  y: number;
}

export const vec2 = {
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
  dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,
  cross: (a: Vector2, b: Vector2): number => a.x * b.y - a.y * b.x,
  magSq: (v: Vector2): number => v.x * v.x + v.y * v.y,
  mag: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector2): Vector2 => {
    const m = Math.sqrt(v.x * v.x + v.y * v.y);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
  },
  perp: (v: Vector2): Vector2 => ({ x: -v.y, y: v.x }),
  perpMul: (v: Vector2, s: number): Vector2 => ({ x: -v.y * s, y: v.x * s }),
};

export interface RigidBody {
  id: string;
  shapeType: 'circle' | 'polygon';
  position: Vector2;
  velocity: Vector2;
  force: Vector2;
  angle: number;
  angularVelocity: number;
  torque: number;
  mass: number;
  invMass: number;
  inertia: number;
  invInertia: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  vertices: Vector2[];
  radius: number;
  isStatic: boolean;
  
  // 新增：睡眠机制
  isSleeping?: boolean;
  sleepTimer?: number;
  motionHistory?: number[]; // 记录最近几帧的动能，用于判断是否进入睡眠
  
  // 新增：碰撞过滤
  collisionFilter?: {
    category: number; // 所属类别 (位掩码，如 0x0001)
    mask: number;     // 与哪些类别碰撞 (位掩码，如 0xFFFF)
  };
  
  // 新增：传感器模式 (只检测重叠，不产生物理力)
  isSensor?: boolean;
  
  // 新增：是否启用连续碰撞检测 (针对子弹等高速物体)
  isBullet?: boolean;
  
  // 新增：用户自定义数据 (HP, 类型等)
  userData?: any;
}

export interface CollisionEvent {
  type: 'collision';
  bodyAId: string;
  bodyBId: string;
  point: Vector2;
  normal: Vector2;
  impulse: number;
}

export interface SensorEvent {
  type: 'sensor';
  sensorId: string;
  bodyId: string;
  state: 'enter' | 'stay' | 'exit';
}

export type PhysicsEvent = CollisionEvent | SensorEvent;

export interface FrameData {
  frame: number;
  timestamp: number;
  data: Float32Array;
  events: PhysicsEvent[]; // 新增：每一帧记录的物理事件
}

export interface CollisionManifold {
  bodyA: RigidBody;
  bodyB: RigidBody;
  normal: Vector2;
  penetration: number;
  contacts: Vector2[];
}

export interface State {
  pos: Vector2;
  vel: Vector2;
  angle: number;
  angularVel: number;
}

export interface Derivative {
  dPos: Vector2;
  dVel: Vector2;
  dAngle: number;
  dAngularVel: number;
}

export interface Ray {
  start: Vector2;
  end: Vector2;
}

export interface RaycastHit {
  bodyId: string;
  point: Vector2;
  normal: Vector2;
  fraction: number; // 0 到 1 之间的距离比例
}
