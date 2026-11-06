import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { tileTexture, fallTexture, waterTexture } from "./textures";
import { Surface } from "./Materials";
import { CarvedPanel, Inscription } from "./TempleDetails";
import { SCENE_COLORS as C } from "./templeData";

const WOOD = C.wood;
const RED = C.lacquer;
const GOLD = C.gold;

let _tile: THREE.Texture | null = null;
const tile = () => (_tile ??= tileTexture());

/** Vietnamese-style hipped roof with upturned corner eaves. */
export function Roof({ w, d, h, y = 0 }: { w: number; d: number; h: number; y?: number }) {
  const geo = useMemo(() => {
    const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
    // Four curved roof slopes with lifted eaves, rather than a pyramidal cone.
    const ridge = w * 0.23;
    for (let face = 0; face < 4; face++) {
      const start = vertices.length / 3;
      for (let row = 0; row <= 16; row++) for (let col = 0; col <= 24; col++) {
        const t = row / 16, u = col / 24 * 2 - 1;
        const rise = h * (1 - t) ** 1.65 + h * 0.15 * t ** 8;
        const corner = h * 0.12 * Math.abs(u) ** 6 * t ** 5;
        if (face < 2) vertices.push(u * (ridge + (w * 0.57 - ridge) * t), rise + corner, (face === 0 ? 1 : -1) * d * 0.57 * t);
        else vertices.push((face === 2 ? 1 : -1) * (ridge + (w * 0.57 - ridge) * t), rise + corner, u * d * 0.57 * t);
        uvs.push(col / 24 * w / 5, t * d / 5);
      }
      for (let row = 0; row < 16; row++) for (let col = 0; col < 24; col++) {
        const a = start + row * 25 + col, b = a + 25;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }, [w, d, h]);
  const tex = tile();
  return <group position={[0, y, 0]}>
    <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial map={tex} color={C.roof} roughness={0.92} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, h + 0.08, 0]} castShadow><boxGeometry args={[w * 0.5, 0.25, 0.4]} /><meshStandardMaterial color={C.stone} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * w * 0.25, h + 0.15, 0]} rotation-z={side * -0.5} castShadow><torusGeometry args={[0.6, 0.12, 6, 16, Math.PI]} /><meshStandardMaterial color={C.stone} /></mesh>)}
    {[-1, 1].map(side => <mesh key={side} position={[0, -0.15, side * d * 0.48]} castShadow><boxGeometry args={[w, 0.35, 0.35]} /><Surface kind="wood" /></mesh>)}
  </group>;
}

function Columns({ w, d, h, n = 6 }: { w: number; d: number; h: number; n?: number }) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i / (n - 1)) * w;
    pts.push([x, d / 2], [x, -d / 2]);
  }
  return (
    <>
      {pts.map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, h, 10]} />
          <Surface kind="wood" />
        </mesh>
      ))}
    </>
  );
}

