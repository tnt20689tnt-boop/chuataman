import { useMemo } from "react";
import { Forest } from "./Architecture";
import { WaterfallAmbience, WaterfallBirds, WaterfallKoi } from "./WaterfallNature";

type ForestPoint = [x: number, z: number, scale: number];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// The north end of the site is the sacred mountain backdrop from the reference
// plan: the temple axis leads to a large Buddha, waterfall and layered peaks.
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
  return <group name="Núi thiêng, thác nước và rừng bao quanh Chùa Tâm An">
    <group position={[0, 0, -198]} name="Dãy núi thiêng hậu cảnh">
      {([
        [-58, 23, -4, 34, 38],
        [-23, 31, 0, 42, 46],
        [18, 38, 4, 48, 54],
        [58, 25, -2, 36, 40],
      ] as const).map(([x, y, z, radius, height], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh scale={[1.2, 1, 0.72]} castShadow receiveShadow>
            <coneGeometry args={[radius, height, 7]} />
            <meshStandardMaterial color={i % 2 ? "#355b4a" : "#2d503f"} roughness={1} flatShading />
          </mesh>
          <mesh position={[0, height * 0.28, 1.6]} scale={[0.7, 0.42, 0.25]}>
            <coneGeometry args={[radius * 0.72, height * 0.34, 7]} />
            <meshStandardMaterial color="#70806a" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 13, 8]} scale={[1.25, 0.32, 0.5]}>
        <boxGeometry args={[96, 8, 12]} />
        <meshStandardMaterial color="#3f6651" roughness={1} />
      </mesh>
    </group>
    <Forest points={trees} />
    <WaterfallBirds />
    <WaterfallKoi />
    <WaterfallAmbience />
  </group>;
}
