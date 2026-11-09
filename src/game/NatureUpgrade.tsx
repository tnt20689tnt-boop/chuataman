// ============================================================================
// NATURE UPGRADE — nâng cấp thiên nhiên Chùa Tâm An
//   • Forest:        rừng cây sinh động (instanced, 6 dáng cây và bảng màu đa dạng)
//   • LotusField:    hoa sen nhiều lớp cánh + lá sen khuyết + lắc lư theo nước
//   • PetalFall:     cánh hoa anh đào rơi
//   • Fireflies:     đom đóm bay đêm (theo giờ Việt Nam)
//   • Effects:       Bloom + Vignette — cảm giác game 3D
// Thay thế drop-in cho Forest/LotusField cũ. Xem HUONG_DAN_SUA.md.
// ============================================================================
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

type ForestPoint = [x: number, z: number, scale: number];

// ---------- tiện ích ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Giờ Việt Nam → hệ số sáng/tối (dùng chung cho đom đóm)
function vietnamDaylight() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const hour = part("hour") + part("minute") / 60 + part("second") / 3600;
  const daylight = THREE.MathUtils.clamp((hour - 5.5) / 1.1, 0, 1) *
    (1 - THREE.MathUtils.clamp((hour - 17.2) / 1.1, 0, 1));
  return { hour, daylight, night: 1 - daylight };
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const LEAFY = 0, PINE = 1, SAKURA = 2, WILLOW = 3, CYPRESS = 4, GOLDEN = 5;
const FOREST_TYPES = [LEAFY, PINE, SAKURA, WILLOW, CYPRESS, GOLDEN];