export function MainHall() {
  return (
    <group position={[0, 0, -62]}>
      {/* platform & steps */}
      <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
        <boxGeometry args={[46, 1.2, 30]} />
        <Surface kind="stone" repeat={4} />
      </mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[0, (i + 1) * 0.2, 17.5 - i]} receiveShadow castShadow><boxGeometry args={[14, (i + 1) * 0.4, 1]} /><Surface kind="stone" /></mesh>)}
      <group position={[0, 1.2, 0]}>
        {/* back & side walls (front open so the Buddha is visible) */}
        <mesh position={[0, 5, -12]} castShadow receiveShadow>
          <boxGeometry args={[40, 10, 0.8]} />
          <Surface kind="wood" repeat={3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 20, 5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 10, 24]} />
            <Surface kind="wood" repeat={3} />
          </mesh>
        ))}
        <Columns w={38} d={24} h={10} n={8} />
        {/* lower roof */}
        <Roof w={44} d={28} h={7} y={9.5} />
        {/* upper tier */}
        <mesh position={[0, 15, 0]} castShadow>
          <boxGeometry args={[24, 4, 14]} />
          <Surface kind="wood" repeat={3} />
        </mesh>
        <Roof w={28} d={17} h={6} y={16.5} />
        <Inscription text="CHÍNH ĐIỆN" width={10} height={1.6} position={[0, 8.6, 12.6]} />
        {[-15, -10, 10, 15].map(x => <CarvedPanel key={x} position={[x, 4.5, -11.5]} w={3.8} h={6} />)}
        {[-1, 1].map(side => <Inscription key={side} text="TÂM AN" width={1} height={3} position={[side * 7.8, 5, 12.4]} small />)}
        {/* altar */}
        <mesh position={[0, 0.8, -4]} castShadow>
          <boxGeometry args={[10, 1.6, 4]} />
          <meshStandardMaterial color={RED} />
        </mesh>
        <Buddha position={[0, 1.6, -6.5]} scale={1.6} />
        {/* incense bowl + smoke */}
        <mesh position={[0, 2.0, -2.4]}>
          <cylinderGeometry args={[0.6, 0.45, 0.6, 16]} />
          <meshStandardMaterial color="#8a6a2a" metalness={0.8} roughness={0.3} />
        </mesh>
        <Sparkles position={[0, 4, -2.4]} count={40} scale={[1.2, 4, 1.2]} size={6} speed={0.25} color="#efe7da" opacity={0.6} />
        {/* lanterns */}
        {[-8, -3, 3, 8].map((x) => (
          <group key={x} position={[x, 8, 11]}>
            <mesh>
              <sphereGeometry args={[0.6, 12, 12]} />
              <meshStandardMaterial color="#e2512e" emissive="#ff6a2a" emissiveIntensity={0.9} />
            </mesh>
          </group>
        ))}
        <pointLight position={[0, 6, -2]} intensity={60} distance={30} color="#ffcf8a" />
      </group>
    </group>
  );
}

