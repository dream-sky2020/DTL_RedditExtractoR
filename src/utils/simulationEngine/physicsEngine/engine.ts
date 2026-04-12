import { RigidBody, Vector2, vec2, CollisionManifold, Derivative, State, PhysicsEvent, Ray, RaycastHit } from './types';
import { PhysicalDataCompressor } from './compressor';

export class PhysicsEngine {
  bodies: RigidBody[] = [];
  gravity: Vector2 = { x: 0, y: 9.81 * 100 };
  currentEvents: PhysicsEvent[] = [];

  // 睡眠参数
  private readonly SLEEP_EPSILON = 0.5; // 动能阈值
  private readonly SLEEP_TIME_THRESHOLD = 1.0; // 进入睡眠所需的静止时间 (秒)

  addBody(body: RigidBody) {
    body.isSleeping = false;
    body.sleepTimer = 0;
    body.motionHistory = [];
    this.bodies.push(body);
  }

  private shouldCollide(bodyA: RigidBody, bodyB: RigidBody): boolean {
    // 如果两个物体都在睡眠，不检测碰撞
    if (bodyA.isSleeping && bodyB.isSleeping) return false;
    
    if (!bodyA.collisionFilter || !bodyB.collisionFilter) return true;
    const canACollideWithB = (bodyA.collisionFilter.mask & bodyB.collisionFilter.category) !== 0;
    const canBCollideWithA = (bodyB.collisionFilter.mask & bodyA.collisionFilter.category) !== 0;
    return canACollideWithB && canBCollideWithA;
  }

