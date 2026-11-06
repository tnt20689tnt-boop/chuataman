import SAT from 'sat';
import { BUILDINGS, HALL } from './templeData';

export const PLAYER_RADIUS = 0.36;
type Solid = { id: string; x: number; z: number; w: number; d: number };
const solids: Solid[] = [
  { id: 'hall-left', x: -20, z: -62, w: 0.8, d: 24 },
  { id: 'hall-right', x: 20, z: -62, w: 0.8, d: 24 },
  { id: 'hall-back', x: 0, z: -74, w: 40, d: 0.8 },
  // Leave central stairs accessible; the raised foundation is not a walk-through wall.
  { id: 'foundation-left', x: -15, z: -62, w: 16, d: 30 },
  { id: 'foundation-right', x: 15, z: -62, w: 16, d: 30 },
  { id: 'altar', x: 0, z: -67, w: 13, d: 10 },
  { id: 'bell', x: -55, z: -52, w: 10, d: 10 },
  { id: 'tower', x: 50, z: -62, w: 10, d: 10 },
  { id: 'waterfall', x: 76, z: -32, w: 20, d: 17 },
  // Pond has an accessible bridge across its center, not walkable water.
  { id: 'pond-left', x: 68, z: -14, w: 14, d: 22 },
  { id: 'pond-right', x: 84, z: -14, w: 14, d: 22 },
  { id: 'release-pond', x: 100, z: -20, w: 18, d: 14 },
];
for (const b of BUILDINGS) {
  solids.push(
    { id: b.id + '-left', x: b.x - b.w / 2, z: b.z, w: 0.5, d: b.d },
    { id: b.id + '-right', x: b.x + b.w / 2, z: b.z, w: 0.5, d: b.d },
    { id: b.id + '-back', x: b.x, z: b.z - b.d / 2, w: b.w, d: 0.5 },
    { id: b.id + '-front-left', x: b.x - b.w / 3, z: b.z + b.d / 2, w: b.w / 3, d: 0.5 },
    { id: b.id + '-front-right', x: b.x + b.w / 3, z: b.z + b.d / 2, w: b.w / 3, d: 0.5 },
  );
  if (b.kind === 'ancestral') solids.push({ id: 'ancestral-altar', x: b.x, z: b.z - 4, w: 10, d: 5 });
}
for (const z of [24, 112]) for (const x of [-8, -3.6, 3.6, 8]) {
  solids.push({ id: 'gate-column', x, z, w: 1.1, d: 1.5 });
}
for (let i = 0; i < 8; i++) for (const z of [-50, -74]) {
  solids.push({ id: 'hall-column', x: -19 + i * 38 / 7, z, w: 0.8, d: 0.8 });
}
const polygons = solids.map(s => ({ ...s, shape: new SAT.Box(new SAT.Vector(s.x - s.w / 2, s.z - s.d / 2), s.w, s.d).toPolygon() }));
const statues = [new SAT.Circle(new SAT.Vector(-86, 20), 2.5)];
const visitor = new SAT.Circle(new SAT.Vector(), PLAYER_RADIUS);
export function isBlocked(x: number, z: number) {
  visitor.pos.x = x; visitor.pos.y = z;
  // Foundation sides only impede entry from the outside, not usable hall floor.
  return polygons.some(s => {
    if (s.id.startsWith('foundation') && z < -47.4 && z > -73.1 && Math.abs(x) < 19.2) return false;
    return SAT.testCirclePolygon(visitor, s.shape);
  }) || statues.some(s => SAT.testCircleCircle(visitor, s));
}
export function surfaceHeight(x: number, z: number) {
  if (Math.abs(x - HALL.x) < HALL.halfW && z <= -47 && z >= -77) return HALL.floor;
  // Three 0.4m treads match the visible main-hall staircase exactly.
  if (Math.abs(x) < 7 && z <= -44 && z > -47) return z <= -46 ? 1.2 : z <= -45 ? 0.8 : 0.4;
  if (Math.abs(x - 76) < 1.6 && z > -26 && z < -2) return 0.45 + Math.sin((z + 26) / 24 * Math.PI) * 1.1;
  for (const b of BUILDINGS) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return 0.3;
  if (Math.abs(x - 70) < 8 && Math.abs(z - 52) < 6) return 0.6;
  return 0;
}

export function moveVisitor(p: { x: number; z: number; y: number }, dx: number, dz: number) {
  const startX = p.x, startZ = p.z;
  // Small swept substeps prevent high-speed tunneling even with unusually large caller delta.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  for (let i = 0; i < steps; i++) {
    if (!isBlocked(p.x + dx / steps, p.z)) p.x += dx / steps;
    if (!isBlocked(p.x, p.z + dz / steps)) p.z += dz / steps;
  }
  p.y = surfaceHeight(p.x, p.z);
  return Math.hypot(p.x - startX, p.z - startZ) > 0.0001;
}