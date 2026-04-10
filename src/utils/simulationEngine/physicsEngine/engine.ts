import { RigidBody, Vector2, vec2, CollisionManifold, Derivative, State, PhysicsEvent, Ray, RaycastHit } from './types';
import { PhysicalDataCompressor } from './compressor';

export class PhysicsEngine {
  bodies: RigidBody[] = [];
  gravity: Vector2 = { x: 0, y: 9.81 * 100 };
  currentEvents: PhysicsEvent[] = []; // 存储当前子步产生的事件

  addBody(body: RigidBody) {
    this.bodies.push(body);
  }

  /**
   * 检查两个物体是否应该发生碰撞
   */
  private shouldCollide(bodyA: RigidBody, bodyB: RigidBody): boolean {
    if (!bodyA.collisionFilter || !bodyB.collisionFilter) return true;
    
    const canACollideWithB = (bodyA.collisionFilter.mask & bodyB.collisionFilter.category) !== 0;
    const canBCollideWithA = (bodyB.collisionFilter.mask & bodyA.collisionFilter.category) !== 0;
    
    return canACollideWithB && canBCollideWithA;
  }

  getWorldVertices(body: RigidBody): Vector2[] {
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    return body.vertices.map(v => ({
      x: body.position.x + v.x * cos - v.y * sin,
      y: body.position.y + v.x * sin + v.y * cos
    }));
  }

