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
  const path = modelId === "female_animated" ? "/models/female_animated.glb" : "/models/male_animated.glb";
  const gltf = useGLTF(path);
  const root = useRef<THREE.Group>(null);
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
    const desired = pose === "walk" ? (input.run ? "run" : "walk") : "idle";
    if (activeClip.current === desired) return;
    actions[activeClip.current]?.fadeOut(0.18);
    const next = actions[desired];
    if (next) {
      next.reset();
      next.enabled = true;
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
      next.fadeIn(0.18).play();
    }
    activeClip.current = desired;
  });

  return () => Object.values(actions).forEach((clip) => clip?.stop());
  }, [actions, pose, action]);

  useFrame(({ clock }, delta) => {
    if (!proceduralWalk.current) return;
    const t = clock.elapsedTime;
    const blend = 1 - Math.exp(-delta * 16);
    const phase = t * 5.2;
    for (const item of bones) {
      const swing = Math.sin(phase) * (item.kind === "leg" ? 0.22 : 0.10) * item.side;
      // The hips/upper legs alternate to create real steps; arms counter-swing
      // gently instead of remaining stretched out like an airplane.
      const targetX = item.base.x + swing;
      item.bone.rotation.x += (targetX - item.bone.rotation.x) * blend;
      item.bone.rotation.y += (item.base.y - item.bone.rotation.y) * blend;
      const targetZ = item.kind === "arm" ? item.base.z + item.side * 0.65 : item.base.z;
      item.bone.rotation.z += (targetZ - item.bone.rotation.z) * blend;
    }
  });

  return (
    <group ref={root}>
      <group position={[-center.x * unitScale, -bounds.min.y * unitScale, -center.z * unitScale]} scale={unitScale}>
        {/* Correct the GLB's reversed forward direction relative to the game (+Z). */}
        <group rotation-y={Math.PI}>
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
