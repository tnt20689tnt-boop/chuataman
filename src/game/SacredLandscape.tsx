import { useMemo } from "react";
import * as THREE from "three";
import { Forest, Waterfall } from "./Architecture";

type ForestPoint = [x: number, z: number, scale: number];
type RidgeConfig = {
  id: string;
  position: [number, number, number];
  rotationY: number;
  width: number;
  depth: number;
  height: number;
  seed: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createRidgeGeometry(width: number, depth: number, height: number, seed: number) {
  const random = seededRandom(seed);
  const segments = 48;
  const rows = [
    { z: 0.5, height: 0 },
    { z: 0.22, height: 0.36 },
    { z: 0.02, height: 1 },
    { z: -0.24, height: 0.4 },
    { z: -0.5, height: 0 },
  ];
  const peaks = Array.from({ length: 7 }, (_, index) => ({
    center: (index + 0.25 + random() * 0.5) / 7,
    width: 0.045 + random() * 0.065,
    weight: 0.55 + random() * 0.45,
  }));
  const columns = segments + 1;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const low = new THREE.Color("#354f3d");
  const middle = new THREE.Color("#56734d");
  const high = new THREE.Color("#84907a");

  for (let row = 0; row < rows.length; row++) {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const edge = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.62);
      const peak = peaks.reduce((max, point) => {
        const distance = (t - point.center) / point.width;
        return Math.max(max, point.weight * Math.exp(-distance * distance));
      }, 0);
      const irregularity = 0.94 + random() * 0.12;
      const profile = (0.22 + peak * 0.78) * edge * irregularity;
      const localHeight = height * profile * rows[row]!.height;
      positions.push((t - 0.5) * width, localHeight, rows[row]!.z * depth);

      const altitude = THREE.MathUtils.clamp(localHeight / Math.max(height, 1), 0, 1);
      const color =
        altitude < 0.56
          ? low.clone().lerp(middle, altitude / 0.56)
          : middle.clone().lerp(high, (altitude - 0.56) / 0.44);
      color.multiplyScalar(0.94 + random() * 0.12);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let row = 0; row < rows.length - 1; row++) {
    for (let i = 0; i < segments; i++) {
      const a = row * columns + i;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      if ((row + i) % 2 === 0) indices.push(a, c, d, a, d, b);
      else indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function MountainRidge({ config }: { config: RidgeConfig }) {
  const geometry = useMemo(
    () => createRidgeGeometry(config.width, config.depth, config.height, config.seed),
    [config.width, config.depth, config.height, config.seed],
  );
  return (
    <mesh
      name={`Dãy núi thiêng ${config.id}`}
      geometry={geometry}
      position={config.position}
      rotation-y={config.rotationY}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial vertexColors flatShading roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function createPerimeterForest(existing: ForestPoint[]): ForestPoint[] {
  const random = seededRandom(7281);
  const points: ForestPoint[] = [];
  const falls = [
    [-82, -198],
    [82, -198],
  ] as const;
  const add = (x: number, z: number) => {
    const point: ForestPoint = [
      x + (random() - 0.5) * 6,
      z + (random() - 0.5) * 6,
      0.72 + random() * 0.3,
    ];
    if (existing.some(([otherX, otherZ]) => Math.hypot(otherX - point[0], otherZ - point[1]) < 8))
      return;
    if (falls.some(([fallX, fallZ]) => Math.hypot(fallX - point[0], fallZ - point[1]) < 17)) return;
    if (points.some(([otherX, otherZ]) => Math.hypot(otherX - point[0], otherZ - point[1]) < 5.5))
      return;
    points.push(point);
  };

  // A dense northern tree line sits behind the enclosure wall and frames both falls.
  for (let row = 0; row < 4; row++) {
    const z = -197 - row * 9;
    for (let x = -190; x <= 190; x += 10) add(x, z);
  }

  // Tree rows outside the east and west walls keep the central court clear.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 25; row++) {
      const z = -174 + row * 11.2;
      for (let column = 0; column < 3; column++) add(side * (133 + column * 10), z);
    }
  }

  // The southern tree belt parts around the ceremonial approach to Tam Quan.
  for (let row = 0; row < 3; row++) {
    const z = 124 + row * 10;
    for (let x = -190; x <= 190; x += 10) {
      if (Math.abs(x) < 27) continue;
      add(x, z);
    }
  }

  return points;
}

const RIDGES: RidgeConfig[] = [
  {
    id: "Bắc xa",
    position: [0, 0, -318],
    rotationY: 0,
    width: 455,
    depth: 150,
    height: 98,
    seed: 17,
  },
  {
    id: "Bắc gần",
    position: [0, 0, -252],
    rotationY: 0,
    width: 390,
    depth: 116,
    height: 67,
    seed: 31,
  },
  {
    id: "Đông",
    position: [252, 0, -34],
    rotationY: Math.PI / 2,
    width: 390,
    depth: 110,
    height: 76,
    seed: 47,
  },
  {
    id: "Tây",
    position: [-252, 0, -34],
    rotationY: -Math.PI / 2,
    width: 390,
    depth: 110,
    height: 76,
    seed: 59,
  },
  {
    id: "Nam",
    position: [0, 0, 225],
    rotationY: Math.PI,
    width: 360,
    depth: 94,
    height: 55,
    seed: 73,
  },
];

export function SacredLandscape({ existingTrees }: { existingTrees: ForestPoint[] }) {
  const trees = useMemo(() => createPerimeterForest(existingTrees), [existingTrees]);
  return (
    <group name="Rừng và núi thiêng bao quanh Chùa Tâm An">
      {RIDGES.map((config) => (
        <MountainRidge key={config.id} config={config} />
      ))}
      <Forest points={trees} />
      {[-82, 82].map((x) => (
        <group key={x} position={[x, 0, -198]} scale={[1.75, 2.2, 1.4]}>
          <Waterfall position={[0, 0, 0]} />
        </group>
      ))}
    </group>
  );
}
