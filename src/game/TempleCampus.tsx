import { useMemo } from 'react';
import * as THREE from 'three';
import { BUILDINGS, SCENE_COLORS as C } from './templeData';
import { Roof, Buddha } from './Architecture';
import { Surface } from './Materials';
import { CarvedPanel, Inscription } from './TempleDetails';

function CampusBuilding({ building }: { building: typeof BUILDINGS[number] }) {
  const b = building;
  return <group position={[b.x, 0, b.z]} name={b.label}>
    <mesh position={[0, 0.15, 0]} receiveShadow><boxGeometry args={[b.w + 2, 0.3, b.d + 2]} /><Surface kind="stone" repeat={3} /></mesh>
    <mesh position={[0, b.h / 2 + 0.3, -b.d / 2]} castShadow><boxGeometry args={[b.w, b.h, 0.5]} /><Surface kind="wood" repeat={3} /></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * b.w / 2, b.h / 2 + 0.3, 0]} castShadow><boxGeometry args={[0.5, b.h, b.d]} /><Surface kind="wood" repeat={3} /></mesh>
      <mesh position={[side * b.w / 3, b.h / 2 + 0.3, b.d / 2]} castShadow><boxGeometry args={[b.w / 3, b.h, 0.5]} /><Surface kind="wood" repeat={2} /></mesh>
      <CarvedPanel position={[side * b.w / 3, b.h * 0.55, b.d / 2 + 0.3]} w={b.w / 4} h={b.h * 0.65} />
      <mesh position={[side * b.w / 6, b.h / 2 + 0.3, b.d / 2]} castShadow><cylinderGeometry args={[0.24, 0.3, b.h, 12]} /><Surface kind="wood" /></mesh>
    </group>)}
    <Roof w={b.w + 2} d={b.d + 2} h={3.5} y={b.h + 0.3} />
    {/* Formal stone entrance steps and a red-gold open doorway for each campus hall. */}
    <group name={b.label + " - bậc tam cấp"}>
      {[0, 1, 2].map((step) => <mesh key={step} position={[0, 0.12 + step * 0.16, b.d / 2 + 1.15 - step * 0.72]} castShadow receiveShadow>
        <boxGeometry args={[Math.min(b.w * 0.58, 13), 0.24 + step * 0.08, 1.05]} />
        <meshStandardMaterial color={step === 2 ? "#b8ad99" : "#8d897d"} roughness={0.92} />
      </mesh>)}
      {[-1, 1].map((side) => <group key={side} position={[side * Math.min(b.w * 0.22, 4.8), 0, b.d / 2 + 0.38]}>
        <mesh position={[0, b.h * 0.48 + 0.3, 0]} castShadow>
          <boxGeometry args={[0.32, b.h * 0.96, 0.42]} />
          <meshStandardMaterial color={C.lacquer} roughness={0.5} />
        </mesh>
        <mesh position={[0, b.h * 0.48 + 0.3, 0.24]}>
          <boxGeometry args={[0.42, b.h * 0.96 + 0.12, 0.08]} />
          <meshStandardMaterial color={C.gold} metalness={0.58} roughness={0.38} />
        </mesh>
        <mesh position={[0, b.h + 0.38, 0]}>
          <boxGeometry args={[0.8, 0.22, 0.8]} />
          <meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.42} />
        </mesh>
      </group>)}
    </group>
    <Inscription text={b.label} width={b.w * 0.5} height={1.1} position={[0, b.h - 0.4, b.d / 2 + 0.35]} />
    {b.kind === 'ancestral' && <>
      <mesh position={[0, 0.8, -4]} castShadow><boxGeometry args={[10, 1, 4]} /><Surface kind="wood" /></mesh>
      <Buddha position={[0, 1.3, -4]} scale={0.55} />
    </>}
    {b.kind === 'library' && [-1, 1].map(side => <group key={side} position={[side * 9, 0, -2]}>
      <mesh position={[0, 2.2, 0]} castShadow><boxGeometry args={[1.6, 4, 8]} /><Surface kind="wood" /></mesh>
      {[1, 2, 3].map(y => <mesh key={y} position={[-side * 0.86, y, 0]}><boxGeometry args={[0.1, 0.65, 7]} /><meshStandardMaterial color={C.gold} roughness={0.95} /></mesh>)}
    </group>)}
    {b.kind === 'meditation' && Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-6 + i % 4 * 4, 0.4, -5 + Math.floor(i / 4) * 3]}><cylinderGeometry args={[0.7, 0.7, 0.2, 20]} /><meshStandardMaterial color={C.lacquer} roughness={1} /></mesh>)}
    {b.kind === 'guest' && [-1, 1].map(side => <mesh key={side} position={[side * 7, 0.8, -3]} castShadow><boxGeometry args={[4, 1, 6]} /><Surface kind="wood" /></mesh>)}
  </group>;
}