  private wakeBody(body: RigidBody) {
    if (body.isStatic) return;
    body.isSleeping = false;
    body.sleepTimer = 0;
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
      // 如果物体被标记为拖拽中或锁定，跳过物理模拟
      if (body.isStatic || body.isSleeping || (body as any).isDragging) continue;

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

      // 更新睡眠计时器
      const motion = vec2.magSq(body.velocity) + body.angularVelocity * body.angularVelocity;
      if (motion < this.SLEEP_EPSILON) {
        body.sleepTimer = (body.sleepTimer || 0) + dt;
        if (body.sleepTimer >= this.SLEEP_TIME_THRESHOLD) {
          body.isSleeping = true;
          body.velocity = { x: 0, y: 0 };
          body.angularVelocity = 0;
        }
      } else {
        body.sleepTimer = 0;
      }
    }
  }

  detectCollision(bodyA: RigidBody, bodyB: RigidBody): CollisionManifold | null {
    if (bodyA.shapeType === 'circle' && bodyB.shapeType === 'circle') {
      return this.collideCircles(bodyA, bodyB);
    } else if (bodyA.shapeType === 'circle' || bodyB.shapeType === 'circle') {
      const circle = bodyA.shapeType === 'circle' ? bodyA : bodyB;
      const polygon = bodyA.shapeType === 'circle' ? bodyB : bodyA;
      const manifold = this.collideCirclePolygon(circle, polygon);
      if (manifold && bodyA.shapeType !== 'circle') {
        const temp = manifold.bodyA;
        manifold.bodyA = manifold.bodyB;
        manifold.bodyB = temp;
        manifold.normal = vec2.mul(manifold.normal, -1);
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
    const penetration = radiusSum - dist;
    const contact = vec2.add(bodyA.position, vec2.mul(normal, bodyA.radius - penetration * 0.5));
    return { bodyA, bodyB, normal, penetration, contacts: [contact] };
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
    if (vec2.dot(d, collisionNormal) < 0) collisionNormal = vec2.mul(collisionNormal, -1);
    const contact = vec2.add(circle.position, vec2.mul(collisionNormal, circle.radius - minOverlap * 0.5));
    return { bodyA: circle, bodyB: polygon, normal: collisionNormal, penetration: minOverlap, contacts: [contact] };
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
    if (vec2.dot(d, collisionNormal) < 0) collisionNormal = vec2.mul(collisionNormal, -1);

    const contacts: Vector2[] = [];
    for (const v of vertsA) if (this.isPointInPolygon(v, vertsB)) contacts.push(v);
    for (const v of vertsB) if (this.isPointInPolygon(v, vertsA)) contacts.push(v);

    return { bodyA, bodyB, normal: collisionNormal, penetration: minOverlap, contacts: contacts.slice(0, 2) };
  }

  private isPointInPolygon(p: Vector2, verts: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      if (((verts[i].y > p.y) !== (verts[j].y > p.y)) &&
          (p.x < (verts[j].x - verts[i].x) * (p.y - verts[i].y) / (verts[j].y - verts[i].y) + verts[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }

  resolveCollision(manifold: CollisionManifold) {
    const { bodyA, bodyB, normal, penetration, contacts } = manifold;

    // 唤醒睡眠中的物体
    if (!bodyA.isStatic && bodyA.isSleeping) this.wakeBody(bodyA);
    if (!bodyB.isStatic && bodyB.isSleeping) this.wakeBody(bodyB);

    this.currentEvents.push({
      type: 'collision',
      bodyAId: bodyA.id,
      bodyBId: bodyB.id,
      point: contacts.length > 0 ? { ...contacts[0] } : { ...bodyA.position },
      normal: { ...normal },
      impulse: 0
    });

    if (bodyA.isSensor || bodyB.isSensor) return;

    const percent = 0.2; 
    const slop = 0.01;
    const correction = vec2.mul(normal, (Math.max(penetration - slop, 0) / (bodyA.invMass + bodyB.invMass)) * percent);
    if (!bodyA.isStatic) bodyA.position = vec2.sub(bodyA.position, vec2.mul(correction, bodyA.invMass));
    if (!bodyB.isStatic) bodyB.position = vec2.add(bodyB.position, vec2.mul(correction, bodyB.invMass));

    if (contacts.length === 0) {
      const rv = vec2.sub(bodyB.velocity, bodyA.velocity);
      const velAlongNormal = vec2.dot(rv, normal);
      if (velAlongNormal > 0) return;
      const e = Math.min(bodyA.restitution, bodyB.restitution);
      let j = -(1 + e) * velAlongNormal / (bodyA.invMass + bodyB.invMass);
      const impulse = vec2.mul(normal, j);
      if (!bodyA.isStatic) bodyA.velocity = vec2.sub(bodyA.velocity, vec2.mul(impulse, bodyA.invMass));
      if (!bodyB.isStatic) bodyB.velocity = vec2.add(bodyB.velocity, vec2.mul(impulse, bodyB.invMass));
      return;
    }

    for (const contact of contacts) {
      const ra = vec2.sub(contact, bodyA.position);
      const rb = vec2.sub(contact, bodyB.position);
      const rv = vec2.sub(
        vec2.add(bodyB.velocity, vec2.perpMul(rb, bodyB.angularVelocity)),
        vec2.add(bodyA.velocity, vec2.perpMul(ra, bodyA.angularVelocity))
      );

      const contactVel = vec2.dot(rv, normal);
      if (contactVel > 0) continue;

      const raCrossN = vec2.cross(ra, normal);
      const rbCrossN = vec2.cross(rb, normal);
      const invMassSum = bodyA.invMass + bodyB.invMass + 
                         (raCrossN * raCrossN) * bodyA.invInertia + 
                         (rbCrossN * rbCrossN) * bodyB.invInertia;

      const e = Math.min(bodyA.restitution, bodyB.restitution);
      let j = -(1 + e) * contactVel / invMassSum / contacts.length;
      const impulse = vec2.mul(normal, j);
      this.applyImpulse(bodyA, bodyB, impulse, ra, rb);

      const tangent = vec2.normalize(vec2.sub(rv, vec2.mul(normal, vec2.dot(rv, normal))));
      if (vec2.magSq(tangent) > 0.0001) {
        const raCrossT = vec2.cross(ra, tangent);
        const rbCrossT = vec2.cross(rb, tangent);
        const invMassSumT = bodyA.invMass + bodyB.invMass + 
                           (raCrossT * raCrossT) * bodyA.invInertia + 
                           (rbCrossT * rbCrossT) * bodyB.invInertia;
        const jt = -vec2.dot(rv, tangent) / invMassSumT / contacts.length;
        const mu = Math.sqrt(bodyA.staticFriction * bodyB.staticFriction);
        const frictionImpulse = Math.abs(jt) < j * mu ? vec2.mul(tangent, jt) : vec2.mul(tangent, -j * mu);
        this.applyImpulse(bodyA, bodyB, frictionImpulse, ra, rb);
      }
    }
  }

  private applyImpulse(bodyA: RigidBody, bodyB: RigidBody, impulse: Vector2, ra: Vector2, rb: Vector2) {
    if (!bodyA.isStatic) {
      bodyA.velocity = vec2.sub(bodyA.velocity, vec2.mul(impulse, bodyA.invMass));
      bodyA.angularVelocity -= vec2.cross(ra, impulse) * bodyA.invInertia;
    }
    if (!bodyB.isStatic) {
      bodyB.velocity = vec2.add(bodyB.velocity, vec2.mul(impulse, bodyB.invMass));
      bodyB.angularVelocity += vec2.cross(rb, impulse) * bodyB.invInertia;
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

          if (bodyA.isBullet || bodyB.isBullet) {
            const bullet = bodyA.isBullet ? bodyA : bodyB;
            const target = bodyA.isBullet ? bodyB : bodyA;
            const movement = vec2.mul(bullet.velocity, subDt);
            const ray: Ray = { start: bullet.position, end: vec2.add(bullet.position, movement) };
            const hit = this.raycastBody(ray, target);
            if (hit) {
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
   * 查找包含指定点的物体
   */
  getBodyAtPoint(point: Vector2): RigidBody | null {
    // 从后往前找，优先选中最上层的物体
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i];
      if (body.shapeType === 'circle') {
        const distSq = vec2.magSq(vec2.sub(point, body.position));
        if (distSq <= body.radius * body.radius) return body;
      } else {
        const verts = this.getWorldVertices(body);
        if (this.isPointInPolygon(point, verts)) return body;
      }
    }
    return null;
  }

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
    if (body.shapeType === 'circle') return this.raycastCircle(ray, body);
    return this.raycastPolygon(ray, body);
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
      return { bodyId: circle.id, point: hitPoint, normal: vec2.normalize(vec2.sub(hitPoint, circle.position)), fraction: t1 };
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
      const hit = this.lineIntersection(ray.start, ray.end, p1, p2);
      if (hit && hit.t < minT) {
        minT = hit.t;
        hitNormal = vec2.normalize(vec2.perp(vec2.sub(p2, p1)));
        hasHit = true;
      }
    }
    if (hasHit) return { bodyId: polygon.id, point: vec2.add(ray.start, vec2.mul(vec2.sub(ray.end, ray.start), minT)), normal: hitNormal, fraction: minT };
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
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t };
    return null;
  }
}