export function Buddha(props: { position: [number, number, number]; scale?: number }) {
  const gold = <meshStandardMaterial color="#b58d49" metalness={0.72} roughness={0.34} />;
  const darkGold = <meshStandardMaterial color="#51402b" metalness={0.42} roughness={0.62} />;
  const curls = useMemo(() => Array.from({ length: 48 }, (_, i) => {
    const y = 5.35 + (i / 48) * 0.82;
    const ring = Math.acos(THREE.MathUtils.clamp((y - 5.76) / 0.82, -0.95, 0.95));
    const a = i * 2.399963;
    return [Math.sin(ring) * Math.cos(a) * 0.67, y, Math.sin(ring) * Math.sin(a) * 0.58] as [number, number, number];
  }), []);
  return (
    <group position={props.position} scale={props.scale ?? 1}>
      {/* Layered lotus pedestal, with individually formed petals. */}
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[2.25, 2.0, 0.84, 48]} />{gold}</mesh>
      {Array.from({ length: 20 }).map((_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 2.05, 0.82, Math.sin(a) * 2.05]} rotation={[0.25, -a, 0.35]} scale={[0.72, 0.34, 0.42]}>
          <sphereGeometry args={[1, 18, 12]} />{gold}
        </mesh>;
      })}
      <mesh position={[0, 1.12, 0]}><cylinderGeometry args={[1.85, 2.05, 0.34, 48]} />{gold}</mesh>
      {/* Balanced seated posture and softly modelled robe silhouette. */}
      <mesh position={[0, 1.62, 0.24]} scale={[2.0, 0.64, 1.28]}><sphereGeometry args={[1, 40, 28]} />{gold}</mesh>
      <mesh position={[0, 2.9, -0.02]} scale={[1.02, 1.55, 0.78]}><sphereGeometry args={[1, 40, 32]} />{gold}</mesh>
      <mesh position={[0, 3.18, 0.02]} rotation-x={0.12} scale={[1.08, 1.24, 0.82]}>
        <sphereGeometry args={[1, 36, 28]} />{gold}
      </mesh>
      {[-1, 1].map((s) => <group key={s}>
        <mesh position={[s * 0.88, 2.7, 0.38]} rotation={[0.22, 0, s * 0.32]} scale={[0.31, 0.95, 0.34]}><capsuleGeometry args={[0.5, 1, 8, 16]} />{gold}</mesh>
        <mesh position={[s * 0.46, 2.14, 0.83]} rotation-z={s * -0.08} scale={[0.26, 0.48, 0.22]}><sphereGeometry args={[1, 24, 18]} />{gold}</mesh>
      </group>)}
      {/* Calm face: cheek volume, closed eyelids, nose bridge and a subtle smile. */}
      <mesh position={[0, 5.0, 0.04]} scale={[0.62, 0.78, 0.58]}><sphereGeometry args={[1, 48, 36]} />{gold}</mesh>
      {[-1, 1].map((s) => <group key={s}>
        <mesh position={[s * 0.61, 4.98, 0.02]} scale={[0.15, 0.37, 0.18]}><sphereGeometry args={[1, 24, 18]} />{gold}</mesh>
        <mesh position={[s * 0.22, 5.05, 0.555]} rotation-z={s * -0.04} scale={[0.15, 0.035, 0.035]}><sphereGeometry args={[1, 24, 12]} />{darkGold}</mesh>
        <mesh position={[s * 0.22, 5.16, 0.55]} rotation-z={s * -0.12} scale={[0.16, 0.035, 0.035]}><sphereGeometry args={[1, 20, 12]} />{gold}</mesh>
      </group>)}
      <mesh position={[0, 4.91, 0.59]} rotation-x={-0.12} scale={[0.105, 0.27, 0.12]}><capsuleGeometry args={[0.5, 1, 8, 12]} />{gold}</mesh>
      <mesh position={[0, 4.67, 0.58]} scale={[0.18, 0.045, 0.035]}><sphereGeometry args={[1, 24, 12]} />{darkGold}</mesh>
      <mesh position={[0, 4.64, 0.585]} scale={[0.12, 0.025, 0.025]}><sphereGeometry args={[1, 20, 12]} />{gold}</mesh>
      {/* Long earlobes and traditional curled ushnisha. */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.68, 4.88, 0]} scale={[0.13, 0.42, 0.19]}><capsuleGeometry args={[0.5, 1, 8, 12]} />{gold}</mesh>)}
      {curls.map(([x, y, z], i) => <mesh key={i} position={[x, y, z]} scale={0.075}><sphereGeometry args={[1, 10, 8]} />{darkGold}</mesh>)}
      <mesh position={[0, 5.96, -0.02]}><sphereGeometry args={[0.29, 28, 20]} />{gold}</mesh>
      <mesh position={[0, 5.18, 0.62]}><sphereGeometry args={[0.045, 16, 12]} /><meshStandardMaterial color="#e6c37b" metalness={0.65} roughness={0.28} /></mesh>
      {/* Halo remains behind the head, never in front of the face. */}
      <mesh position={[0, 5.0, -0.78]}><torusGeometry args={[1.18, 0.065, 12, 64]} /><meshStandardMaterial color="#d9b66f" metalness={0.72} roughness={0.3} emissive="#6f4a16" emissiveIntensity={0.16} /></mesh>
    </group>
  );
}

export function Tower({ position, tiers = 3, label }: { position: [number, number, number]; tiers?: number; label?: string }) {
  return (
    <group position={position} name={label ?? ""}>
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[10, 1, 10]} />
        <meshStandardMaterial color="#a89c88" />
      </mesh>
      {Array.from({ length: tiers }).map((_, i) => {
        const s = 1 - i * 0.18;
        const y = 1 + i * 5.5;
        return (
          <group key={i} position={[0, y, 0]} scale={[s, 1, s]}>
            <mesh position={[0, 2.2, 0]} castShadow>
              <boxGeometry args={[6, 4.4, 6]} />
              <Surface kind="wood" repeat={3} />
            </mesh>
            <Columns w={6} d={6} h={4.4} n={3} />
            <Roof w={8} d={8} h={2.2} y={4.2} />
          </group>
        );
      })}
    </group>
  );
}