function Bridge() {
  const bridgeLength = 24;
  const halfLength = bridgeLength / 2;
  const geo = useMemo(() => {
    const points = Array.from({ length: 73 }, (_, i) => new THREE.Vector3(
      0,
      0.45 + Math.sin(i / 72 * Math.PI) * 1.1,
      -halfLength + i / 72 * bridgeLength,
    ));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 72, 0.08, 6, false);
  }, []);
  return <group position={[30, 0, 12]} name="Cầu đá hồ sen">
    {Array.from({ length: bridgeLength }, (_, i) => <mesh key={i} position={[0, 0.27 + Math.sin((i + 0.5) / bridgeLength * Math.PI) * 1.1, -halfLength + 0.5 + i]} receiveShadow castShadow><boxGeometry args={[3.2, 0.36, 1.06]} /><Surface kind="stone" /></mesh>)}
    {[-1, 1].map(side => <group key={side} position={[side * 1.5, 0, 0]}>
      <mesh geometry={geo} position={[0, 1, 0]} castShadow><meshStandardMaterial color={C.stone} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, 0.95 + Math.sin(i / 8 * Math.PI) * 1.1, -halfLength + i * (bridgeLength / 8)]} castShadow><boxGeometry args={[0.2, 1.15, 0.2]} /><Surface kind="stone" /></mesh>)}
    </group>)}
  </group>;
}

