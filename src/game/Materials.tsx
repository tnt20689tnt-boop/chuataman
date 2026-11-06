import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import woodColor from '@/assets/materials/wood-color.asset.json';
import woodNormal from '@/assets/materials/wood-normal.asset.json';
import woodRough from '@/assets/materials/wood-roughness.asset.json';
import woodAO from '@/assets/materials/wood-ao.asset.json';
import stoneColor from '@/assets/materials/stone-color.asset.json';
import stoneNormal from '@/assets/materials/stone-normal.asset.json';
import stoneRough from '@/assets/materials/stone-roughness.asset.json';
import stoneAO from '@/assets/materials/stone-ao.asset.json';
import { SCENE_COLORS as C } from './templeData';

export function Surface({ kind, repeat = 1, color }: { kind: 'wood' | 'stone'; repeat?: number; color?: string }) {
  const source = kind === 'wood' ? [woodColor.url, woodNormal.url, woodRough.url, woodAO.url] : [stoneColor.url, stoneNormal.url, stoneRough.url, stoneAO.url];
  const loaded = useTexture(source);
  const maps = useMemo(() => loaded.map((map, i) => {
    const texture = map.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }), [loaded, repeat]);
  return <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} aoMap={maps[3]} aoMapIntensity={0.6} color={color ?? (kind === 'wood' ? C.wood : C.stone)} roughness={0.9} />;
}