export function BellTower({ position }: { position: [number, number, number] }) {
  const bell = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bell.current) bell.current.rotation.z = Math.sin(clock.elapsedTime * 1.2) * 0.04;
  });
  return (
    <group position={position}>
      <Tower position={[0, 0, 0]} tiers={2} />
      <group ref={bell} position={[0, 4.5, 0]}>
        <mesh position={[0, -1.2, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1.2, 2.4, 20]} />
          <meshStandardMaterial color="#6d5a2c" metalness={0.9} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

export function Gate({ z }: { z: number }) {
  return <group position={[0, 0, z]}>
    {[-8, -3.6, 3.6, 8].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 4.5, 0]} castShadow><boxGeometry args={[1.1, 9, 1.5]} /><Surface kind="stone" repeat={2} /></mesh>
      <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.5, 0.8, 1.9]} /><Surface kind="stone" /></mesh>
      <Inscription text="TỪ BI" width={0.65} height={3} position={[0, 4, 0.78]} small />
    </group>)}
    <Roof w={9} d={4.5} h={2.5} y={9} />
    {[-5.8, 5.8].map(x => <group key={x} position={[x, 0, 0]}><Roof w={4.5} d={3.5} h={1.8} y={7} /></group>)}
    <Inscription text="CHÙA TÂM AN" width={7.3} height={1.6} position={[0, 8.4, 1.2]} />
    <group rotation-y={Math.PI}><Inscription text="CHÙA TÂM AN" width={7.3} height={1.6} position={[0, 8.4, 1.2]} /></group>
  </group>;
}

export function Pond({ position, w, d }: { position: [number, number, number]; w: number; d: number }) {
  const tex = useMemo(() => waterTexture(), []);
  const lotus = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 160; i++) arr.push([(Math.random() - 0.5) * (w - 2), (Math.random() - 0.5) * (d - 2), Math.random()]);
    return arr;
  }, [w, d]);
  const padRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    (() => {
      const m = new THREE.Object3D();
      lotus.forEach(([x, z, r], i) => {
        m.position.set(x, 0.05, z);
        m.rotation.set(0, r * 6, 0);
        m.scale.setScalar(0.7 + r * 0.6);
        m.updateMatrix();
        padRef.current?.setMatrixAt(i, m.matrix);
        m.position.y = 0.25;
        m.scale.setScalar(r > 0.5 ? 0.5 : 0);
        m.updateMatrix();
        flowerRef.current?.setMatrixAt(i, m.matrix);
      });
      if (padRef.current) padRef.current.instanceMatrix.needsUpdate = true;
      if (flowerRef.current) flowerRef.current.instanceMatrix.needsUpdate = true;
    })();
  }, [lotus]);
  useFrame((_, dt) => {
    tex.offset.x += dt * 0.01;
  });
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={tex} roughness={0.08} metalness={0.4} color="#bfe3e3" />
      </mesh>
      {/* stone rim */}
      {([
        [0, d / 2, w + 1.4, 1],
        [0, -d / 2, w + 1.4, 1],
      ] as [number, number, number, number][]).map(([x, z, l], i) => (
        <mesh key={i} position={[x, 0.4, z]} castShadow receiveShadow>
          <boxGeometry args={[l, 0.8, 0.7]} />
          <meshStandardMaterial color="#56605a" />
        </mesh>
      ))}
      {[w / 2, -w / 2].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.8, d]} />
          <meshStandardMaterial color="#56605a" />
        </mesh>
      ))}
      <instancedMesh ref={padRef} args={[undefined, undefined, lotus.length]}>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 12]} />
        <meshStandardMaterial color="#3f7a35" />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[undefined, undefined, lotus.length]}>
        <coneGeometry args={[0.45, 0.6, 7, 1, true]} />
        <meshStandardMaterial color="#f2a6c0" emissive="#f07aa0" emissiveIntensity={0.15} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

