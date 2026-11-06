import { useMemo } from 'react';
import * as THREE from 'three';
import { Surface } from './Materials';
import { SCENE_COLORS as C } from './templeData';

// Canvas text preserves all Vietnamese accents without remote font dependencies.
export function Inscription({ text, width, height, position, stone = false, small = false }: { text: string; width: number; height: number; position: [number, number, number]; stone?: boolean; small?: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    ctx.fillStyle = stone ? C.stone : C.woodDark; ctx.fillRect(0, 0, 2048, 512);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 9; ctx.strokeRect(22, 22, 2004, 468); ctx.lineWidth = 3; ctx.strokeRect(44, 44, 1960, 424);
    let size = small ? 110 : 180;
    ctx.font = `bold ${size}px Georgia, "Times New Roman", serif`;
    while (ctx.measureText(text).width > 1840 && size > 40) { size -= 4; ctx.font = `bold ${size}px Georgia, "Times New Roman", serif`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = C.woodDark; ctx.shadowBlur = 3; ctx.shadowOffsetY = 5;
    ctx.fillStyle = stone ? C.woodDark : C.gold; ctx.fillText(text, 1024, 264);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; return map;
  }, [text, stone, small]);
  return <group position={position} name={text}>
    <mesh castShadow><boxGeometry args={[width + 0.12, height + 0.12, 0.25]} /><Surface kind={stone ? 'stone' : 'wood'} /></mesh>
    <mesh position={[0, 0, 0.132]}><planeGeometry args={[width, height]} /><meshStandardMaterial map={texture} roughness={0.55} /></mesh>
  </group>;
}

export function CarvedPanel({ position, w = 2, h = 4 }: { position: [number, number, number]; w?: number; h?: number }) {
  const lattice = useMemo(() => {
    const geo = new THREE.BufferGeometry(); const vertices: number[] = [];
    for (let x = -w / 2 + 0.12; x < w / 2; x += 0.25) { vertices.push(x, -h / 2, 0.04, x, h / 2, 0.04); }
    for (let y = -h / 2 + 0.12; y < h / 2; y += 0.28) { vertices.push(-w / 2, y, 0.04, w / 2, y, 0.04); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); return geo;
  }, [w, h]);
  return <group position={position}>
    <mesh castShadow><boxGeometry args={[w, h, 0.12]} /><Surface kind="wood" color={C.woodDark} /></mesh>
    <lineSegments geometry={lattice}><lineBasicMaterial color={C.gold} /></lineSegments>
    <mesh rotation-z={Math.PI / 4} position={[0, 0, 0.11]}><torusGeometry args={[w * 0.3, 0.025, 5, 24]} /><meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.5} /></mesh>
  </group>;
}