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

  // Keep the skinned model instance stable when the user changes clothes.
  // Replacing the cloned skeleton after useAnimations has bound its tracks leaves
  // the new model in its bind/T-pose (arms spread, no leg movement).
  const model = useMemo(() => {
    const copy = clone(gltf.scene);
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = (Array.isArray(object.material) ? object.material : [object.material])
        .map((original) => original.clone());
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    return copy;
  }, [gltf.scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const meshName = object.name.toLowerCase();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const label = meshName + " " + material.name.toLowerCase();
        if (!material.map && /hair|toc|ponytail|bun/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(hairColor);
        } else if (!material.map && !/skin|body|face|hand|arm|leg|eye|teeth|lash/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(OUTFIT_COLORS[outfit]);
        }
      });
    });
  }, [model, outfit, hairColor]);

  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const unitScale = 1.8 / Math.max(size.y, 0.001);
  const neckY = bounds.min.y + size.y * 0.72;

  const clips = useMemo(() => {
    // Collect the scene/armature ancestors and skeleton root/hips bones.
    // Exporters do not use one consistent name for the node carrying root motion.
    const rootMotionNames = new Set<string>();
    model.traverse((object) => {
      if (!(object instanceof THREE.SkinnedMesh)) return;
      let parent: THREE.Object3D | null = object;
      while (parent && parent !== model) {
        if (parent.name) rootMotionNames.add(parent.name.toLowerCase());
        parent = parent.parent;
      }
      const bones = object.skeleton?.bones ?? [];
      bones.forEach((bone) => {
        const parentIsBone = bone.parent && bones.includes(bone.parent as THREE.Bone);
        if (!parentIsBone || /root|hips/i.test(bone.name)) {
          if (bone.name) rootMotionNames.add(bone.name.toLowerCase());
        }
      });
    });

    return gltf.animations.map((source) => {
      const clip = source.clone();
      // The game controller owns world X/Z position. Lock horizontal translation
      // on root/hips/armature nodes and on ancestors of the skinned mesh. Preserve
      // vertical hip motion so the walk cycle still has its natural body bounce.
      clip.tracks = clip.tracks.filter((track) => {
        if (!/\.position$/i.test(track.name)) return true;

        let nodeName = "";
        let objectIndex = "";
        try {
          const parsed = THREE.PropertyBinding.parseTrackName(track.name);
          nodeName = String(parsed.nodeName ?? "").toLowerCase();
          objectIndex = String(parsed.objectIndex ?? "").toLowerCase();
        } catch {
          // Fall back to the full track name for unusual exporter track paths.
        }
        const target = [nodeName, objectIndex, track.name.toLowerCase()].join(" ");
        const isRootMotion =
          /(root|hips|armature)/i.test(target) ||
          [...rootMotionNames].some((name) => name.length > 0 && target.includes(name));
        if (!isRootMotion) return true;

        const values = track.values as Float32Array;
        const stride = track.getValueSize();
        if (stride < 3 || values.length < stride) return false;
        const firstX = values[0];
        const firstZ = values[2];
        for (let i = 0; i + 2 < values.length; i += stride) {
          values[i] = firstX;
          values[i + 2] = firstZ;
        }
        return true;
      });
      return clip;
    });
  }, [gltf.animations, model]);
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

    // Some supplied GLBs contain a walk clip but no separate run clip.
    // In that case keep the walk cycle and speed up its cadence to match
    // the faster world movement instead of letting the feet lag behind.
    const selected = desired === "run" && !actions.run ? "walk" : desired;
    const playbackRate = desired === "run" ? (selected === "walk" ? 1.85 : 1.25) : 1;

    // Run may use the same walk clip, so update its playback rate even when
    // the selected clip name has not changed.
    if (activeClip.current === selected) {
      actions[selected]?.setEffectiveTimeScale(playbackRate);
      return;
    }

    actions[activeClip.current]?.fadeOut(0.12);
    const next = actions[selected];
    if (next) {
      next.reset();
      next.enabled = true;
      next.setEffectiveTimeScale(playbackRate);
      const oneShot = selected === "prayer" || selected === "kneel" || selected === "turn";
      next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
      next.clampWhenFinished = oneShot;
      next.fadeIn(0.12).play();
    }
    activeClip.current = selected;
  });

  return (
    <group ref={root}>
      <group position={[-center.x * unitScale, -bounds.min.y * unitScale, -center.z * unitScale]} scale={unitScale}>
        {/* The supplied GLBs face local +X; rotate -90 degrees so forward matches the game's -Z heading. */}
        <group rotation-y={-Math.PI / 2}>
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
