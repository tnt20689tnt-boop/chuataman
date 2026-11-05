import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { tileTexture, fallTexture, waterTexture } from "./textures";

const WOOD = "#5a2f1c";
const RED = "#8f2a1c";
const GOLD = "#d4a640";

let _tile: THREE.Texture | null = null;
const tile = () => (_tile ??= tileTexture());

/** Vietnamese-style hipped roof with upturned corner eaves. */
export function Roof({ w, d, h, y = 0 }: { w: number; d: number; h: number; y?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true);
    g.rotateY(Math.PI / 4);
    return g;
  }, []);
  const tex = tile();
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geo} scale={[w * 1.15, h, d * 1.15]} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={tex} color="#e0e0e0" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* ridge */}
      <mesh position={[0, h * 0.98, 0]} castShadow>
        <boxGeometry args={[w * 0.35, h * 0.08, 0.35]} />
        <meshStandardMaterial color="#9a9488" />
      </mesh>
      {/* upturned corners */}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[(sx * w * 0.58), h * 0.1, (sz * d * 0.58)]}
          rotation={[sz * 0.6, 0, -sx * 0.6]}
          castShadow
        >
          <coneGeometry args={[0.25, h * 0.55, 6]} />
          <meshStandardMaterial color="#b9b2a4" />
        </mesh>
      ))}
    </group>
  );
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
          <meshStandardMaterial color={RED} roughness={0.5} />
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
        <meshStandardMaterial color="#b9ad98" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.2 + i * 0.35, 15.8 + (2 - i) * 0.7]} receiveShadow>
          <boxGeometry args={[14, 0.35, 1.4]} />
          <meshStandardMaterial color="#c6bba6" />
        </mesh>
      ))}
      <group position={[0, 1.2, 0]}>
        {/* back & side walls (front open so the Buddha is visible) */}
        <mesh position={[0, 5, -12]} castShadow receiveShadow>
          <boxGeometry args={[40, 10, 0.8]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 20, 5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 10, 24]} />
            <meshStandardMaterial color={WOOD} />
          </mesh>
        ))}
        <Columns w={38} d={24} h={10} n={8} />
        {/* lower roof */}
        <Roof w={44} d={28} h={7} y={9.5} />
        {/* upper tier */}
        <mesh position={[0, 15, 0]} castShadow>
          <boxGeometry args={[24, 4, 14]} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
        <Roof w={28} d={17} h={6} y={16.5} />
        {/* signboard */}
        <mesh position={[0, 8.6, 12.6]}>
          <boxGeometry args={[9, 1.6, 0.3]} />
          <meshStandardMaterial color="#2a1a10" emissive="#3a1e08" />
        </mesh>
        <mesh position={[0, 8.6, 12.78]}>
          <planeGeometry args={[8.2, 1.1]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
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
  const gold = <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} emissive="#5a3a00" emissiveIntensity={0.25} />;
  return (
    <group position={props.position} scale={props.scale ?? 1}>
      {/* lotus pedestal */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.1, 0.6, Math.sin(a) * 2.1]} rotation={[0, -a, 0.5]}>
            <sphereGeometry args={[0.7, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {gold}
          </mesh>
        );
      })}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[2.3, 2.0, 1.2, 24]} />
        {gold}
      </mesh>
      {/* crossed legs */}
      <mesh position={[0, 1.55, 0.3]} scale={[2.2, 0.7, 1.4]}>
        <sphereGeometry args={[1, 24, 16]} />
        {gold}
      </mesh>
      {/* torso */}
      <mesh position={[0, 3.0, 0]} scale={[1.15, 1.6, 0.85]}>
        <sphereGeometry args={[1, 24, 16]} />
        {gold}
      </mesh>
      {/* arms */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.05, 2.6, 0.35]} rotation={[0.4, 0, s * 0.25]} scale={[0.38, 1.1, 0.38]}>
          <sphereGeometry args={[1, 12, 10]} />
          {gold}
        </mesh>
      ))}
      {/* hands */}
      <mesh position={[0, 2.1, 0.9]} scale={[0.6, 0.25, 0.4]}>
        <sphereGeometry args={[1, 12, 10]} />
        {gold}
      </mesh>
      {/* head */}
      <mesh position={[0, 5.0, 0]}>
        <sphereGeometry args={[0.72, 24, 18]} />
        {gold}
      </mesh>
      {/* ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.72, 4.9, 0]} scale={[0.12, 0.45, 0.2]}>
          <sphereGeometry args={[1, 8, 8]} />
          {gold}
        </mesh>
      ))}
      {/* ushnisha */}
      <mesh position={[0, 5.75, 0]}>
        <sphereGeometry args={[0.4, 16, 12]} />
        {gold}
      </mesh>
      <mesh position={[0, 6.3, 0]}>
        <coneGeometry args={[0.15, 0.6, 10]} />
        {gold}
      </mesh>
      {/* halo */}
      <mesh position={[0, 5.0, -0.9]}>
        <torusGeometry args={[1.4, 0.08, 8, 48]} />
        <meshStandardMaterial color="#ffd77a" emissive="#ffb53a" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

export function Tower({ position, tiers = 3, label }: { position: [number, number, number]; tiers?: number; label?: string }) {
  return (
    <group position={position} name={label}>
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
              <meshStandardMaterial color={WOOD} />
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
  return (
    <group position={[0, 0, z]}>
      {[-6, -2.2, 2.2, 6].map((x) => (
        <mesh key={x} position={[x, 4, 0]} castShadow>
          <boxGeometry args={[1.2, 8, 1.2]} />
          <meshStandardMaterial color="#d8cfbd" />
        </mesh>
      ))}
      <Roof w={6} d={2.5} h={1.6} y={8} />
      {[-4.1, 4.1].map((x) => (
        <Roof key={x} w={3.2} d={2} h={1.2} y={6.5} />
      )).map((r, i) => (
        <group key={i} position={[i === 0 ? -4.1 : 4.1, 0, 0]}>
          {r}
        </group>
      ))}
    </group>
  );
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
      {[
        [0, d / 2, w + 1.4, 1],
        [0, -d / 2, w + 1.4, 1],
      ].map(([x, z, l], i) => (
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
      {[
        [-5, 5, 0, 6],
        [5, 6, 0, 7],
        [0, 9, -3, 7],
        [-3, 3, 2, 4],
        [4, 3, 2, 4],
      ].map(([x, y, z, r], i) => (
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
