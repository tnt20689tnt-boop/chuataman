import { describe, it, expect } from 'vitest';
import { isBlocked, moveVisitor, surfaceHeight } from './collision';
import { stepPlayer } from './sim';

describe('PR9 visitor access', () => {
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
    expect(isBlocked(-86, 20)).toBe(true);
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
    expect(isBlocked(70, -10)).toBe(true);
    expect(isBlocked(76, -10)).toBe(false);
    expect(surfaceHeight(76, -14)).toBeCloseTo(1.55);
  });
  it('blocks new building walls but leaves their central doors open', () => {
    expect(isBlocked(-82, -15)).toBe(true);
    expect(isBlocked(-70, -6)).toBe(false);
    expect(isBlocked(0, -109.5)).toBe(true);
  });
  it('does not report walking when pressed into a solid gate column', () => {
    const p = { x: 3.6, z: 25.13, y: 0, rot: Math.PI };
    expect(stepPlayer(p, { fwd: 1, right: 0, run: false }, 0, 0.05)).toBe(false);
  });
  it('reports raised floor heights used by remote avatars', () => {
    expect(surfaceHeight(0, -50)).toBe(1.2);
    expect(surfaceHeight(-70, -15)).toBe(0.3);
    expect(surfaceHeight(40, -90)).toBe(0);
  });

});