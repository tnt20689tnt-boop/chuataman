import { describe, it, expect } from 'vitest';
import { isBlocked, moveVisitor, surfaceHeight } from './collision';
import { MOVE, stepPlayer } from './sim';

describe('PR9 visitor access', () => {
  it('keeps both attendant plinths solid', () => {
    expect(isBlocked(-7.2, -68.1)).toBe(true);
    expect(isBlocked(7.2, -68.1)).toBe(true);
  });
  it('supports visitors on meditation mats without closing the walking aisles', () => {
    expect(surfaceHeight(0, -59.5)).toBeCloseTo(1.55);
    expect(isBlocked(0, -59.5)).toBe(false);
    expect(surfaceHeight(3, -55)).toBe(1.2);
    expect(isBlocked(3, -55)).toBe(false);
  });
  it('cannot walk through main hall walls', () => {
    const p = { x: 18, z: -55, y: 1.2 };
    moveVisitor(p, 8, 0);
    expect(p.x).toBeLessThan(19.3);
    expect(isBlocked(20, -55)).toBe(true);
  });
  it('protects Buddha and altar worship space', () => {
    const p = { x: 0, z: -58, y: 1.2 };
    moveVisitor(p, 0, -20);
    expect(p.z).toBeGreaterThan(-62);
    expect(isBlocked(0, -68.5)).toBe(true);
    expect(isBlocked(0, -155)).toBe(true); // Outdoor Buddha in the meditation garden.
  });
  it('keeps the walkable approach open between the main hall and rear Buddha', () => {
    expect(isBlocked(0, -140)).toBe(false);
    expect(isBlocked(0, -165)).toBe(false);
    expect(isBlocked(0, -176.9)).toBe(true); // Waterfall basin is behind the Buddha, at the rear edge.
    const visitor = { x: 0, z: -140, y: 0 };
    moveVisitor(visitor, 0, -25);
    expect(visitor.z).toBeGreaterThan(-152); // Stops respectfully at the Buddha plinth.
    expect(visitor.z).toBeLessThan(-145.5); // Larger statue keeps a wider respectful buffer.
  });
  it('follows each of the three visible staircase treads', () => {
    expect(surfaceHeight(0, -43.9)).toBe(0);
    expect(surfaceHeight(0, -44.5)).toBe(0.4);
    expect(surfaceHeight(0, -45.5)).toBe(0.8);
    expect(surfaceHeight(0, -46.5)).toBe(1.2);
    const p = { x: 0, z: -43, y: 0 };
    moveVisitor(p, 0, -7);
    expect(p.z).toBeCloseTo(-50);
    expect(p.y).toBe(1.2);
  });
  it('follows the three rendered Bảo Tháp entry steps', () => {
    expect(surfaceHeight(-55, -106.3)).toBeCloseTo(1.02);
    expect(surfaceHeight(-55, -105.48)).toBeCloseTo(0.68);
    expect(surfaceHeight(-55, -104.66)).toBeCloseTo(0.34);
    expect(isBlocked(-55, -106.3)).toBe(false);
  });
  it('blocks both lotus ponds while keeping the full stone bridge corridor open', () => {
    expect(isBlocked(-27, 52)).toBe(true); // Left pond water.
    expect(isBlocked(18, 52)).toBe(true); // Right pond, west of bridge.
    expect(isBlocked(38, 52)).toBe(true); // Right pond, east of bridge.
    expect(isBlocked(28, 52)).toBe(false); // Stone bridge corridor.
    expect(isBlocked(26.5, 52)).toBe(true); // West bridge rail.
    expect(isBlocked(29.5, 52)).toBe(true); // East bridge rail.
    expect(surfaceHeight(28, 52)).toBeCloseTo(1.55);
  });
  it('lets visitors cross the full 40m lotus bridge and both landings', () => {
    const visitor = { x: 28, z: 27, y: 0 };
    expect(isBlocked(28, 31)).toBe(false);
    expect(isBlocked(28, 52)).toBe(false);
    expect(isBlocked(28, 73)).toBe(false);
    moveVisitor(visitor, 0, 48);
    expect(visitor.z).toBeCloseTo(75);
    expect(visitor.x).toBeCloseTo(28);
  });
  it('keeps the central route and meditation garden approaches free of phantom pavilion posts', () => {
    expect(isBlocked(0, -20)).toBe(false);
    expect(isBlocked(-34, 39)).toBe(false);
    expect(isBlocked(-34, 24)).toBe(false);
    expect(isBlocked(-34, 9)).toBe(false);
  });
  it('keeps the center doorway open at the ancestral, meditation, lecture and guest rooms', () => {
    expect(isBlocked(-42, -52)).toBe(false);
    expect(isBlocked(-42, -5)).toBe(false);
    expect(isBlocked(42, -52)).toBe(false);
    expect(isBlocked(42, -5)).toBe(false);
  });
  it('steps up smoothly to the guest-room floor', () => {
    expect(surfaceHeight(42, -2.9)).toBeCloseTo(0.12);
    expect(surfaceHeight(42, -3.55)).toBeCloseTo(0.21);
    expect(surfaceHeight(42, -4.2)).toBeCloseTo(0.3);
  });
  it('allows walking past the former north edge to visit the rear Buddha', () => {
    const visitor = { x: 0, y: 0, z: -138, rot: Math.PI };
    expect(stepPlayer(visitor, { fwd: 1, right: 0, run: false }, 0, 1)).toBe(true);
    expect(visitor.z).toBeCloseTo(-143.8);
  });
  it('blocks new building walls but leaves their central doors open', () => {
    expect(isBlocked(29.5, -12)).toBe(true); // Left wall of the guest house.
    expect(isBlocked(42, -4)).toBe(false); // Central doorway of the guest house.
    expect(isBlocked(42, -21)).toBe(true); // Back wall of the guest house.
  });
  it('does not report walking when pressed into a solid gate column', () => {
    const p = { x: 3.6, z: 113.13, y: 0, rot: Math.PI };
    expect(stepPlayer(p, { fwd: 1, right: 0, run: false }, 0, 0.05)).toBe(false);
  });
  it('uses responsive walking and running speeds for the enlarged 2.2 m avatar', () => {
    expect(MOVE.SPEED).toBeGreaterThanOrEqual(5.6);
    expect(MOVE.SPEED).toBeLessThanOrEqual(6.0);
    expect(MOVE.RUN).toBeGreaterThanOrEqual(8.5);
    expect(MOVE.RUN).toBeLessThanOrEqual(9.5);
  });
  it('uses gait-matched walk and run world speeds at the tested movement timestep', () => {
    const walker = { x: 0, y: 0, z: 34, rot: Math.PI };
    const runner = { x: 0, y: 0, z: 34, rot: Math.PI };
    expect(stepPlayer(walker, { fwd: 1, right: 0, run: false }, 0, 0.05)).toBe(true);
    expect(stepPlayer(runner, { fwd: 1, right: 0, run: true }, 0, 0.05)).toBe(true);
    expect(34 - walker.z).toBeCloseTo(MOVE.SPEED * 0.05, 5);
    expect(34 - runner.z).toBeCloseTo(MOVE.RUN * 0.05, 5);
  });
  it('reports raised floor heights used by remote avatars', () => {
    expect(surfaceHeight(0, -50)).toBe(1.2);
    expect(surfaceHeight(-42, -15)).toBe(0.3);
    expect(surfaceHeight(40, -90)).toBe(0);
  });

});