export function Forest({ points, seed = 20261108 }: { points: ForestPoint[]; seed?: number }) {
  const count = points.length;
  const trunkRef = useRef<THREE.InstancedMesh>(null!);
  const blobRef = useRef<THREE.InstancedMesh>(null!);
  const pineRef = useRef<THREE.InstancedMesh>(null!);
  const forestRef = useRef<THREE.Group>(null!);

  const layout = useMemo(() => {
    const rand = mulberry32(seed);
    return points.map(([x, z, s], i) => {
      const type = FOREST_TYPES[(i + seed) % FOREST_TYPES.length];
      const rot = rand() * Math.PI * 2;
      const tall = 0.78 + rand() * 0.64;
      return {
        x,
        z,
        s: s * (0.78 + rand() * 0.5),
        type,
        rot,
        tall,
        jitter: rand(),
        sway: 0.08 + rand() * 0.15,
        phase: rand() * Math.PI * 2,
      };
    });
  }, [points, seed]);

  useLayoutEffect(() => {
    const trunks = trunkRef.current, blobs = blobRef.current, pines = pineRef.current;
    if (!trunks || !blobs || !pines) return;
    let blobIndex = 0, pineIndex = 0;
    layout.forEach((t, i) => {
      _dummy.position.set(t.x, 1.3 * t.tall * t.s, t.z);
      _dummy.rotation.set(0, t.rot, (t.jitter - 0.5) * 0.12);
      const trunkW = t.type === PINE ? 0.78 : t.type === CYPRESS ? 0.6 : t.type === WILLOW ? 1.24 : t.type === SAKURA ? 1.08 : 1.0;
      _dummy.scale.set(t.s * trunkW, t.tall * t.s, t.s * trunkW);
      _dummy.updateMatrix();
      trunks.setMatrixAt(i, _dummy.matrix);
      _color.setHSL(0.055 + t.jitter * 0.04, 0.28 + t.jitter * 0.08, 0.19 + t.jitter * 0.13);
      trunks.setColorAt(i, _color);

      if (t.type === PINE || t.type === CYPRESS) {
        const tiers = t.type === CYPRESS ? [0.7, 0.52, 0.35] : [1, 0.72, 0.49];
        const heights = t.type === CYPRESS ? [2.8, 4.25, 5.55] : [2.5, 3.85, 5.0];
        for (let tier = 0; tier < tiers.length; tier++) {
          const k = tiers[tier];
          _dummy.position.set(t.x, (heights[tier] + (t.jitter - 0.5) * 0.45) * t.tall * t.s, t.z);
          _dummy.rotation.set(0, t.rot + tier, 0);
          _dummy.scale.set(t.s * k, t.s * (0.92 - tier * 0.13) * t.tall, t.s * k);
          _dummy.updateMatrix();
          pines.setMatrixAt(pineIndex, _dummy.matrix);
          _color.setHSL(t.type === CYPRESS ? 0.37 : 0.32, 0.42 + t.jitter * 0.1, 0.17 + t.jitter * 0.11);
          pines.setColorAt(pineIndex, _color);
          pineIndex++;
        }
      } else {
        const clusters: [number, number, number, number][] = t.type === WILLOW
          ? [[0, 3.25, 0, 1.5], [-1.05, 2.65, 0.42, 1.0], [1.05, 2.58, -0.38, 1.02]]
          : t.type === GOLDEN
            ? [[0, 3.7, 0, 1.28], [-0.95, 3.0, 0.35, 0.96], [0.9, 3.05, -0.42, 1.02]]
            : [[0, 3.5, 0, 1.35], [-0.85, 3.05, 0.3, 0.85], [0.8, 3.1, -0.35, 0.9]];
        for (const [cx, cy, cz, cs] of clusters) {
          const cos = Math.cos(t.rot), sin = Math.sin(t.rot);
          _dummy.position.set(
            t.x + (cx * cos - cz * sin) * t.s,
            cy * t.tall * t.s,
            t.z + (cx * sin + cz * cos) * t.s,
          );
          _dummy.rotation.set(t.jitter * 0.6, t.rot, t.jitter * 0.5);
          const flat = t.type === WILLOW ? 0.58 : 0.72 + t.jitter * 0.3;
          _dummy.scale.set(t.s * cs * (1 + t.jitter * 0.28), t.s * cs * flat, t.s * cs * (1 + (0.5 - t.jitter) * 0.18));
          _dummy.updateMatrix();
          blobs.setMatrixAt(blobIndex, _dummy.matrix);
          if (t.type === SAKURA) {
            _color.setHSL(0.93 + t.jitter * 0.03, 0.56, 0.74 + t.jitter * 0.12);
          } else if (t.type === GOLDEN) {
            _color.setHSL(0.12 + t.jitter * 0.035, 0.64 + t.jitter * 0.12, 0.46 + t.jitter * 0.18);
          } else if (t.type === WILLOW) {
            _color.setHSL(0.26 + t.jitter * 0.035, 0.38 + t.jitter * 0.1, 0.29 + t.jitter * 0.14);
          } else {
            _color.setHSL(0.29 + t.jitter * 0.1, 0.44 + t.jitter * 0.12, 0.25 + t.jitter * 0.19);
          }
          blobs.setColorAt(blobIndex, _color);
          blobIndex++;
        }
      }
    });

    _dummy.scale.set(0, 0, 0); _dummy.position.set(0, -50, 0); _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    for (let i = blobIndex; i < count * 3; i++) blobs.setMatrixAt(i, _dummy.matrix);
    for (let i = pineIndex; i < count * 3; i++) pines.setMatrixAt(i, _dummy.matrix);
    trunks.instanceMatrix.needsUpdate = true;
    blobs.instanceMatrix.needsUpdate = true;
    pines.instanceMatrix.needsUpdate = true;
    if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
    if (blobs.instanceColor) blobs.instanceColor.needsUpdate = true;
    if (pines.instanceColor) pines.instanceColor.needsUpdate = true;
  }, [layout, count]);

  useFrame(({ clock }) => {
    if (!forestRef.current) return;
    forestRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.45) * 0.04;
  });

  return (
    <group ref={forestRef} name="Rừng cây nâng cấp">
      <instancedMesh ref={trunkRef} args={[undefined as any, undefined as any, count]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.3, 2.8, 7]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={blobRef} args={[undefined as any, undefined as any, count * 3]} castShadow receiveShadow frustumCulled={false}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial roughness={0.92} flatShading={false} />
      </instancedMesh>
      <instancedMesh ref={pineRef} args={[undefined as any, undefined as any, count * 3]} castShadow receiveShadow frustumCulled={false}>
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
    return (
      <group scale={scale}>
        <mesh position={[0, 0.3, 0]} scale={[0.55, 1.15, 0.55]} castShadow>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshStandardMaterial color="#e78aa6" roughness={0.6} emissive="#c94f74" emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0, 0.14, 0]} scale={[0.8, 0.55, 0.8]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color="#5c8a4c" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  return (
    <group scale={scale}>
      <mesh position={[0, 0.06, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.14, 12, 8]} />
        <meshStandardMaterial color="#7fa653" roughness={0.85} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = i * Math.PI * 2 / 10;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, 0.14, Math.sin(a) * 0.09]}>
            <sphereGeometry args={[0.028, 6, 5]} />
            <meshStandardMaterial color="#ffd45e" emissive="#ffb300" emissiveIntensity={0.75} roughness={0.4} />
          </mesh>
        );
      })}
      {[...Array(9)].map((_, p) => {
        const a = p * Math.PI * 2 / 9;
        return (
          <mesh key={`o${p}`} position={[Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2]}
            rotation={[Math.sin(a) * 1.05, -a, Math.cos(a) * 1.05]} scale={[0.5, 0.16, 1.35]} castShadow>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color={PETAL_OUTER[p % 2]} roughness={0.5} emissive="#c94f74" emissiveIntensity={0.12} />
          </mesh>
        );
      })}
      {[...Array(6)].map((_, p) => {
        const a = p * Math.PI * 2 / 6 + 0.3;
        return (
          <mesh key={`i${p}`} position={[Math.cos(a) * 0.11, 0.16, Math.sin(a) * 0.11]}
            rotation={[Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5]} scale={[0.42, 0.16, 1.1]}>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial color={PETAL_INNER[p % 2]} roughness={0.45} emissive="#d96a8d" emissiveIntensity={0.14} />
          </mesh>
        );
      })}
    </group>
  );
}

