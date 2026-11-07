import SAT from 'sat';
import { BUILDINGS, HALL } from './templeData';

export const PLAYER_RADIUS = 0.5; // Avatar collision envelope includes robe/shoulder width.
type Solid = { id: string; x: number; z: number; w: number; d: number };
const solids: Solid[] = [
  { id: 'hall-left', x: -20, z: -62, w: 1.05, d: 24.5 },
  { id: 'hall-right', x: 20, z: -62, w: 1.05, d: 24.5 },
  { id: 'hall-back', x: 0, z: -74, w: 40.8, d: 1.05 },
  // Leave central stairs accessible; the raised foundation is not a walk-through wall.
  { id: 'foundation-left', x: -15, z: -62, w: 16, d: 30 },
  { id: 'foundation-right', x: 15, z: -62, w: 16, d: 30 },
  { id: 'altar', x: 0, z: -67, w: 13, d: 10 },
  { id: 'attendant-left', x: -7.2, z: -68.1, w: 4.35, d: 3.35 },
  { id: 'attendant-right', x: 7.2, z: -68.1, w: 4.35, d: 3.35 },
  // Double-size donation box mounted along the left inner wall of the main hall.
  { id: 'main-hall-donation-box', x: -18.445, z: -62, w: 2.5, d: 3.4 },
  { id: 'bell', x: 55, z: -112, w: 10, d: 10 },
  { id: 'tower', x: -55, z: -112, w: 10, d: 10 },
  { id: 'waterfall', x: -38, z: -12, w: 20, d: 17 },
  // Pond has an accessible bridge across its center, not walkable water.
  { id: 'pond-left', x: -8, z: 12, w: 14, d: 22 },
  { id: 'pond-right', x: 8, z: 12, w: 14, d: 22 },
  { id: 'release-pond', x: 28, z: 12, w: 18, d: 14 },
  // Perimeter walls: leave the central Tam Quan opening (x = -10..10) clear.
  { id: 'perimeter-back', x: 0, z: -185, w: 240, d: 1.8 },
  { id: 'perimeter-left', x: -120, z: -36.5, w: 1.8, d: 297 },
  { id: 'perimeter-right', x: 120, z: -36.5, w: 1.8, d: 297 },
  { id: 'perimeter-front-left', x: -65, z: 112, w: 110, d: 1.8 },
  { id: 'perimeter-front-right', x: 65, z: 112, w: 110, d: 1.8 },
];
for (const b of BUILDINGS) {
  solids.push(
    // Match the rendered wall panels, with a little extra thickness so a
    // moving avatar cannot clip through thin walls at high frame rates.
    { id: b.id + '-left', x: b.x - b.w / 2, z: b.z, w: 0.8, d: b.d + 0.3 },
    { id: b.id + '-right', x: b.x + b.w / 2, z: b.z, w: 0.8, d: b.d + 0.3 },
    { id: b.id + '-back', x: b.x, z: b.z - b.d / 2, w: b.w + 0.3, d: 0.8 },
    { id: b.id + '-front-left', x: b.x - b.w / 3, z: b.z + b.d / 2, w: b.w / 3 + 0.15, d: 0.8 },
    { id: b.id + '-front-right', x: b.x + b.w / 3, z: b.z + b.d / 2, w: b.w / 3 + 0.15, d: 0.8 },
  );
  if (b.kind === 'ancestral') solids.push({ id: 'ancestral-altar', x: b.x, z: b.z - 4, w: 10, d: 5 });
  // Guest-room beds are solid furniture; visitors must approach from the aisle.
  if (b.kind === 'guest') {
    for (const side of [-1, 1]) {
      solids.push({
        id: 'guest-bed-' + side,
        x: b.x + side * 7,
        z: b.z - 3,
        w: 4.2,
        d: 6.2,
      });
    }
  }
  // Library bookcases are solid furniture, not decorative walk-through meshes.
  if (b.kind === 'library') {
    for (const side of [-1, 1]) {
      solids.push({
        id: 'library-bookcase-' + side,
        x: b.x + side * 9,
        z: b.z - 2,
        w: 1.9,
        d: 8.3,
      });
    }
  }
}
for (const z of [24, 112]) for (const x of [-8, -3.6, 3.6, 8]) {
  solids.push({ id: 'gate-column', x, z, w: 1.25, d: 1.65 });
}
// Pavilion posts are solid in the rendered scene; prevent walking through them.
for (const x of [-7, -2.333, 2.333, 7]) for (const z of [47, 57]) {
  solids.push({ id: 'pavilion-post', x: 70 + x, z, w: 1.1, d: 1.1 });
}
for (let i = 0; i < 8; i++) for (const z of [-50, -74]) {
  solids.push({ id: 'hall-column', x: -19 + i * 38 / 7, z, w: 1.05, d: 1.05 });
}
// Meditation cushions are intentionally walkable so visitors can step onto them.
const polygons = solids.map(s => ({ ...s, shape: new SAT.Box(new SAT.Vector(s.x - s.w / 2, s.z - s.d / 2), s.w, s.d).toPolygon() }));
// Keep a respectful buffer around both Buddha statues. The main-hall altar
// is also solid, but this explicit statue volume protects the full seated form.
const statues = [
  new SAT.Circle(new SAT.Vector(0, -68.5), 3.8),
  new SAT.Circle(new SAT.Vector(0, -155), 2.8),
];
const visitor = new SAT.Circle(new SAT.Vector(), PLAYER_RADIUS);
// Populated from the exact rendered forest positions by World before movement starts.
let treeTrunks: SAT.Circle[] = [];
export function setTreeCollisionPoints(points: [number, number, number][]) {
  treeTrunks = points.map(([x, z, scale]) => new SAT.Circle(new SAT.Vector(x, z), 0.42 * scale));
}
export function isBlocked(x: number, z: number) {
  visitor.pos.x = x; visitor.pos.y = z;
  // Foundation sides only impede entry from the outside, not usable hall floor.
  return polygons.some(s => {
    if (s.id.startsWith('foundation') && z < -47.4 && z > -73.1 && Math.abs(x) < 19.2) return false;
    return SAT.testCirclePolygon(visitor, s.shape);
  }) || statues.some(s => SAT.testCircleCircle(visitor, s)) || treeTrunks.some(s => SAT.testCircleCircle(visitor, s));
}
export function surfaceHeight(x: number, z: number) {
  // Existing cushions are walkable; support the avatar above their padded tops.
  for (const mx of [-12, -6, 0, 6, 12]) for (const mz of [-59.5, -55]) {
    if (Math.abs(x - mx) <= 1.06 && Math.abs(z - mz) <= 0.76) return HALL.floor + 0.35;
    if (Math.abs(x - mx) <= 1.175 && Math.abs(z - mz) <= 0.875) return HALL.floor + 0.29;
  }
  // The eight raised stepping stones in the meditation garden are real walkable
  // surfaces, matching Garden() in TempleCampus.tsx (garden origin -104, 25).
  for (let i = 0; i < 8; i++) {
    const sx = -104 + Math.sin(i * 0.42) * 2.1;
    const sz = 37 - i * 2.15;
    const radius = 0.72 + (i % 3) * 0.12;
    if (Math.hypot(x - sx, z - sz) <= radius * 0.82) return 0.34;
  }
  if (Math.abs(x - HALL.x) < HALL.halfW && z <= -47 && z >= -77) return HALL.floor;
  // Three 0.4m treads match the visible main-hall staircase exactly.
  if (Math.abs(x) < 7 && z <= -44 && z > -47) return z <= -46 ? 1.2 : z <= -45 ? 0.8 : 0.4;
  if (Math.abs(x) < 1.6 && z > 0 && z < 24) return 0.45 + Math.sin((z + 26) / 24 * Math.PI) * 1.1;
  for (const b of BUILDINGS) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return 0.3;
  if (Math.abs(x - 70) < 8 && Math.abs(z - 52) < 6) return 0.6;
  return 0;
}

export function moveVisitor(p: { x: number; z: number; y: number }, dx: number, dz: number) {
  const startX = p.x, startZ = p.z;
  // Small swept substeps prevent high-speed tunneling even with unusually large caller delta.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.025));
  for (let i = 0; i < steps; i++) {
    if (!isBlocked(p.x + dx / steps, p.z)) p.x += dx / steps;
    if (!isBlocked(p.x, p.z + dz / steps)) p.z += dz / steps;
  }
  p.y = surfaceHeight(p.x, p.z);
  return Math.hypot(p.x - startX, p.z - startZ) > 0.0001;
}