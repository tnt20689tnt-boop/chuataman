// ============================================================================
// NATURE UPGRADE — thiên nhiên 3D Chùa Tâm An
//   • Forest: cây đa dạng dùng instanced mesh
//   • LotusField: lá sen khuyết, hoa nhiều tầng và chuyển động theo sóng
//   • PetalFall: cánh hoa rơi
//   • Fireflies: đom đóm ban đêm theo giờ Việt Nam
//   • Effects: Bloom + Vignette
// ============================================================================
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

type ForestPoint = [x: number, z: number, scale: number];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vietnamDaylight() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const hour = part("hour") + part("minute") / 60 + part("second") / 3600;
  const daylight = THREE.MathUtils.clamp((hour - 5.5) / 1.1, 0, 1) *
    (1 - THREE.MathUtils.clamp((hour - 17.2) / 1.1, 0, 1));
  return 1 - daylight;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const FOREST_TYPES = [0, 1, 2, 3, 4, 5];
const PINE = 1, SAKURA = 2, WILLOW = 3, CYPRESS = 4, GOLDEN = 5;

/** Instanced forest with varied silhouettes and a stable, deterministic layout. */
export function Forest({ points, seed = 20261108 }: { points: ForestPoint[]; seed?: number }) {
  const count = points.length;
  const trunkRef = useRef<THREE.InstancedMesh>(null!);
  const canopyRef = useRef<THREE.InstancedMesh>(null!);
  const pineRef = useRef<THREE.InstancedMesh>(null!);
  const layout = useMemo(() => {
    const rand = mulberry32(seed);
    return points.map(([x, z, scale], i) => ({
      x,
      z,
      s: scale * (0.78 + rand() * 0.5),
      type: FOREST_TYPES[(i + seed) % FOREST_TYPES.length],
      rot: rand() * Math.PI * 2,
      tall: 0.78 + rand() * 0.64,
      variation: rand(),
    }));
  }, [points, seed]);

  useLayoutEffect(() => {
    const trunks = trunkRef.current;
    const canopies = canopyRef.current;
    const pines = pineRef.current;
    if (!trunks || !canopies || !pines) return;
    let canopyIndex = 0;
    let pineIndex = 0;

    layout.forEach((tree, i) => {
      _dummy.position.set(tree.x, 1.3 * tree.tall * tree.s, tree.z);
      _dummy.rotation.set(0, tree.rot, (tree.variation - 0.5) * 0.12);
      const trunkWidth = tree.type === PINE ? 0.78 : tree.type === CYPRESS ? 0.6 : tree.type === WILLOW ? 1.24 : 1;
      _dummy.scale.set(tree.s * trunkWidth, tree.tall * tree.s, tree.s * trunkWidth);
      _dummy.updateMatrix();
      trunks.setMatrixAt(i, _dummy.matrix);
      _color.setHSL(0.055 + tree.variation * 0.04, 0.3, 0.23 + tree.variation * 0.1);
      trunks.setColorAt(i, _color);

      if (tree.type === PINE || tree.type === CYPRESS) {
        const widths = tree.type === CYPRESS ? [0.7, 0.52, 0.35] : [1, 0.72, 0.49];
        const heights = tree.type === CYPRESS ? [2.8, 4.25, 5.55] : [2.5, 3.85, 5];
        widths.forEach((width, tier) => {
          _dummy.position.set(tree.x, heights[tier] * tree.tall * tree.s, tree.z);
          _dummy.rotation.set(0, tree.rot + tier, 0);
          _dummy.scale.set(tree.s * width, tree.s * (0.92 - tier * 0.13) * tree.tall, tree.s * width);
          _dummy.updateMatrix();
          pines.setMatrixAt(pineIndex, _dummy.matrix);
          _color.setHSL(tree.type === CYPRESS ? 0.37 : 0.32, 0.46, 0.23 + tree.variation * 0.09);
          pines.setColorAt(pineIndex++, _color);
        });
        return;
      }

      const clusters: [number, number, number, number][] = tree.type === WILLOW
        ? [[0, 3.25, 0, 1.5], [-1.05, 2.65, 0.42, 1], [1.05, 2.58, -0.38, 1.02]]
        : tree.type === GOLDEN
          ? [[0, 3.7, 0, 1.28], [-0.95, 3, 0.35, 0.96], [0.9, 3.05, -0.42, 1.02]]
          : [[0, 3.5, 0, 1.35], [-0.85, 3.05, 0.3, 0.85], [0.8, 3.1, -0.35, 0.9]];
      clusters.forEach(([cx, cy, cz, size]) => {
        const cos = Math.cos(tree.rot), sin = Math.sin(tree.rot);
        _dummy.position.set(
          tree.x + (cx * cos - cz * sin) * tree.s,
          cy * tree.tall * tree.s,
          tree.z + (cx * sin + cz * cos) * tree.s,
        );
        _dummy.rotation.set(tree.variation * 0.6, tree.rot, tree.variation * 0.5);
        const flatness = tree.type === WILLOW ? 0.58 : 0.72 + tree.variation * 0.3;
        _dummy.scale.set(tree.s * size * (1 + tree.variation * 0.28), tree.s * size * flatness, tree.s * size);
        _dummy.updateMatrix();
        canopies.setMatrixAt(canopyIndex, _dummy.matrix);
        if (tree.type === SAKURA) _color.setHSL(0.95, 0.55, 0.76 + tree.variation * 0.1);
        else if (tree.type === GOLDEN) _color.setHSL(0.12, 0.65, 0.48 + tree.variation * 0.12);
        else if (tree.type === WILLOW) _color.setHSL(0.27, 0.4, 0.3 + tree.variation * 0.1);
        else _color.setHSL(0.29 + tree.variation * 0.08, 0.46, 0.27 + tree.variation * 0.13);
        canopies.setColorAt(canopyIndex++, _color);
      });
    });

    _dummy.position.set(0, -50, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = canopyIndex; i < count * 3; i++) canopies.setMatrixAt(i, _dummy.matrix);
    for (let i = pineIndex; i < count * 3; i++) pines.setMatrixAt(i, _dummy.matrix);
    for (const mesh of [trunks, canopies, pines]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [layout, count]);

  return (
    <group name="Rừng cây nâng cấp">
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.3, 2.8, 7]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, count * 3]} castShadow receiveShadow frustumCulled={false}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pineRef} args={[undefined, undefined, count * 3]} castShadow receiveShadow frustumCulled={false}>
        <coneGeometry args={[1.35, 2.9, 8]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
    </group>
  );
}

