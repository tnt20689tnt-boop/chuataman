import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Surface } from './Materials';
import { SCENE_COLORS as C } from './templeData';
import { disableAudio, enableAudio, getAudioSettings, subscribeAudioSettings } from './audio';

function LotusRelief() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const g = canvas.getContext('2d');
    if (!g) return new THREE.Texture();
    g.fillStyle = C.ceiling; g.fillRect(0, 0, 512, 512);
    g.translate(256, 256); g.strokeStyle = C.ceilingRelief; g.lineWidth = 3;
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 12; i++) {
      g.save(); g.rotate(i * Math.PI / 6 + layer * Math.PI / 12);
      g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-65, -55, -60, -125, 0, -180 + layer * 45);
      g.bezierCurveTo(60, -125, 65, -55, 0, 12); g.stroke(); g.restore();
    }
    for (const r of [24, 205, 223]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <>{[-12, -6, 0, 6, 12].flatMap(x => [-6, 0, 6].map(z =>
    <mesh key={`${x}-${z}`} position={[x, 9.12, z]} rotation-x={Math.PI / 2}>
      <planeGeometry args={[5.65, 5.65]} /><meshStandardMaterial map={texture} roughness={0.85} />
    </mesh>))}</>;
}

function Vase({ x }: { x: number }) {
  const shape = useMemo(() => new THREE.LatheGeometry([
    new THREE.Vector2(0.24, 0), new THREE.Vector2(0.4, 0.12), new THREE.Vector2(0.52, 0.55),
    new THREE.Vector2(0.45, 0.92), new THREE.Vector2(0.2, 1.18), new THREE.Vector2(0.2, 1.4), new THREE.Vector2(0.28, 1.48),
  ], 24), []);
  return <group position={[x, 1.78, -2.9]}>
    <mesh geometry={shape} castShadow><meshStandardMaterial color={C.porcelain} roughness={0.24} metalness={0.12} /></mesh>
    {[0.2, 0.8, 1.35].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
      <torusGeometry args={[y === 0.8 ? 0.49 : 0.26, 0.018, 5, 24]} /><meshStandardMaterial color={C.porcelainInk} />
    </mesh>)}
    {[-1, 0, 1].map((i) => <group key={i} position={[i * 0.26, 2.1 + (i === 0 ? 0.35 : 0), i * 0.1]}>
      <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.018, 0.024, 1.25, 6]} /><meshStandardMaterial color={C.foliage} /></mesh>
      {Array.from({ length: 7 }, (_, j) => <mesh key={j} position={[Math.cos(j * Math.PI * 2 / 7) * 0.14, 0, Math.sin(j * Math.PI * 2 / 7) * 0.14]} rotation-z={0.4} scale={[0.12, 0.24, 0.13]}>
        <sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={C.porcelain} roughness={0.7} />
      </mesh>)}
    </group>)}
  </group>;
}

function Candle({ x }: { x: number }) {
  return <group position={[x, 1.78, -2.6]}>
    <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.35, 0.4, 0.2, 20]} /><meshStandardMaterial color={C.altarGold} metalness={0.7} roughness={0.35} /></mesh>
    <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.07, 0.14, 0.9, 16]} /><meshStandardMaterial color={C.altarGold} metalness={0.65} roughness={0.35} /></mesh>
    <mesh position={[0, 1.06, 0]}><cylinderGeometry args={[0.27, 0.15, 0.13, 20]} /><meshStandardMaterial color={C.altarGold} metalness={0.65} /></mesh>
    <mesh position={[0, 1.35, 0]}><cylinderGeometry args={[0.09, 0.09, 0.5, 12]} /><meshStandardMaterial color={C.candle} /></mesh>
    <mesh position={[0, 1.65, 0]} scale={[0.045, 0.13, 0.045]}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color={C.flame} /></mesh>
  </group>;
}

export function HallInterior() {
  return <group name="Nội thất chính điện sơn son thếp vàng">
    <LotusRelief />
    {[-9, -3, 3, 9].map(z => <mesh key={z} position={[0, 9, z]}><boxGeometry args={[38, 0.28, 0.28]} /><Surface kind="wood" /></mesh>)}
    {[-15, -9, -3, 3, 9, 15].map(x => <mesh key={x} position={[x, 9, 0]}><boxGeometry args={[0.28, 0.28, 22]} /><Surface kind="wood" /></mesh>)}
    <mesh position={[0, 1.66, -4]} castShadow><boxGeometry args={[10.3, 0.16, 4.15]} /><meshStandardMaterial color={C.altarGold} roughness={0.38} metalness={0.55} /></mesh>
    <mesh position={[0, 1, -1.98]}><boxGeometry args={[9.5, 1.03, 0.08]} /><meshStandardMaterial color={C.altarRed} roughness={0.38} /></mesh>
    {[-4.6, -2.3, 0, 2.3, 4.6].map(x => <group key={x} position={[x, 0.95, -1.9]}>
      <mesh><boxGeometry args={[0.08, 1.2, 0.08]} /><meshStandardMaterial color={C.altarGold} metalness={0.55} /></mesh>
      <mesh rotation-z={Math.PI / 4} scale={[1, 0.7, 1]}><torusGeometry args={[0.32, 0.035, 6, 20]} /><meshStandardMaterial color={C.altarGold} metalness={0.55} /></mesh>
    </group>)}
    <Vase x={-4.1} /><Vase x={4.1} /><Candle x={-2.8} /><Candle x={2.8} />
    {[-1, 1].map(side => <mesh key={side} position={[side * 1.7, 1.85, -2.7]}><cylinderGeometry args={[0.48, 0.25, 0.12, 24]} /><meshStandardMaterial color={C.altarGold} metalness={0.6} roughness={0.35} /></mesh>)}
    <spotLight position={[0, 8.7, 1]} target-position={[0, 4, -6.5]} intensity={80} distance={22} angle={0.48} penumbra={0.9} decay={2} color={C.warmLight} />
  </group>;
}

export function HallChantControl() {
  const [enabled, setEnabled] = useState(getAudioSettings().enabled);
  useEffect(() => { const unsubscribe = subscribeAudioSettings(() => setEnabled(getAudioSettings().enabled)); return () => { unsubscribe(); }; }, []);
  return <Html position={[0, 2.1, 10.5]} center distanceFactor={10}>
    <Button variant="secondary" size="sm" onClick={() => enabled ? disableAudio() : void enableAudio()} aria-pressed={enabled}>
      {enabled ? <VolumeX size={16} /> : <Volume2 size={16} />}{enabled ? 'Tắt âm thanh' : 'Nghe A Di Đà Phật'}
    </Button>
  </Html>;
}