/**
 * 高精度 2D 物理引擎
 * 采用 RK4 积分、SAT 多边形碰撞检测、基于冲量的碰撞响应
 */

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
  perp: (v: Vector2): Vector2 => ({ x: -v.y, y: v.x }), // 逆时针旋转 90 度
};

export interface RigidBody {
  id: string;
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
  restitution: number; // 弹性系数 [0, 1]
  staticFriction: number;
  dynamicFriction: number;
  vertices: Vector2[]; // 局部坐标系下的顶点
  isStatic: boolean;
}

export interface CollisionManifold {
  bodyA: RigidBody;
  bodyB: RigidBody;
  normal: Vector2;
  penetration: number;
  contacts: Vector2[];
}

/**
 * 物理状态快照，用于 RK4 计算
 */
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

export class PhysicsEngine {
  bodies: RigidBody[] = [];
  gravity: Vector2 = { x: 0, y: 9.81 * 100 }; // 像素单位重力

  addBody(body: RigidBody) {
    this.bodies.push(body);
  }

  /**
   * 获取世界坐标系下的顶点
   */
  getWorldVertices(body: RigidBody): Vector2[] {
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    return body.vertices.map(v => ({
      x: body.position.x + v.x * cos - v.y * sin,
      y: body.position.y + v.x * sin + v.y * cos
    }));
  }

  /**
   * RK4 积分器核心逻辑
   */
  private evaluate(body: RigidBody, dt: number, d: Derivative): Derivative {
    const nextState: State = {
      pos: vec2.add(body.position, vec2.mul(d.dPos, dt)),
      vel: vec2.add(body.velocity, vec2.mul(d.dVel, dt)),
      angle: body.angle + d.dAngle * dt,
      angularVel: body.angularVelocity + d.dAngularVel * dt
    };

    // 计算加速度 a = F / m
    const acceleration = body.isStatic ? { x: 0, y: 0 } : vec2.add(this.gravity, vec2.mul(body.force, body.invMass));
    const angularAcceleration = body.isStatic ? 0 : body.torque * body.invInertia;

    return {
      dPos: nextState.vel,
      dVel: acceleration,
      dAngle: nextState.angularVel,
      dAngularVel: angularAcceleration
    };
  }

  integrate(dt: number) {
    for (const body of this.bodies) {
      if (body.isStatic) continue;

      const a = this.evaluate(body, 0, { dPos: { x: 0, y: 0 }, dVel: { x: 0, y: 0 }, dAngle: 0, dAngularVel: 0 });
      const b = this.evaluate(body, dt * 0.5, a);
      const c = this.evaluate(body, dt * 0.5, b);
      const d = this.evaluate(body, dt, c);

      const dPos = vec2.mul(vec2.add(vec2.add(a.dPos, vec2.mul(vec2.add(b.dPos, c.dPos), 2)), d.dPos), 1 / 6);
      const dVel = vec2.mul(vec2.add(vec2.add(a.dVel, vec2.mul(vec2.add(b.dVel, c.dVel), 2)), d.dVel), 1 / 6);
      const dAngle = (a.dAngle + 2 * (b.dAngle + c.dAngle) + d.dAngle) / 6;
      const dAngularVel = (a.dAngularVel + 2 * (b.dAngularVel + c.dAngularVel) + d.dAngularVel) / 6;

      body.position = vec2.add(body.position, vec2.mul(dPos, dt));
      body.velocity = vec2.add(body.velocity, vec2.mul(dVel, dt));
      body.angle += dAngle * dt;
      body.angularVelocity += dAngularVel * dt;

      // 重置力
      body.force = { x: 0, y: 0 };
      body.torque = 0;
    }
  }

  /**
   * SAT 多边形碰撞检测
   */
  detectCollision(bodyA: RigidBody, bodyB: RigidBody): CollisionManifold | null {
    const vertsA = this.getWorldVertices(bodyA);
    const vertsB = this.getWorldVertices(bodyB);

    let minOverlap = Infinity;
    let collisionNormal = { x: 0, y: 0 };

    const checkAxes = (verts: Vector2[]) => {
      for (let i = 0; i < verts.length; i++) {
        const p1 = verts[i];
        const p2 = verts[(i + 1) % verts.length];
        const edge = vec2.sub(p2, p1);
        const axis = vec2.normalize(vec2.perp(edge));

        let minA = Infinity, maxA = -Infinity;
        for (const v of vertsA) {
          const proj = vec2.dot(v, axis);
          minA = Math.min(minA, proj);
          maxA = Math.max(maxA, proj);
        }

        let minB = Infinity, maxB = -Infinity;
        for (const v of vertsB) {
          const proj = vec2.dot(v, axis);
          minB = Math.min(minB, proj);
          maxB = Math.max(maxB, proj);
        }

        if (maxA < minB || maxB < minA) return false; // 找到分离轴

        const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
        if (overlap < minOverlap) {
          minOverlap = overlap;
          collisionNormal = axis;
        }
      }
      return true;
    };

    if (!checkAxes(vertsA) || !checkAxes(vertsB)) return null;

    // 确保法线方向从 A 指向 B
    const d = vec2.sub(bodyB.position, bodyA.position);
    if (vec2.dot(d, collisionNormal) < 0) {
      collisionNormal = vec2.mul(collisionNormal, -1);
    }

    return {
      bodyA,
      bodyB,
      normal: collisionNormal,
      penetration: minOverlap,
      contacts: [] // 简化版，实际应用中需要计算接触点
    };
  }