const PETAL_INNER = ["#f9d3de", "#f4bccd"];
const PETAL_OUTER = ["#f2a9bf", "#ec8fae"];

function LotusFlower({ scale = 1, bud = false }: { scale?: number; bud?: boolean }) {
  if (bud) {
    return <group scale={scale}>
      <mesh position={[0, 0.3, 0]} scale={[0.55, 1.15, 0.55]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#e78aa6" roughness={0.6} emissive="#c94f74" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0.14, 0]} scale={[0.8, 0.55, 0.8]}>
        <sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#5c8a4c" roughness={0.9} />
      </mesh>
    </group>;
  }
  return <group scale={scale}>
    <mesh position={[0, 0.06, 0]} scale={[1, 0.4, 1]}>
      <sphereGeometry args={[0.14, 12, 8]} /><meshStandardMaterial color="#7fa653" roughness={0.85} />
    </mesh>
    {Array.from({ length: 10 }, (_, i) => {
      const angle = i * Math.PI * 2 / 10;
      return <mesh key={`stamen-${i}`} position={[Math.cos(angle) * 0.09, 0.14, Math.sin(angle) * 0.09]}>
        <sphereGeometry args={[0.028, 6, 5]} />
        <meshStandardMaterial color="#ffd45e" emissive="#ffb300" emissiveIntensity={0.65} roughness={0.45} />
      </mesh>;
    })}
    {[...Array(9)].map((_, i) => {
      const angle = i * Math.PI * 2 / 9;
      return <mesh key={`outer-${i}`} position={[Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2]}
        rotation={[Math.sin(angle) * 1.05, -angle, Math.cos(angle) * 1.05]} scale={[0.5, 0.16, 1.35]} castShadow>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color={PETAL_OUTER[i % 2]} roughness={0.5} emissive="#c94f74" emissiveIntensity={0.12} />
      </mesh>;
    })}
    {[...Array(6)].map((_, i) => {
      const angle = i * Math.PI * 2 / 6 + 0.3;
      return <mesh key={`inner-${i}`} position={[Math.cos(angle) * 0.11, 0.16, Math.sin(angle) * 0.11]}
        rotation={[Math.sin(angle) * 0.5, -angle, Math.cos(angle) * 0.5]} scale={[0.42, 0.16, 1.1]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color={PETAL_INNER[i % 2]} roughness={0.45} emissive="#d96a8d" emissiveIntensity={0.14} />
      </mesh>;
    })}
  </group>;
}

/** Lotus leaves and blossoms with gentle, individually phased water movement. */
export function LotusField({ w, d, count = 120 }: { w: number; d: number; count?: number }) {
  const items = useMemo(() => {
    const rand = mulberry32(9917 + count + Math.round(w));
    return Array.from({ length: count }, (_, i) => {
      const angle = i * 2.399963;
      const x = Math.cos(angle) * (w / 2 - 2) * (0.3 + rand() * 0.7);
      const z = Math.sin(angle) * (d / 2 - 2) * (0.3 + rand() * 0.7);
      const bloom = rand();
      return {
        x, z, rotation: rand() * Math.PI * 2,
        leaf: 0.58 + rand() * 0.45,
        flower: bloom < 0.24,
        bud: bloom >= 0.24 && bloom < 0.4,
        flowerScale: 0.88 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
        tilt: (rand() - 0.5) * 0.14,
        color: rand() < 0.33 ? "#3f7040" : rand() < 0.5 ? "#4d7f45" : "#5c8a4c",
      };
    });
  }, [w, d, count]);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    for (let i = 0; i < items.length; i++) {
      const group = refs.current[i];
      if (!group) continue;
      const phase = items[i].phase;
      group.position.y = 0.16 + Math.sin(time * 0.7 + phase) * 0.028;
      group.rotation.z = items[i].tilt + Math.sin(time * 0.5 + phase) * 0.025;
      group.rotation.x = Math.sin(time * 0.65 + phase) * 0.07;
    }
  });

  return <group name="Lá sen và hoa sen 3D">
    {items.map((item, i) => <group key={i} ref={(el) => { refs.current[i] = el; }}
      position={[item.x, 0.16, item.z]} rotation-y={item.rotation}>
      <mesh rotation-x={-Math.PI / 2 + item.tilt} scale={[1, 0.88, 1]} receiveShadow castShadow>
        <circleGeometry args={[item.leaf, 28, 0.35, Math.PI * 2 - 0.7]} />
        <meshStandardMaterial color={item.color} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2 + item.tilt} position={[0, 0.009, 0]}>
        <circleGeometry args={[item.leaf * 0.34, 16]} />
        <meshStandardMaterial color="#79a85c" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      {(item.flower || item.bud) && <group position={[item.leaf * 0.45, 0, item.leaf * 0.2]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.022, 0.03, 0.3, 7]} />
          <meshStandardMaterial color="#5f8f4e" roughness={0.9} />
        </mesh>
        <group position={[0, 0.22, 0]}><LotusFlower scale={item.flowerScale} bud={item.bud} /></group>
      </group>}
    </group>)}
  </group>;
}

