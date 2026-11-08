import { useMemo } from "react";
import { Forest } from "./Architecture";

type ForestPoint = [x: number, z: number, scale: number];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Keep the temple silhouette open: the approved site plan uses a green tree
// perimeter, not enclosing mountain ridges or waterfalls.
function createPerimeterForest(existing: ForestPoint[]): ForestPoint[] {
  const random = seededRandom(7281);
  const points: ForestPoint[] = [];
  const add = (x: number, z: number) => {
    const point: ForestPoint = [
      x + (random() - 0.5) * 4,
      z + (random() - 0.5) * 4,
      0.72 + random() * 0.3,
    ];
    if (existing.some(([otherX, otherZ]) => Math.hypot(otherX - point[0], otherZ - point[1]) < 8)) return;
    if (points.some(([otherX, otherZ]) => Math.hypot(otherX - point[0], otherZ - point[1]) < 5.5)) return;
    points.push(point);
  };

  // Northern tree belt behind the rear wall.
  for (let row = 0; row < 4; row++) {
    const z = -204 - row * 9;
    for (let x = -190; x <= 190; x += 10) add(x, z);
  }
  // Side tree belts outside the enclosure; all internal paths remain clear.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 26; row++) {
      const z = -174 + row * 11;
      for (let column = 0; column < 3; column++) add(side * (137 + column * 10), z);
    }
  }
  // Southern trees frame, but never close, the Tam Quan entrance.
  for (let row = 0; row < 3; row++) {
    const z = 128 + row * 10;
    for (let x = -190; x <= 190; x += 10) {
      if (Math.abs(x) < 27) continue;
      add(x, z);
    }
  }
  return points;
}

export function SacredLandscape({ existingTrees }: { existingTrees: ForestPoint[] }) {
  const trees = useMemo(() => createPerimeterForest(existingTrees), [existingTrees]);
  return <group name="Hàng cây xanh bao quanh Chùa Tâm An">
    <Forest points={trees} />
  </group>;
}
