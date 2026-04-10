import { RigidBody, Vector2 } from './types';

export function createRect(id: string, x: number, y: number, w: number, h: number, options: Partial<RigidBody> = {}): RigidBody {
  const mass = options.isStatic ? 0 : (options.mass || w * h * 0.001);
  return {
    id,
    shapeType: 'polygon',
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
    radius: Math.sqrt(w * w + h * h) / 2,
    isStatic: options.isStatic || false,
    ...options
  };
}

export function createCircle(id: string, x: number, y: number, radius: number, options: Partial<RigidBody> = {}): RigidBody {
  const mass = options.isStatic ? 0 : (options.mass || Math.PI * radius * radius * 0.001);
  const inertia = options.isStatic ? 0 : (0.5 * mass * radius * radius);
  return {
    id,
    shapeType: 'circle',
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
    vertices: [],
    radius,
    isStatic: options.isStatic || false,
    ...options
  };
}

export function createRegularPolygon(id: string, x: number, y: number, sides: number, radius: number, options: Partial<RigidBody> = {}): RigidBody {
  const vertices: Vector2[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  const mass = options.isStatic ? 0 : (options.mass || (sides * radius * radius * Math.sin(Math.PI * 2 / sides) / 2) * 0.001);
  const inertia = options.isStatic ? 0 : (0.5 * mass * radius * radius);
  return {
    id,
    shapeType: 'polygon',
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
    radius,
    isStatic: options.isStatic || false,
    ...options
  };
}