  /**
   * 碰撞响应逻辑 (Impulse-based)
   */
  resolveCollision(manifold: CollisionManifold) {
    const { bodyA, bodyB, normal, penetration } = manifold;

    // 1. 位置修正 (防止穿模)
    const percent = 0.2; // 修正系数
    const slop = 0.01; // 允许的穿透量
    const correction = vec2.mul(normal, (Math.max(penetration - slop, 0) / (bodyA.invMass + bodyB.invMass)) * percent);
    if (!bodyA.isStatic) bodyA.position = vec2.sub(bodyA.position, vec2.mul(correction, bodyA.invMass));
    if (!bodyB.isStatic) bodyB.position = vec2.add(bodyB.position, vec2.mul(correction, bodyB.invMass));

    // 2. 冲量计算
    const relativeVelocity = vec2.sub(bodyB.velocity, bodyA.velocity);
    const velAlongNormal = vec2.dot(relativeVelocity, normal);

    if (velAlongNormal > 0) return; // 正在分离

    const e = Math.min(bodyA.restitution, bodyB.restitution);
    let j = -(1 + e) * velAlongNormal;
    j /= (bodyA.invMass + bodyB.invMass);

    const impulse = vec2.mul(normal, j);
    if (!bodyA.isStatic) bodyA.velocity = vec2.sub(bodyA.velocity, vec2.mul(impulse, bodyA.invMass));
    if (!bodyB.isStatic) bodyB.velocity = vec2.add(bodyB.velocity, vec2.mul(impulse, bodyB.invMass));
  }

  step(dt: number, subSteps: number = 10) {
    const subDt = dt / subSteps;
    for (let i = 0; i < subSteps; i++) {
      this.integrate(subDt);

      // 碰撞检测与解决
      for (let i = 0; i < this.bodies.length; i++) {
        for (let j = i + 1; j < this.bodies.length; j++) {
          const manifold = this.detectCollision(this.bodies[i], this.bodies[j]);
          if (manifold) {
            this.resolveCollision(manifold);
          }
        }
      }
    }
  }
}

/**
 * 创建矩形刚体工具函数
 */
export function createRect(id: string, x: number, y: number, w: number, h: number, options: Partial<RigidBody> = {}): RigidBody {
  const mass = options.isStatic ? 0 : (options.mass || w * h * 0.001);
  return {
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    force: { x: 0, y: 0 },
    angle: options.angle || 0,
    angularVelocity: 0,
    torque: 0,
    mass,
    invMass: mass === 0 ? 0 : 1 / mass,
    inertia: mass * (w * w + h * h) / 12,
    invInertia: mass === 0 ? 0 : 1 / (mass * (w * w + h * h) / 12),
    restitution: options.restitution ?? 0.5,
    staticFriction: 0.5,
    dynamicFriction: 0.3,
    vertices: [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ],
    isStatic: options.isStatic || false,
    ...options
  };
}

/**
 * 物理数据二进制压缩工具
 * 结构：[物体数量(Uint16)] [物体ID列表(Strings...)] [帧数据(Float32Array...)]
 */
export class PhysicalDataCompressor {
  static encodeFrame(bodies: RigidBody[]): Float32Array {
    const data = new Float32Array(bodies.length * 3); // x, y, angle
    for (let i = 0; i < bodies.length; i++) {
      data[i * 3] = bodies[i].position.x;
      data[i * 3 + 1] = bodies[i].position.y;
      data[i * 3 + 2] = bodies[i].angle;
    }
    return data;
  }

  static decodeFrame(data: Float32Array, bodyIds: string[]): any[] {
    const result = [];
    for (let i = 0; i < bodyIds.length; i++) {
      result.push({
        id: bodyIds[i],
        pos: { x: data[i * 3], y: data[i * 3 + 1] },
        angle: data[i * 3 + 2]
      });
    }
    return result;
  }
}

/**
 * 创建正多边形刚体工具函数
 */
export function createRegularPolygon(id: string, x: number, y: number, sides: number, radius: number, options: Partial<RigidBody> = {}): RigidBody {
  const vertices: Vector2[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });
  }

  const mass = options.isStatic ? 0 : (options.mass || (sides * radius * radius * Math.sin(Math.PI * 2 / sides) / 2) * 0.001);
  
  // 简化计算转动惯量：近似为圆盘
  const inertia = options.isStatic ? 0 : (0.5 * mass * radius * radius);

  return {
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    force: { x: 0, y: 0 },
    angle: options.angle || 0,
    angularVelocity: 0,
    torque: 0,
    mass,
    invMass: mass === 0 ? 0 : 1 / mass,
    inertia,
    invInertia: inertia === 0 ? 0 : 1 / inertia,
    restitution: options.restitution ?? 0.5,
    staticFriction: 0.5,
    dynamicFriction: 0.3,
    vertices,
    isStatic: options.isStatic || false,
    ...options
  };
}