export function LotusField({ w, d, count = 120 }: { w: number; d: number; count?: number }) {
  const items = useMemo(() => {
    const rand = mulberry32(9917 + count + Math.round(w));
    return Array.from({ length: count }, (_, i) => {
      const a = i * 2.399963;
      const rx = w / 2 - 2, rz = d / 2 - 2;
      const px = Math.cos(a) * rx * (0.3 + rand() * 0.7);
      const pz = Math.sin(a) * rz * (0.3 + rand() * 0.7);
      const roll = rand();
      return {
        x: px, z: pz, rot: rand() * Math.PI * 2,
        leaf: 0.5 + rand() * 0.42,
        flower: roll < 0.22, bud: !(roll < 0.22) && roll < 0.38,
        fscale: 0.9 + rand() * 0.55,
        phase: rand() * Math.PI * 2,
        tiltX: (rand() - 0.5) * 0.14, tiltZ: (rand() - 0.5) * 0.14,
        leafColor: rand() < 0.33 ? "#3f7040" : rand() < 0.5 ? "#4d7f45" : "#5c8a4c",
      };
    });
  }, [w, d, count]);

  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < items.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;
      g.position.y = 0.16 + Math.sin(t * 0.7 + items[i].phase) * 0.028;
      g.rotation.z = items[i].tiltZ + Math.sin(t * 0.5 + items[i].phase) * 0.02;
      g.rotation.x = Math.sin(t * 0.65 + items[i].phase) * 0.08;
    }
  });

  return (
    <group name="Lá sen và hoa sen nâng cấp">
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0.16, it.z]} rotation-y={it.rot}
          ref={(el) => { groupRefs.current[i] = el; }}>
          <mesh rotation-x={-Math.PI / 2 + it.tiltX} scale={[1, 0.86, 1]} receiveShadow castShadow>
            <circleGeometry args={[it.leaf, 22, 0.35, Math.PI * 2 - 0.7]} />
            <meshStandardMaterial color={it.leafColor} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2 + it.tiltX} position={[0, 0.008, 0]}>
            <circleGeometry args={[it.leaf * 0.35, 12]} />
            <meshStandardMaterial color="#6fa057" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {(it.flower || it.bud) && (
            <group position={[it.leaf * 0.45, 0, it.leaf * 0.2]}>
              <mesh position={[0, 0.14, 0]}>
                <cylinderGeometry args={[0.022, 0.03, 0.3, 6]} />
                <meshStandardMaterial color="#5f8f4e" roughness={0.9} />
              </mesh>
              <group position={[0, 0.22, 0]}>
                <LotusFlower scale={it.fscale} bud={it.bud} />
              </group>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

export function PetalFall({ centers }: { centers?: [number, number][] }) {
  const spots = useMemo<[number, number][]>(() => centers ?? [
    [-46, 74], [-44, 34], [46, 76], [44, 32], [-80, 40], [82, 44], [-58, -20], [58, -20],
  ], [centers]);
  const COUNT = 240;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const petals = useMemo(() => {
    const rand = mulberry32(4451);
    return Array.from({ length: COUNT }, () => {
      const [cx, cz] = spots[Math.floor(rand() * spots.length)];
      return {
        x: cx + (rand() - 0.5) * 7, z: cz + (rand() - 0.5) * 7,
        y: rand() * 5, speed: 0.35 + rand() * 0.5,
        sway: 0.4 + rand() * 0.9, phase: rand() * Math.PI * 2,
        rot: rand() * Math.PI * 2, rotSpeed: (rand() - 0.5) * 2.4,
        s: 0.6 + rand() * 0.7,
      };
    });
  }, [spots]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    petals.forEach((p, i) => {
      _color.setHSL(0.93 + (i % 7) * 0.004, 0.55, 0.78 + (i % 5) * 0.03);
      mesh.setColorAt(i, _color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [petals]);

  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    petals.forEach((p, i) => {
      p.y -= p.speed * dt;
      if (p.y < 0.05) p.y = 4.2 + (i % 5) * 0.4;
      _dummy.position.set(p.x + Math.sin(t * p.sway + p.phase) * 0.5, p.y, p.z + Math.cos(t * p.sway * 0.8 + p.phase) * 0.4);
      _dummy.rotation.set(t * p.rotSpeed + p.phase, p.rot, Math.sin(t + p.phase) * 0.6);
      _dummy.scale.setScalar(p.s);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.05, 6, 4]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
}

export function Fireflies({ centers }: { centers?: [number, number][] }) {
  const spots = useMemo<[number, number][]>(() => centers ?? [[-27, 52], [28, 52], [-70, 80]], [centers]);
  const COUNT = 90;
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const { positions, seeds } = useMemo(() => {
    const rand = mulberry32(7717);
    const arr = new Float32Array(COUNT * 3);
    const sd = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      const [cx, cz] = spots[Math.floor(rand() * spots.length)];
      arr[i * 3] = cx + (rand() - 0.5) * 26;
      arr[i * 3 + 1] = 0.5 + rand() * 2.4;
      arr[i * 3 + 2] = cz + (rand() - 0.5) * 26;
      sd[i * 2] = rand() * Math.PI * 2;
      sd[i * 2 + 1] = 0.3 + rand() * 0.8;
    }
    return { positions: arr, seeds: sd };
  }, [spots]);
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const basePositions = useMemo(() => positions.slice(), [positions]);

  useFrame(({ clock }) => {
    const { night } = vietnamDaylight();
    if (matRef.current) matRef.current.opacity = THREE.MathUtils.clamp(night - 0.25, 0, 1) * 0.9;
    const geo = geoRef.current;
    if (!geo) return;
    const t = clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const ph = seeds[i * 2], sp = seeds[i * 2 + 1];
      pos.setX(i, basePositions[i * 3] + Math.sin(t * sp + ph) * 0.7);
      pos.setY(i, basePositions[i * 3 + 1] + Math.cos(t * sp * 1.3 + ph) * 0.22);
      pos.setZ(i, basePositions[i * 3 + 2] + Math.cos(t * sp * 0.7 + ph) * 0.7);
    }
    pos.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} color="#ffe9a3" size={0.32} sizeAttenuation transparent
        opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.68} luminanceSmoothing={0.16} />
      <Vignette eskil={false} offset={0.18} darkness={0.22} />
    </EffectComposer>
  );
}

