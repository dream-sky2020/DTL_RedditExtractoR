import { RigidBody, Vector2 } from './types';

/**
 * 物理数据二进制压缩工具 - 全参数版
 * 记录物体在某一时刻的完整物理特征，允许在恢复后修改任何参数
 */
export class PhysicalDataCompressor {
  // 每个物体占用的浮点数数量 (足以容纳位置、速度、材质、形状及最多 12 个顶点)
  public static readonly OBJ_SIZE = 42; 

  static encodeFrame(bodies: RigidBody[]): Float32Array {
    const data = new Float32Array(bodies.length * this.OBJ_SIZE);
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const o = i * this.OBJ_SIZE;
      
      data[o] = b.shapeType === 'circle' ? 0 : 1;
      data[o + 1] = b.position.x;
      data[o + 2] = b.position.y;
      data[o + 3] = b.angle;
      data[o + 4] = b.velocity.x;
      data[o + 5] = b.velocity.y;
      data[o + 6] = b.angularVelocity;
      data[o + 7] = b.mass;
      data[o + 8] = b.invMass;
      data[o + 9] = b.inertia;
      data[o + 10] = b.invInertia;
      data[o + 11] = b.restitution;
      data[o + 12] = b.staticFriction;
      data[o + 13] = b.dynamicFriction;
      data[o + 14] = b.isStatic ? 1 : 0;
      data[o + 15] = b.radius;
      data[o + 16] = b.isSensor ? 1 : 0;
      data[o + 17] = b.isBullet ? 1 : 0;
      data[o + 18] = b.collisionFilter?.category ?? 0xFFFF;
      data[o + 19] = b.collisionFilter?.mask ?? 0xFFFF;
      
      const vCount = b.vertices.length;
      data[o + 20] = vCount;
      for (let j = 0; j < Math.min(vCount, 10); j++) {
        data[o + 21 + j * 2] = b.vertices[j].x;
        data[o + 22 + j * 2] = b.vertices[j].y;
      }
    }
    return data;
  }

  static decodeFrame(data: Float32Array, bodyIds: string[]): RigidBody[] {
    const result: RigidBody[] = [];
    const step = this.OBJ_SIZE;
    for (let i = 0; i < bodyIds.length; i++) {
      const o = i * step;
      const vCount = data[o + 20];
      const vertices = [];
      for (let j = 0; j < vCount; j++) {
        vertices.push({ x: data[o + 21 + j * 2], y: data[o + 22 + j * 2] });
      }

      result.push({
        id: bodyIds[i],
        shapeType: data[o] === 0 ? 'circle' : 'polygon',
        position: { x: data[o + 1], y: data[o + 2] },
        angle: data[o + 3],
        velocity: { x: data[o + 4], y: data[o + 5] },
        angularVelocity: data[o + 6],
        mass: data[o + 7],
        invMass: data[o + 8],
        inertia: data[o + 9],
        invInertia: data[o + 10],
        restitution: data[o + 11],
        staticFriction: data[o + 12],
        dynamicFriction: data[o + 13],
        isStatic: data[o + 14] === 1,
        radius: data[o + 15],
        isSensor: data[o + 16] === 1,
        isBullet: data[o + 17] === 1,
        collisionFilter: {
          category: data[o + 18],
          mask: data[o + 19]
        },
        vertices,
        force: { x: 0, y: 0 },
        torque: 0
      });
    }
    return result;
  }
}
