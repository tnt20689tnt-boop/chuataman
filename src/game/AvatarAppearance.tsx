import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { OUTFIT_COLORS, type Outfit, type Hair, type Pose } from "./sim";
import type { Action } from "./store";

export type AvatarAccessory = "neck_mala" | "wrist_mala" | "shoulder_sash";

type BonePose = {
  bone: THREE.Bone;
  base: THREE.Euler;
  side: -1 | 1;
  kind: "arm" | "leg";
};

const cleanName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

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
  const proceduralWalk = useRef(false);

  const model = useMemo(() => {
    const copy = clone(gltf.scene);
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const meshName = object.name.toLowerCase();
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map((original) => {
        const material = original.clone();
        const label = meshName + " " + material.name.toLowerCase();
        if (/hair|toc|ponytail|bun/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(hairColor);
        } else if (!/skin|body|face|hand|arm|leg|eye|teeth|lash/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(OUTFIT_COLORS[outfit]);
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    return copy;
  }, [gltf.scene, outfit, hairColor]);

  const { actions, names } = useAnimations(gltf.animations, root);
  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const unitScale = 1.8 / Math.max(size.y, 0.001);
  const neckY = bounds.min.y + size.y * 0.72;

  const bones = useMemo<BonePose[]>(() => {
    const result: BonePose[] = [];
    model.traverse((object) => {
      if (!(object instanceof THREE.Bone)) return;
      const n = cleanName(object.name);
      const left = n.includes("left") || /mixamorigl(upperarm|arm|upleg|thigh)/.test(n) || /^(l|l_)(upperarm|upleg|thigh)/.test(n);
      const right = n.includes("right") || /mixamorigr(upperarm|arm|upleg|thigh)/.test(n) || /^(r|r_)(upperarm|upleg|thigh)/.test(n);
      if (!left && !right) return;
      const side: -1 | 1 = left ? 1 : -1;
      if (/upperarm|shoulder|mixamorigleftarm|mixamorigrightarm/.test(n) || /^(leftarm|rightarm|lupperarm|rupperarm)$/.test(n)) {
        result.push({ bone: object, base: object.rotation.clone(), side, kind: "arm" });
      } else if (/upleg|thigh/.test(n)) {
        result.push({ bone: object, base: object.rotation.clone(), side, kind: "leg" });
      }
    });
    return result;
  }, [model]);

  useLayoutEffect(() => {
    const all = names.map((name) => ({ name, clip: actions[name] })).filter((item) => item.clip);
    all.forEach(({ clip }) => clip!.stop());
    const walk = pose === "walk"
      ? all.find(({ name }) => /walk|walking|run|locomotion/i.test(name))
      : undefined;
    const preferred = action === "le" || pose === "kneel" ? /kneel|bow|prostrate/i
      : action === "thien" || pose === "sit" ? /sit|meditat/i
      : action === "chap" || pose === "pray" ? /pray|idle|stand/i
      : /idle|stand|breath/i;
    const idle = pose === "walk" ? undefined : all.find(({ name }) => preferred.test(name));
    const chosen = walk ?? idle;
    proceduralWalk.current = pose === "walk" && !walk;
    if (chosen?.clip) chosen.clip.reset().fadeIn(0.18).play();
    return () => { chosen?.clip?.fadeOut(0.12); };
  }, [actions, names, pose, action]);

  useFrame(({ clock }, delta) => {
    if (!proceduralWalk.current) return;
    const t = clock.elapsedTime;
    const blend = 1 - Math.exp(-delta * 16);
    const phase = t * 8.5;
    for (const item of bones) {
      const swing = Math.sin(phase) * (item.kind === "leg" ? 0.48 : 0.18) * item.side;
      // The hips/upper legs alternate to create real steps; arms counter-swing
      // gently instead of remaining stretched out like an airplane.
      const targetX = item.base.x + swing;
      item.bone.rotation.x += (targetX - item.bone.rotation.x) * blend;
      item.bone.rotation.y += (item.base.y - item.bone.rotation.y) * blend;
      const targetZ = item.kind === "arm" ? item.base.z + item.side * 0.9 : item.base.z;
      item.bone.rotation.z += (targetZ - item.bone.rotation.z) * blend;
    }
  });

  return (
    <group ref={root}>
      <group position={[-center.x * unitScale, -bounds.min.y * unitScale, -center.z * unitScale]} scale={unitScale}>
        {/* The supplied GLBs are authored facing the model's local +X axis.
            Rotate the complete avatar once so local forward matches the game's +Z heading. */}
        <group rotation-y={Math.PI / 2}>
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
    </group>
  );
}

useGLTF.preload("/models/male_animated.glb");
useGLTF.preload("/models/female_animated.glb");