export function PetalFall({ centers }: { centers?: [number, number][] }) {
  const spots = useMemo<[number, number][]>(() => centers ?? [
    [-46, 74], [-44, 34], [46, 76], [44, 32], [-80, 40], [82, 44], [-58, -20], [58, -20],
  ], [centers]);
  const count = 240;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const petals = useMemo(() => {
    const rand = mulberry32(4451);
    return Array.from({ length: count }, () => {
      const [x, z] = spots[Math.floor(rand() * spots.length)];
      return { x: x + (rand() - 0.5) * 7, z: z + (rand() - 0.5) * 7,
        y: rand() * 5, speed: 0.35 + rand() * 0.5, phase: rand() * Math.PI * 2,
        rotation: rand() * Math.PI * 2, size: 0.6 + rand() * 0.7 };
    });
  }, [spots]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    petals.forEach((_, i) => {
      _color.setHSL(0.93 + (i % 7) * 0.004, 0.55, 0.78 + (i % 5) * 0.03);
      mesh.setColorAt(i, _color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [petals]);
  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    const time = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    petals.forEach((petal, i) => {
      petal.y -= petal.speed * dt;
      if (petal.y < 0.05) petal.y = 4.2 + (i % 5) * 0.4;
      _dummy.position.set(petal.x + Math.sin(time + petal.phase) * 0.5, petal.y,
        petal.z + Math.cos(time * 0.8 + petal.phase) * 0.4);
      _dummy.rotation.set(time * 0.6 + petal.phase, petal.rotation, Math.sin(time + petal.phase) * 0.6);
      _dummy.scale.setScalar(petal.size);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
    <sphereGeometry args={[0.05, 6, 4]} /><meshStandardMaterial roughness={0.8} />
  </instancedMesh>;
}

export function Fireflies({ centers }: { centers?: [number, number][] }) {
  const spots = useMemo<[number, number][]>(() => centers ?? [[-27, 52], [28, 52], [-70, 80]], [centers]);
  const count = 90;
  const materialRef = useRef<THREE.PointsMaterial>(null!);
  const geometryRef = useRef<THREE.BufferGeometry>(null!);
  const { positions, seeds } = useMemo(() => {
    const rand = mulberry32(7717);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const [x, z] = spots[Math.floor(rand() * spots.length)];
      positions[i * 3] = x + (rand() - 0.5) * 26;
      positions[i * 3 + 1] = 0.5 + rand() * 2.4;
      positions[i * 3 + 2] = z + (rand() - 0.5) * 26;
      seeds[i * 2] = rand() * Math.PI * 2;
      seeds[i * 2 + 1] = 0.3 + rand() * 0.8;
    }
    return { positions, seeds };
  }, [spots]);
  const basePositions = useMemo(() => positions.slice(), [positions]);
  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.opacity = THREE.MathUtils.clamp(vietnamDaylight() - 0.25, 0, 1) * 0.9;
    const geometry = geometryRef.current;
    if (!geometry) return;
    const time = clock.elapsedTime;
    const attribute = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const phase = seeds[i * 2], speed = seeds[i * 2 + 1];
      attribute.setX(i, basePositions[i * 3] + Math.sin(time * speed + phase) * 0.7);
      attribute.setY(i, basePositions[i * 3 + 1] + Math.cos(time * speed * 1.3 + phase) * 0.22);
      attribute.setZ(i, basePositions[i * 3 + 2] + Math.cos(time * speed * 0.7 + phase) * 0.7);
    }
    attribute.needsUpdate = true;
  });
  return <points frustumCulled={false}>
    <bufferGeometry ref={geometryRef}><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial ref={materialRef} color="#ffe9a3" size={0.32} sizeAttenuation transparent
      opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
  </points>;
}

export function Effects() {
  return <EffectComposer multisampling={0}>
    <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.7} luminanceSmoothing={0.17} />
    <Vignette eskil={false} offset={0.2} darkness={0.24} />
  </EffectComposer>;
}