  private evaluate(body: RigidBody, dt: number, d: Derivative): Derivative {
    const nextState: State = {
      pos: vec2.add(body.position, vec2.mul(d.dPos, dt)),
      vel: vec2.add(body.velocity, vec2.mul(d.dVel, dt)),
      angle: body.angle + d.dAngle * dt,
      angularVel: body.angularVelocity + d.dAngularVel * dt
    };

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

      body.force = { x: 0, y: 0 };
      body.torque = 0;
    }
  }

  detectCollision(bodyA: RigidBody, bodyB: RigidBody): CollisionManifold | null {
    if (bodyA.shapeType === 'circle' && bodyB.shapeType === 'circle') {
      return this.collideCircles(bodyA, bodyB);
    } else if (bodyA.shapeType === 'circle' || bodyB.shapeType === 'circle') {
      const circle = bodyA.shapeType === 'circle' ? bodyA : bodyB;
      const polygon = bodyA.shapeType === 'circle' ? bodyB : bodyA;
      const manifold = this.collideCirclePolygon(circle, polygon);
      
      if (manifold) {
        if (bodyA.shapeType !== 'circle') {
          const temp = manifold.bodyA;
          manifold.bodyA = manifold.bodyB;
          manifold.bodyB = temp;
          manifold.normal = vec2.mul(manifold.normal, -1);
        }
      }
      return manifold;
    } else {
      return this.collidePolygons(bodyA, bodyB);
    }
  }

  private collideCircles(bodyA: RigidBody, bodyB: RigidBody): CollisionManifold | null {
    const d = vec2.sub(bodyB.position, bodyA.position);
    const distSq = vec2.magSq(d);
    const radiusSum = bodyA.radius + bodyB.radius;

    if (distSq > radiusSum * radiusSum) return null;

    const dist = Math.sqrt(distSq);
    const normal = dist === 0 ? { x: 1, y: 0 } : vec2.mul(d, 1 / dist);

    return { bodyA, bodyB, normal, penetration: radiusSum - dist, contacts: [] };
  }

  private collideCirclePolygon(circle: RigidBody, polygon: RigidBody): CollisionManifold | null {
    const verts = this.getWorldVertices(polygon);
    let minOverlap = Infinity;
    let collisionNormal = { x: 0, y: 0 };

    for (let i = 0; i < verts.length; i++) {
      const p1 = verts[i];
      const p2 = verts[(i + 1) % verts.length];
      const edge = vec2.sub(p2, p1);
      const axis = vec2.normalize(vec2.perp(edge));

      let minP = Infinity, maxP = -Infinity;
      for (const v of verts) {
        const proj = vec2.dot(v, axis);
        minP = Math.min(minP, proj);
        maxP = Math.max(maxP, proj);
      }

      const circleProj = vec2.dot(circle.position, axis);
      const minC = circleProj - circle.radius;
      const maxC = circleProj + circle.radius;

      if (maxP < minC || maxC < minP) return null;

      const overlap = Math.min(maxP, maxC) - Math.max(minP, minC);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        collisionNormal = axis;
      }
    }

    let nearestVert = verts[0];
    let minDistSq = vec2.magSq(vec2.sub(circle.position, verts[0]));
    for (let i = 1; i < verts.length; i++) {
      const dSq = vec2.magSq(vec2.sub(circle.position, verts[i]));
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearestVert = verts[i];
      }
    }

    const axis = vec2.normalize(vec2.sub(nearestVert, circle.position));
    let minP = Infinity, maxP = -Infinity;
    for (const v of verts) {
      const proj = vec2.dot(v, axis);
      minP = Math.min(minP, proj);
      maxP = Math.max(maxP, proj);
    }

    const circleProj = vec2.dot(circle.position, axis);
    const minC = circleProj - circle.radius;
    const maxC = circleProj + circle.radius;

    if (maxP < minC || maxC < minP) return null;

    const overlap = Math.min(maxP, maxC) - Math.max(minP, minC);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      collisionNormal = axis;
    }

    const d = vec2.sub(polygon.position, circle.position);
    if (vec2.dot(d, collisionNormal) < 0) {
      collisionNormal = vec2.mul(collisionNormal, -1);
    }

    return { bodyA: circle, bodyB: polygon, normal: collisionNormal, penetration: minOverlap, contacts: [] };
  }

  private collidePolygons(bodyA: RigidBody, bodyB: RigidBody): CollisionManifold | null {
    const vertsA = this.getWorldVertices(bodyA);
    const vertsB = this.getWorldVertices(bodyB);
    let minOverlap = Infinity;
    let collisionNormal = { x: 0, y: 0 };

    const checkAxes = (axesOwnerVerts: Vector2[], otherVerts: Vector2[]) => {
      for (let i = 0; i < axesOwnerVerts.length; i++) {
        const p1 = axesOwnerVerts[i];
        const p2 = axesOwnerVerts[(i + 1) % axesOwnerVerts.length];
        const edge = vec2.sub(p2, p1);
        const axis = vec2.normalize(vec2.perp(edge));

        let minA = Infinity, maxA = -Infinity;
        for (const v of axesOwnerVerts) {
          const proj = vec2.dot(v, axis);
          minA = Math.min(minA, proj);
          maxA = Math.max(maxA, proj);
        }

        let minB = Infinity, maxB = -Infinity;
        for (const v of otherVerts) {
          const proj = vec2.dot(v, axis);
          minB = Math.min(minB, proj);
          maxB = Math.max(maxB, proj);
        }

        if (maxA < minB || maxB < minA) return false;

        const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
        if (overlap < minOverlap) {
          minOverlap = overlap;
          collisionNormal = axis;
        }
      }
      return true;
    };

    if (!checkAxes(vertsA, vertsB)) return null;
    if (!checkAxes(vertsB, vertsA)) return null;

    const d = vec2.sub(bodyB.position, bodyA.position);
    if (vec2.dot(d, collisionNormal) < 0) {
      collisionNormal = vec2.mul(collisionNormal, -1);
    }

    return { bodyA, bodyB, normal: collisionNormal, penetration: minOverlap, contacts: [] };
  }

  resolveCollision(manifold: CollisionManifold) {
    const { bodyA, bodyB, normal, penetration } = manifold;

    // 记录碰撞事件
    this.currentEvents.push({
      type: 'collision',
      bodyAId: bodyA.id,
      bodyBId: bodyB.id,
      point: vec2.add(bodyA.position, vec2.mul(normal, bodyA.radius || 0)), // 简化版碰撞点
      normal: { ...normal },
      impulse: 0 // 初始为 0，后面计算
    });

    // 如果其中一个是传感器，则不进行物理响应
    if (bodyA.isSensor || bodyB.isSensor) {
      this.currentEvents.push({
        type: 'sensor',
        sensorId: bodyA.isSensor ? bodyA.id : bodyB.id,
        bodyId: bodyA.isSensor ? bodyB.id : bodyA.id,
        state: 'stay' // 简化版，实际需要维护状态机
      });
      return;
    }

    const percent = 0.2;
    const slop = 0.01;
    const correction = vec2.mul(normal, (Math.max(penetration - slop, 0) / (bodyA.invMass + bodyB.invMass)) * percent);
    if (!bodyA.isStatic) bodyA.position = vec2.sub(bodyA.position, vec2.mul(correction, bodyA.invMass));
    if (!bodyB.isStatic) bodyB.position = vec2.add(bodyB.position, vec2.mul(correction, bodyB.invMass));

    const relativeVelocity = vec2.sub(bodyB.velocity, bodyA.velocity);
    const velAlongNormal = vec2.dot(relativeVelocity, normal);

    if (velAlongNormal > 0) return;

    const e = Math.min(bodyA.restitution, bodyB.restitution);
    let j = -(1 + e) * velAlongNormal;
    j /= (bodyA.invMass + bodyB.invMass);

    const impulse = vec2.mul(normal, j);
    if (!bodyA.isStatic) bodyA.velocity = vec2.sub(bodyA.velocity, vec2.mul(impulse, bodyA.invMass));
    if (!bodyB.isStatic) bodyB.velocity = vec2.add(bodyB.velocity, vec2.mul(impulse, bodyB.invMass));

    // 更新最后一个事件的冲量大小
    if (this.currentEvents.length > 0) {
      const lastEvent = this.currentEvents[this.currentEvents.length - 1];
      if (lastEvent.type === 'collision') {
        lastEvent.impulse = j;
      }
    }
  }

  step(dt: number, subSteps: number = 10): PhysicsEvent[] {
    const subDt = dt / subSteps;
    const allStepEvents: PhysicsEvent[] = [];
    
    for (let i = 0; i < subSteps; i++) {
      this.currentEvents = [];
      this.integrate(subDt);
      for (let i = 0; i < this.bodies.length; i++) {
        for (let j = i + 1; j < this.bodies.length; j++) {
          const bodyA = this.bodies[i];
          const bodyB = this.bodies[j];
          
          if (!this.shouldCollide(bodyA, bodyB)) continue;

          // 基础 CCD 实现：针对 isBullet 物体，在子步内进行射线扫掠检测
          if (bodyA.isBullet || bodyB.isBullet) {
            const bullet = bodyA.isBullet ? bodyA : bodyB;
            const target = bodyA.isBullet ? bodyB : bodyA;
            
            // 计算本子步的位移
            const movement = vec2.mul(bullet.velocity, subDt);
            const ray: Ray = {
              start: bullet.position,
              end: vec2.add(bullet.position, movement)
            };
            
            const hit = this.raycastBody(ray, target);
            if (hit) {
              // 发生扫掠碰撞，立即修正位置并解决碰撞
              bullet.position = hit.point;
              const manifold = this.detectCollision(bodyA, bodyB);
              if (manifold) this.resolveCollision(manifold);
              continue;
            }
          }

          const manifold = this.detectCollision(bodyA, bodyB);
          if (manifold) this.resolveCollision(manifold);
        }
      }
      allStepEvents.push(...this.currentEvents);
    }
    return allStepEvents;
  }

  loadFrame(data: Float32Array, bodyIds: string[]) {
    this.bodies = PhysicalDataCompressor.decodeFrame(data, bodyIds);
  }

  /**
   * 射线投射检测
   * 返回射线击中的第一个物体信息
   */
  raycast(ray: Ray): RaycastHit | null {
    let closestHit: RaycastHit | null = null;
    let minFraction = 1.0;

    for (const body of this.bodies) {
      const hit = this.raycastBody(ray, body);
      if (hit && hit.fraction < minFraction) {
        minFraction = hit.fraction;
        closestHit = hit;
      }
    }

    return closestHit;
  }

  private raycastBody(ray: Ray, body: RigidBody): RaycastHit | null {
    if (body.shapeType === 'circle') {
      return this.raycastCircle(ray, body);
    } else {
      return this.raycastPolygon(ray, body);
    }
  }

  private raycastCircle(ray: Ray, circle: RigidBody): RaycastHit | null {
    const s = vec2.sub(ray.start, circle.position);
    const d = vec2.sub(ray.end, ray.start);
    const r = circle.radius;

    const a = vec2.dot(d, d);
    const b = 2 * vec2.dot(s, d);
    const c = vec2.dot(s, s) - r * r;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t1 >= 0 && t1 <= 1) {
      const hitPoint = vec2.add(ray.start, vec2.mul(d, t1));
      return {
        bodyId: circle.id,
        point: hitPoint,
        normal: vec2.normalize(vec2.sub(hitPoint, circle.position)),
        fraction: t1
      };
    }

    return null;
  }

  private raycastPolygon(ray: Ray, polygon: RigidBody): RaycastHit | null {
    const verts = this.getWorldVertices(polygon);
    let minT = 1.0;
    let hitNormal = { x: 0, y: 0 };
    let hasHit = false;

    for (let i = 0; i < verts.length; i++) {
      const p1 = verts[i];
      const p2 = verts[(i + 1) % verts.length];
      
      // 线段求交
      const hit = this.lineIntersection(ray.start, ray.end, p1, p2);
      if (hit && hit.t < minT) {
        minT = hit.t;
        hitNormal = vec2.normalize(vec2.perp(vec2.sub(p2, p1)));
        hasHit = true;
      }
    }

    if (hasHit) {
      return {
        bodyId: polygon.id,
        point: vec2.add(ray.start, vec2.mul(vec2.sub(ray.end, ray.start), minT)),
        normal: hitNormal,
        fraction: minT
      };
    }

    return null;
  }

  private lineIntersection(a1: Vector2, a2: Vector2, b1: Vector2, b2: Vector2) {
    const r = vec2.sub(a2, a1);
    const s = vec2.sub(b2, b1);
    const rxs = vec2.cross(r, s);
    const qpxr = vec2.cross(vec2.sub(b1, a1), r);

    if (rxs === 0) return null;

    const t = vec2.cross(vec2.sub(b1, a1), s) / rxs;
    const u = qpxr / rxs;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { t };
    }

    return null;
  }
}