export function Waterfall({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => {
    const t = fallTexture();
    t.repeat.set(2, 1);
    return t;
  }, []);
  useFrame((_, dt) => {
    tex.offset.y += dt * 0.9;
  });
  return (
    <group position={position}>
      {([
        [-5, 5, 0, 6],
        [5, 6, 0, 7],
        [0, 9, -3, 7],
        [-3, 3, 2, 4],
        [4, 3, 2, 4],
      ] as [number, number, number, number][]).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color="#6b6a63" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 6, 3.3]} rotation-x={-0.12}>
        <planeGeometry args={[3.2, 12]} />
        <meshStandardMaterial map={tex} transparent opacity={0.85} emissive="#cfeff5" emissiveIntensity={0.3} />
      </mesh>
      <Sparkles position={[0, 0.8, 4.5]} count={50} scale={[5, 1.5, 3]} size={5} speed={0.8} color="#ffffff" />
    </group>
  );
}

/** Instanced trees (trunk + two canopy blobs). */
export function Forest({ points }: { points: [number, number, number][] }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const crown = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    (() => {
      const m = new THREE.Object3D();
      const col = new THREE.Color();
      points.forEach(([x, z, s], i) => {
        m.position.set(x, 2 * s, z);
        m.rotation.set(0, s * 10, 0);
        m.scale.set(s, s, s);
        m.updateMatrix();
        trunk.current?.setMatrixAt(i, m.matrix);
        m.position.set(x, 5.5 * s, z);
        m.scale.set(s * 3, s * 2.6, s * 3);
        m.updateMatrix();
        crown.current?.setMatrixAt(i, m.matrix);
        col.setHSL(0.24 + (s % 0.1), 0.45, 0.28 + (s % 0.12));
        crown.current?.setColorAt(i, col);
      });
      if (trunk.current) trunk.current.instanceMatrix.needsUpdate = true;
      if (crown.current) {
        crown.current.instanceMatrix.needsUpdate = true;
        if (crown.current.instanceColor) crown.current.instanceColor.needsUpdate = true;
      }
    })();
  }, [points]);
  return (
    <>
      <instancedMesh ref={trunk} args={[undefined, undefined, points.length]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 4, 6]} />
        <meshStandardMaterial color="#4a3426" />
      </instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, points.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
      </instancedMesh>
    </>
  );
}

/** Symbolic release area: glowing lotus lanterns drifting on water. */
export function ReleaseLanterns({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((c, i) => {
      c.position.y = 0.3 + Math.sin(clock.elapsedTime + i) * 0.08;
      c.position.x = ((i * 3.1 + clock.elapsedTime * 0.3) % 16) - 8;
    });
  });
  return (
    <group position={position}>
      <Pond position={[0, 0, 0]} w={18} d={14} />
      <group ref={g}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} position={[0, 0.3, ((i * 2.7) % 11) - 5.5]}>
            <octahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffb04a" emissiveIntensity={1.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Pavilion({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) {
  return (
    <group position={position} rotation-y={rot}>
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[16, 0.6, 12]} />
        <meshStandardMaterial color="#b3a68f" />
      </mesh>
      <Columns w={14} d={10} h={5} n={4} />
      <group position={[0, 0.3, 0]}>
        <Roof w={16} d={12} h={3.5} y={5} />
      </group>
    </group>
  );
}

export function StoneLanterns({ points }: { points: [number, number][] }) {
  return (
    <>
      {points.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[0.4, 1.6, 0.4]} />
            <meshStandardMaterial color="#8a8a80" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[0.7, 0.5, 0.7]} />
            <meshStandardMaterial color="#fff1c8" emissive="#ffc46a" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <coneGeometry args={[0.65, 0.4, 4]} />
            <meshStandardMaterial color="#77776e" />
          </mesh>
        </group>
      ))}
    </>
  );
}