function Garden() {
  const gravel = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#b8ad98'; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#827967'; ctx.globalAlpha = 0.22; ctx.lineWidth = 2;
      for (let r = 18; r < 700; r += 11) { ctx.beginPath(); ctx.arc(160, 260, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 900; i++) { const x = (i * 73) % 512, y = (i * 137) % 512; ctx.fillStyle = i % 2 ? '#eee5d3' : '#625e50'; ctx.fillRect(x, y, 2, 2); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const steppingStones = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: Math.sin(i * 0.42) * 2.1,
    z: 12 - i * 2.15,
    r: 0.72 + (i % 3) * 0.12,
    rot: i * 0.48,
  })), []);
  const bamboo = useMemo(() => [-1, 1].flatMap((side) =>
    Array.from({ length: 5 }, (_, i) => ({
      x: side * (10.2 + (i % 2) * 1.1),
      z: -5 + i * 2.3,
      h: 5.5 + (i % 3) * 0.8,
      lean: (i % 2 ? 1 : -1) * 0.08,
    }))
  ), []);
  return <group position={[-34, 0, 24]} name="Vườn thiền Tâm An">
    {/* Quiet circular garden, framed by a low carved stone border. */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} receiveShadow>
      <circleGeometry args={[15, 80]} /><meshStandardMaterial map={gravel} roughness={1} />
    </mesh>
    <mesh rotation-x={Math.PI / 2} position={[0, 0.16, 0]}>
      <torusGeometry args={[14.55, 0.22, 10, 96]} /><meshStandardMaterial color="#8e8879" roughness={0.9} />
    </mesh>
    {/* A small reflective lotus pond is the calm centre of the garden. */}
    <group position={[0, 0.12, -1.8]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[4.65, 64]} /><meshStandardMaterial color="#526f70" roughness={0.22} metalness={0.22} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.02, 0]} scale={[1, 0.78, 1]}>
        <torusGeometry args={[4.55, 0.2, 10, 64]} /><meshStandardMaterial color="#aaa18c" roughness={0.82} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.399;
        const x = Math.cos(a) * (1.1 + (i % 3) * 0.85);
        const z = Math.sin(a) * (1.0 + (i % 2) * 0.75);
        return <group key={i} position={[x, 0.12, z]} rotation-y={a}>
          <mesh rotation-x={-Math.PI / 2} scale={[1, 0.68, 1]}>
            <circleGeometry args={[0.48, 20]} /><meshStandardMaterial color="#527d48" roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          {i % 3 === 0 && <group position={[0, 0.16, 0]}>
            <mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#f1b5c5" roughness={0.65} /></mesh>
            {Array.from({ length: 5 }, (_, p) => <mesh key={p} position={[Math.cos(p * Math.PI * 2 / 5) * 0.16, 0.1, Math.sin(p * Math.PI * 2 / 5) * 0.16]} rotation-x={-0.3}>
              <sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#f5d3dc" roughness={0.7} />
            </mesh>)}
          </group>}
        </group>;
      })}
    </group>
    {/* Natural stepping-stone path leading gently towards the water. */}
    {steppingStones.map((s, i) => <mesh key={i} position={[s.x, 0.2, s.z]} rotation-y={s.rot} rotation-x={-0.04} castShadow receiveShadow>
      <cylinderGeometry args={[s.r, s.r * 1.08, 0.28, 7]} /><meshStandardMaterial color={i % 2 ? '#aaa18f' : '#c2b9a6'} roughness={0.96} />
    </mesh>)}
    {/* Layered mossy rocks soften the pond edge. */}
    {Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2 + 0.2;
      const r = 6.1 + (i % 3) * 0.55;
      const scale = 0.7 + (i % 4) * 0.13;
      return <group key={i} position={[Math.cos(a) * r, 0.15, Math.sin(a) * r]}>
        <mesh position={[0, 0.48 * scale, 0]} scale={[1.25 * scale, 0.8 * scale, scale]} castShadow>
          <dodecahedronGeometry args={[1, 1]} /><meshStandardMaterial color={i % 2 ? '#777b68' : '#8c8b76'} roughness={1} />
        </mesh>
        <mesh position={[0.12, 0.91 * scale, 0.02]} scale={[0.75 * scale, 0.18 * scale, 0.65 * scale]}>
          <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#657b50" roughness={1} />
        </mesh>
      </group>;
    })}
    {/* Bamboo grove: segmented stalks and fine leaves, kept at the garden edge. */}
    {bamboo.map((b, i) => <group key={i} position={[b.x, 0, b.z]} rotation-z={b.lean}>
      <mesh position={[0, b.h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.15, b.h, 9]} /><meshStandardMaterial color="#66804b" roughness={0.82} />
      </mesh>
      {Array.from({ length: 5 }, (_, n) => <mesh key={n} position={[0, 0.5 + n * (b.h / 5), 0]}>
        <torusGeometry args={[0.115, 0.025, 5, 10]} /><meshStandardMaterial color="#a6a16a" roughness={0.8} />
      </mesh>)}
      {[2, 3, 4].map((n) => <group key={n} position={[0, n * (b.h / 5), 0]}>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 0.48, 0.28, 0]} rotation-z={side * -0.62}>
          <coneGeometry args={[0.12, 1.05, 5]} /><meshStandardMaterial color="#78945b" side={THREE.DoubleSide} roughness={0.9} />
        </mesh>)}
      </group>)}
    </group>)}
    {/* Two warm stone lanterns mark the entrance without blocking the path. */}
    {[-1, 1].map(side => <group key={side} position={[side * 7.7, 0, 11]}>
      <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[0.24, 0.34, 1.3, 8]} /><meshStandardMaterial color="#89877b" roughness={1} /></mesh>
      <mesh position={[0, 1.38, 0]}><boxGeometry args={[0.9, 0.16, 0.9]} /><meshStandardMaterial color="#77776d" roughness={1} /></mesh>
      <mesh position={[0, 1.68, 0]}><boxGeometry args={[0.58, 0.48, 0.58]} /><meshStandardMaterial color="#d7b879" emissive="#d39a4e" emissiveIntensity={0.35} /></mesh>
      <mesh position={[0, 1.98, 0]}><coneGeometry args={[0.62, 0.28, 4]} /><meshStandardMaterial color="#77776d" roughness={1} /></mesh>
    </group>)}
    {/* Bodhi tree: a calm focal point with a broad canopy and visible spreading roots. */}
    <group position={[0, 0, -10.7]} name="Cây bồ đề vườn thiền">
      <mesh position={[0, 2.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.78, 5.3, 14]} />
        <meshStandardMaterial color="#72513a" roughness={0.96} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = i * Math.PI * 2 / 7;
        return <group key={i} rotation-y={a}>
          <mesh position={[0.34, 0.34, 0]} rotation-z={-0.42} castShadow>
            <coneGeometry args={[0.22, 1.45, 8]} />
            <meshStandardMaterial color="#76543a" roughness={0.96} />
          </mesh>
          <mesh position={[0.12, 0.18, 0]} rotation-z={-0.2} castShadow>
            <coneGeometry args={[0.17, 0.95, 8]} />
            <meshStandardMaterial color="#76543a" roughness={0.96} />
          </mesh>
        </group>;
      })}
      {Array.from({ length: 13 }, (_, i) => {
        const a = i * 2.399;
        const ring = i % 3;
        const x = Math.cos(a) * (1.9 + ring * 0.65);
        const z = Math.sin(a) * (1.65 + ring * 0.48);
        const y = 5.1 + (i % 4) * 0.62;
        const size = 1.45 + (i % 3) * 0.22;
        return <mesh key={i} position={[x, y, z]} scale={[size * 1.18, size * 0.78, size]} castShadow receiveShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#55784b" : "#668a56"} roughness={0.94} />
        </mesh>;
      })}
      <mesh position={[0, 0.12, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[2.15, 0.12, 8, 48]} />
        <meshStandardMaterial color="#a99b7e" roughness={0.95} />
      </mesh>
    </group>
    <Inscription text="VƯỜN THIỀN" width={5} height={1} position={[0, 1.6, 14.1]} stone />
  </group>;
}


