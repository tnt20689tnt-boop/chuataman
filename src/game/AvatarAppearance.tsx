import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { OUTFIT_COLORS, type Outfit, type Hair, type Pose } from "./sim";
import type { Action } from "./store";

export type AvatarAccessory = "neck_mala" | "wrist_mala" | "shoulder_sash";

type BonePose = { bone: THREE.Bone; base: THREE.Euler; side: number; kind: "arm" | "leg" | "spine" };

export function AnimatedAvatarAppearance({
  modelId, outfit, hair, hairColor, accessory, pose = "stand", action = "none",
}: {
  modelId: "male_animated" | "female_animated";
  outfit: Outfit;
  hair: Hair;
  hairColor: string;
  accessory: AvatarAccessory;
  pose?: Pose;
  action?: Action;
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
        const label = meshName + " " + materialName;
        if (/hair|tóc|ponytail|bun/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(hairColor);
        } else if (!/skin|body|face|hand|arm|leg|eye|teeth|lash/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(OUTFIT_COLORS[outfit]);
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? updated : updated[0];
    });
    return copy;
  }, [gltf.scene, outfit, hairColor]);
  const { actions, names } = useAnimations(gltf.animations, root);
  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  // All uploaded GLBs are normalized to a human height so the temple's scale is consistent.
  const unitScale = 1.8 / Math.max(size.y, 0.001);
  const width = Math.max(size.x, size.z) * unitScale;
  const neckY = bounds.min.y + size.y * 0.72;
  const bonePoses = useMemo<BonePose[]>(() => {
    const found: BonePose[] = [];
    model.traverse((object) => {
      if (!(object instanceof THREE.Bone)) return;
      const n = object.name.toLowerCase().replace(/[^a-z]/g, "");
      const side = /left|(^|)l(upper|lower|arm|leg|hand|foot)/.test(n) ? 1 : /right|(^|)r(upper|lower|arm|leg|hand|foot)/.test(n) ? -1 : 0;
      if (!side) return;
      if (/arm|shoulder|forearm|hand/.test(n)) found.push({ bone: object, base: object.rotation.clone(), side, kind: "arm" });
      else if (/upleg|thigh|leg|calf|foot/.test(n)) found.push({ bone: object, base: object.rotation.clone(), side, kind: "leg" });
    });
    const spine = model.getObjectByName("mixamorigSpine2") ?? model.getObjectByName("Spine2") ?? model.getObjectByName("spine");
    if (spine instanceof THREE.Bone) found.push({ bone: spine, base: spine.rotation.clone(), side: 0, kind: "spine" });
    return found;
  }, [model]);
  useLayoutEffect(() => {
    const all = names.map((name) => ({ name, action: actions[name] })).filter((item) => item.action);
    // Keep locomotion driven by the same world-space controller as the legacy
    // avatar. Imported walk clips can contain root motion or a different forward
    // axis, which makes the mesh slide/veer away from the direction being pressed.
    // During walking, fade out the imported clip and use the rig's in-place gait below.
    const preferred = action === "le" || pose === "kneel" ? /kneel|bow|prostrate/i
      : action === "thien" || pose === "sit" ? /sit|meditat/i
      : action === "chap" ? /pray|idle|stand/i
      : /idle|stand|breath/i;
    const chosen = pose === "walk" ? undefined
      : all.find((item) => preferred.test(item.name)) ?? all[0];
    if (chosen?.action) chosen.action.reset().fadeIn(0.2).play();
    return () => { chosen?.action?.fadeOut(0.15); };
  }, [actions, names, pose, action]);
  useFrame(({ clock }, delta) => {
    // Animate the GLB rig in place while the legacy controller moves and rotates the avatar.
    const walking = pose === "walk";
    const phase = clock.elapsedTime * 8.5;
    const smooth = 1 - Math.exp(-delta * 12);
    for (const item of bonePoses) {
      const target = item.kind === "arm" && walking ? Math.sin(phase) * 0.42 * item.side
        : item.kind === "leg" && walking ? -Math.sin(phase) * 0.48 * item.side
        : item.kind === "spine" ? Math.sin(clock.elapsedTime * 2) * 0.012 : 0;
      item.bone.rotation.x += ((item.base.x + target) - item.bone.rotation.x) * smooth;
    }
  });

  return (
    <group ref={root}>
      <group position={[-center.x * unitScale, -bounds.min.y * unitScale, -center.z * unitScale]} scale={unitScale}>
        <primitive object={model} />
        {hair === "bui" && <mesh position={[center.x, bounds.max.y - size.y * 0.045, center.z - size.z * 0.12]} castShadow>
          <sphereGeometry args={[Math.max(size.x, size.z) * 0.10, 16, 12]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>}
        {hair === "dai" && <mesh position={[center.x, bounds.min.y + size.y * 0.79, center.z - size.z * 0.19]} rotation-x={-0.12} castShadow>
          <capsuleGeometry args={[Math.max(size.x, size.z) * 0.075, size.y * 0.18, 5, 10]} />
          <meshStandardMaterial color={hairColor} roughness={0.92} />
        </mesh>}
        {accessory === "neck_mala" && <group position={[center.x, neckY, center.z + size.z * 0.04]}>
          <mesh rotation-x={Math.PI / 2} castShadow>
            <torusGeometry args={[size.y * 0.075, size.y * 0.009, 8, 48]} />
            <meshStandardMaterial color="#70452d" roughness={0.72} />
          </mesh>
          <mesh position={[0, -size.y * 0.09, size.z * 0.025]}>
            <sphereGeometry args={[size.y * 0.018, 12, 10]} />
            <meshStandardMaterial color="#c49a54" metalness={0.2} roughness={0.55} />
          </mesh>
        </group>}
        {accessory === "wrist_mala" && [-1, 1].map((side) => <mesh key={side} position={[center.x + side * size.x * 0.31, bounds.min.y + size.y * 0.52, center.z + size.z * 0.20]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[size.y * 0.028, size.y * 0.008, 7, 24]} />
          <meshStandardMaterial color="#70452d" roughness={0.8} />
        </mesh>)}
        {accessory === "shoulder_sash" && <mesh position={[center.x + size.x * 0.08, bounds.min.y + size.y * 0.63, center.z + size.z * 0.22]} rotation-z={-0.28} rotation-y={0.12} castShadow>
          <boxGeometry args={[Math.max(size.x * 0.16, 0.035), size.y * 0.40, Math.max(size.z * 0.055, 0.018)]} />
          <meshStandardMaterial color="#c49a54" roughness={0.75} />
        </mesh>}
      </group>
    </group>
  );
}

useGLTF.preload("/models/male_animated.glb");
useGLTF.preload("/models/female_animated.glb");
