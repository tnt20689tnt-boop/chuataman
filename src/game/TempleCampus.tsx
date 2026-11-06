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
  const geo = useMemo(() => {
    const points = Array.from({ length: 49 }, (_, i) => new THREE.Vector3(0, 0.45 + Math.sin(i / 48 * Math.PI) * 1.1, -12 + i / 48 * 24));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.08, 6, false);
  }, []);
  return <group position={[76, 0, -14]} name="Cầu đá hồ sen">
    {Array.from({ length: 24 }, (_, i) => <mesh key={i} position={[0, 0.27 + Math.sin((i + 0.5) / 24 * Math.PI) * 1.1, -11.5 + i]} receiveShadow castShadow><boxGeometry args={[3.2, 0.36, 1.06]} /><Surface kind="stone" /></mesh>)}
    {[-1, 1].map(side => <group key={side} position={[side * 1.5, 0, 0]}>
      <mesh geometry={geo} position={[0, 1, 0]} castShadow><meshStandardMaterial color={C.stone} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, 0.95 + Math.sin(i / 8 * Math.PI) * 1.1, -12 + i * 3]} castShadow><boxGeometry args={[0.2, 1.15, 0.2]} /><Surface kind="stone" /></mesh>)}
    </group>)}
  </group>;
}

function Garden() {
  const gravel = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = C.stone; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = C.roof; ctx.globalAlpha = 0.2;
      for (let r = 20; r < 700; r += 9) { ctx.beginPath(); ctx.arc(160, 260, r, 0, Math.PI * 2); ctx.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return <group position={[-104, 0, 25]} name="Vườn thiền">
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} receiveShadow><circleGeometry args={[15, 48]} /><meshStandardMaterial map={gravel} roughness={1} /></mesh>
    {[-1, 0, 1].map((s, i) => <mesh key={s} position={[s * 4, 1 + i * 0.4, s * 2]} rotation={[0.2, i, 0.1]} scale={[1.8, 1 + i * 0.3, 1.3]} castShadow><dodecahedronGeometry args={[1.3, 2]} /><Surface kind="stone" /></mesh>)}
    <Inscription text="VƯỜN THIỀN" width={5} height={1} position={[0, 1.6, 15]} stone />
  </group>;
}

export function TempleCampus() {
  return <>
    {BUILDINGS.map(b => <CampusBuilding key={b.id} building={b} />)}
    <Bridge /><Garden />
    <Inscription text="NHÀ GIẢNG PHÁP" width={9} height={1} position={[70, 4.4, 58.2]} />
    <Inscription text="HỒ SEN" width={5} height={1} position={[59, 1.6, 0]} stone />
    <group position={[-12, 0, 42]}>
      <mesh position={[0, 1.7, 0]} castShadow><boxGeometry args={[5, 3.4, 0.7]} /><Surface kind="stone" /></mesh>
      <Inscription text="CHÙA TÂM AN" width={4.3} height={0.8} position={[0, 2.8, 0.4]} stone />
      <Inscription text="TỪ BI · TRÍ TUỆ · AN LẠC" width={4.3} height={0.65} position={[0, 1.8, 0.4]} stone small />
      <Inscription text="NƠI TĨNH TÂM VÀ NUÔI DƯỠNG LÒNG THIỆN" width={4.3} height={0.65} position={[0, 0.8, 0.4]} stone small />
    </group>
  </>;
}