function BoundaryWalls() {
  // A continuous Vietnamese temple enclosure with a wide central entrance.
  // The front opening aligns with the existing Tam Quan at z=112.
  const runs = [
    { x: 0, z: -185, length: 240, rotation: 0 },
    { x: -120, z: -36.5, length: 297, rotation: Math.PI / 2 },
    { x: 120, z: -36.5, length: 297, rotation: Math.PI / 2 },
    { x: -65, z: 112, length: 110, rotation: 0 },
    { x: 65, z: 112, length: 110, rotation: 0 },
  ];
  return <group name="Tường bao khuôn viên Chùa Tâm An">
    {runs.map((run, index) => <group key={index} position={[run.x, 0, run.z]} rotation-y={run.rotation}>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[run.length, 2.5, 1.15]} />
        <Surface kind="stone" repeat={Math.max(2, Math.round(run.length / 8))} />
      </mesh>
      <mesh position={[0, 2.53, 0]} castShadow>
        <boxGeometry args={[run.length + 0.25, 0.16, 1.35]} />
        <meshStandardMaterial color={C.gold} roughness={0.72} metalness={0.18} />
      </mesh>
      {Array.from({ length: Math.floor(run.length / 12) + 1 }, (_, i) => {
        const offset = -run.length / 2 + i * 12;
        return <group key={i} position={[offset, 0, 0]}>
          <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 2.9, 1.45]} />
            <Surface kind="stone" />
          </mesh>
          <mesh position={[0, 2.95, 0]} castShadow>
            <boxGeometry args={[1.25, 0.22, 1.75]} />
            <meshStandardMaterial color={C.lacquer} roughness={0.82} />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[0.7, 0.08, 1.2]} />
            <meshStandardMaterial color={C.gold} metalness={0.45} roughness={0.5} />
          </mesh>
        </group>;
      })}
    </group>)}
    {/* Low stone entrance markers flank the main approach. */}
    {[-1, 1].map(side => <group key={side} position={[side * 12.5, 0, 112]}>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.5, 1.1, 2]} /><Surface kind="stone" /></mesh>
      <mesh position={[0, 1.18, 0]}><boxGeometry args={[1.9, 0.18, 2.3]} /><meshStandardMaterial color={C.gold} /></mesh>
      <Inscription text={side < 0 ? "TỪ BI" : "AN LẠC"} width={1.1} height={0.65} position={[0, 0.62, 1.02]} stone small />
    </group>)}
  </group>;
}

export function TempleCampus() {
  return <>
    <BoundaryWalls />
    {BUILDINGS.map(b => <CampusBuilding key={b.id} building={b} />)}
    <Bridge /><Garden />
    <group position={[-12, 0, 42]}>
      <mesh position={[0, 1.7, 0]} castShadow><boxGeometry args={[5, 3.4, 0.7]} /><Surface kind="stone" /></mesh>
      <Inscription text="CHÙA TÂM AN" width={4.3} height={0.8} position={[0, 2.8, 0.4]} stone />
      <Inscription text="TỪ BI · TRÍ TUỆ · AN LẠC" width={4.3} height={0.65} position={[0, 1.8, 0.4]} stone small />
      <Inscription text="NƠI TĨNH TÂM VÀ NUÔI DƯỠNG LÒNG THIỆN" width={4.3} height={0.65} position={[0, 0.8, 0.4]} stone small />
    </group>
  </>;
}
