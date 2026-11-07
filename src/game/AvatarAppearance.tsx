import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { OUTFIT_COLORS, type Outfit, type Hair, type Pose } from "./sim";
import { input, type Action } from "./store";

export type AvatarAccessory = "neck_mala" | "wrist_mala" | "shoulder_sash";

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
  const path = modelId === "female_animated" ? "/models/female_custom_poses.glb" : "/models/male_custom_poses.glb";
  const gltf = useGLTF(path);
  const root = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const copy = clone(gltf.scene);
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const meshName = object.name.toLowerCase();
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map((original) => {
        const material = original.clone();
        const label = meshName + " " + material.name.toLowerCase();
        if (!material.map && /hair|toc|ponytail|bun/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(hairColor);
        } else if (!material.map && !/skin|body|face|hand|arm|leg|eye|teeth|lash/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(OUTFIT_COLORS[outfit]);
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    return copy;
  }, [gltf.scene, outfit, hairColor]);

  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const unitScale = 1.8 / Math.max(size.y, 0.001);
  const neckY = bounds.min.y + size.y * 0.72;

  const clips = useMemo(() => gltf.animations.map((source) => {
    const clip = source.clone();
    // The game controller owns world position. Remove exported root translation
    // so walk/run clips animate the skeleton without sliding the avatar across the map.
    clip.tracks = clip.tracks.filter((track) => track.name !== "Root.position");
    return clip;
  }), [gltf.animations]);
  const { actions } = useAnimations(clips, root);
  const activeClip = useRef("");

  useEffect(() => {
    activeClip.current = "";
    return () => Object.values(actions).forEach((clip) => clip?.stop());
  }, [actions]);

  useFrame(() => {
    const desired =
      action === "chap" ? "prayer" :
      action === "le" ? "kneel" :
      action === "thien" || action === "kinh" ? "meditation" :
      action === "none" && pose === "walk" ? (input.run ? "run" : "walk") :
      "idle";
    if (activeClip.current === desired) return;
    actions[activeClip.current]?.fadeOut(0.18);
    const next = actions[desired];
    if (next) {
      next.reset();
      next.enabled = true;
      const oneShot = desired === "prayer" || desired === "kneel" || desired === "turn";
      next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
      next.clampWhenFinished = oneShot;
      next.fadeIn(0.18).play();
    }
    activeClip.current = desired;
  });

  return (
    <group ref={root}>
      <group position={[-center.x * unitScale, -bounds.min.y * unitScale, -center.z * unitScale]} scale={unitScale}>
        {/* The supplied GLBs face local +X; rotate +90 degrees so forward matches game +Z. */}
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

useGLTF.preload("/models/male_custom_poses.glb");
useGLTF.preload("/models/female_custom_poses.glb");
