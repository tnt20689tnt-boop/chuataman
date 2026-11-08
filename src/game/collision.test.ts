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
  it('keeps visitors out of water while allowing the stone bridge', () => {
    expect(isBlocked(8, 11)).toBe(true); // Lotus pond water.
    expect(isBlocked(0, 11)).toBe(false); // Clear stone bridge corridor.
    expect(surfaceHeight(0, 11)).toBeCloseTo(1.4663);
  });
  it('blocks new building walls but leaves their central doors open', () => {
    expect(isBlocked(29.5, -15)).toBe(true); // Left wall of the guest house.
    expect(isBlocked(42, -7)).toBe(false); // Central doorway of the guest house.
    expect(isBlocked(42, -23)).toBe(true); // Back wall of the guest house.
  });
  it('does not report walking when pressed into a solid gate column', () => {
    const p = { x: 3.6, z: 25.13, y: 0, rot: Math.PI };
    expect(stepPlayer(p, { fwd: 1, right: 0, run: false }, 0, 0.05)).toBe(false);
  });
  it('uses responsive walking and running speeds for the enlarged 2.2 m avatar', () => {
    expect(MOVE.SPEED).toBeGreaterThanOrEqual(2.2);
    expect(MOVE.SPEED).toBeLessThanOrEqual(2.6);
    expect(MOVE.RUN).toBeGreaterThanOrEqual(4.5);
    expect(MOVE.RUN).toBeLessThanOrEqual(5.8);
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
