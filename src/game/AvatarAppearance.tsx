import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { OUTFIT_COLORS, type Outfit, type Hair } from "./sim";

export type AvatarAccessory = "neck_mala" | "wrist_mala" | "shoulder_sash";

export function AnimatedAvatarAppearance({
  modelId, outfit, hair, hairColor, accessory,
}: {
  modelId: "male_animated" | "female_animated";
  outfit: Outfit;
  hair: Hair;
  hairColor: string;
  accessory: AvatarAccessory;
}) {
  const path = modelId === "female_animated" ? "/models/female_animated.glb" : "/models/male_animated.glb";
  const gltf = useGLTF(path);
  const root = useRef<THREE.Group>(null);
  const model = useMemo(() => {
    const copy = clone(gltf.scene);
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const meshName = object.name.toLowerCase();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const updated = materials.map((original) => {
        const material = original.clone();
        const materialName = material.name.toLowerCase();
        if (/hair|tóc|ponytail|bun/.test(meshName + " " + materialName) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(hairColor);
        } else if (/robe|cloth|clothes|outfit|shirt|dress|garment| áo|ao_trang/.test(meshName + " " + materialName) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(OUTFIT_COLORS[outfit]);
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? updated : updated[0];
    });
    return copy;
  }, [gltf.scene, outfit, hairColor]);
  const { actions } = useAnimations(gltf.animations, root);
  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const scale = Math.max(size.x, size.z, 0.7);
  const neckY = bounds.min.y + size.y * 0.68;
  useLayoutEffect(() => {
    const action = Object.values(actions).find(Boolean);
    action?.reset().fadeIn(0.25).play();
    return () => { action?.fadeOut(0.2); };
  }, [actions]);

  return (
    <group ref={root}>
      <primitive object={model} />
      {hair === "bui" && <mesh position={[center.x, bounds.max.y - size.y * 0.045, center.z - size.z * 0.12]} castShadow>
        <sphereGeometry args={[scale * 0.075, 16, 12]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>}
      {hair === "dai" && <mesh position={[center.x, bounds.min.y + size.y * 0.79, center.z - size.z * 0.19]} rotation-x={-0.12} castShadow>
        <capsuleGeometry args={[scale * 0.065, size.y * 0.18, 5, 10]} />
        <meshStandardMaterial color={hairColor} roughness={0.92} />
      </mesh>}
      {accessory === "neck_mala" && <group position={[center.x, neckY, center.z + size.z * 0.015]}>
        <mesh rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[scale * 0.145, scale * 0.018, 8, 48]} />
          <meshStandardMaterial color="#70452d" roughness={0.72} />
        </mesh>
        <mesh position={[0, -scale * 0.14, scale * 0.01]}>
          <sphereGeometry args={[scale * 0.035, 12, 10]} />
          <meshStandardMaterial color="#c49a54" metalness={0.2} roughness={0.55} />
        </mesh>
      </group>}
      {accessory === "wrist_mala" && [-1, 1].map((side) => <mesh key={side} position={[center.x + side * scale * 0.24, bounds.min.y + size.y * 0.58, center.z + size.z * 0.12]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[scale * 0.055, scale * 0.014, 7, 24]} />
        <meshStandardMaterial color="#70452d" roughness={0.8} />
      </mesh>)}
      {accessory === "shoulder_sash" && <mesh position={[center.x, bounds.min.y + size.y * 0.64, center.z + size.z * 0.18]} rotation-z={-0.38} castShadow>
        <boxGeometry args={[scale * 0.12, size.y * 0.42, scale * 0.025]} />
        <meshStandardMaterial color="#c49a54" roughness={0.75} />
      </mesh>}
    </group>
  );
}

useGLTF.preload("/models/male_animated.glb");
useGLTF.preload("/models/female_animated.glb");
