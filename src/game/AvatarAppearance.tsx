import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MOVE, OUTFIT_COLORS, type Outfit, type Hair, type Pose } from "./sim";
import { input, type Action } from "./store";
import { isRootMotionBoneName, stabilizeRootPositionTrack } from "./rootMotion";
import { interactionActionForCompletedClip, type CompletedInteractionAction } from "./interactionAnimation";
import { buildTemplePoseClips } from "./poseClips";

export type AvatarAccessory = "none";
// Measured from the GLB clips: at 1x playback the walk cycle covers ~1.07 and
// the run cycle ~3.65 game units per second. Playback rate = speed / reference
// keeps footsteps exactly matched to world movement (no foot sliding).
const GAIT_REFERENCE_SPEED = { walk: 1.07, run: 3.65 };
// Keep the existing GLB meshes and skeletons, but present both avatars at a
// consistent adult height about 22% larger than the previous 1.8m.
const TARGET_AVATAR_HEIGHT = 2.2;

interface BoneAttachment {
  bone: THREE.Bone;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}

export function AnimatedAvatarAppearance({
  modelId, outfit, outfitColor, hair, hairColor, accessory, pose = "stand", action = "none", onActionComplete,
}: {
  modelId: "male_animated" | "female_animated";
  outfit: Outfit;
  outfitColor?: string | undefined;
  hair: Hair;
  hairColor: string;
  accessory: AvatarAccessory;
  pose?: Pose;
  action?: Action;
  onActionComplete?: (action: CompletedInteractionAction) => void;
}) {
  const path = modelId === "female_animated" ? "/models/female_custom_poses.glb" : "/models/male_custom_poses.glb";
  const gltf = useGLTF(path);
  const root = useRef<THREE.Group>(null);
  const actionRef = useRef(action);
  const onActionCompleteRef = useRef(onActionComplete);
  actionRef.current = action;
  onActionCompleteRef.current = onActionComplete;

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
        if (/hair|toc|ponytail|bun/.test(label) && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.set(hairColor);
        } else if (!/skin|body|face|hand|arm|leg|eye|teeth|lash/.test(label) && "color" in material) {
          // Tint textured clothing too. The previous !material.map guard made
          // outfit changes appear to do nothing for the custom GLB materials.
          (material as THREE.MeshStandardMaterial).color.set(outfitColor ?? OUTFIT_COLORS[outfit]);
        }
      });
    });
  }, [model, outfit, outfitColor, hairColor]);

  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const size = useMemo(() => bounds.getSize(new THREE.Vector3()), [bounds]);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const unitScale = TARGET_AVATAR_HEIGHT / Math.max(size.y, 0.001);
  const neckY = bounds.min.y + size.y * 0.72;

  // Accessories and extra hair attach to bones so they follow every animation
  // (walk, run, prayer, bow, meditation) instead of floating at fixed offsets.
  // Attachments are computed while the clone is still in its bind pose.
  const rig = useMemo(() => {
    model.updateMatrixWorld(true);
    const bones: THREE.Bone[] = [];
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
    });
    // GLB exporters may prefix Mixamo names with an armature/namespace.
    // Resolve by normalized suffix instead of requiring one exact spelling.
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const findBone = (expected: string) => {
      const target = normalize(expected);
      return bones.find((bone) => normalize(bone.name) === target) ??
        bones.find((bone) => normalize(bone.name).endsWith(target)) ?? null;
    };
    const attachAt = (
      bone: THREE.Bone | null,
      world: THREE.Vector3 | null,
      worldQuat = new THREE.Quaternion(),
    ): BoneAttachment | null => {
      if (!bone || !world) return null;
      const pos = bone.worldToLocal(world.clone());
      const quat = bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQuat);
      return { bone, pos, quat };
    };
    const worldPos = (bone: THREE.Bone | null) =>
      bone ? bone.getWorldPosition(new THREE.Vector3()) : null;
    const neck = findBone("mixamorigNeck");
    const head = findBone("mixamorigHead");
    const leftHand = findBone("mixamorigLeftHand");
    const rightHand = findBone("mixamorigRightHand");
    const leftForeArm = findBone("mixamorigLeftForeArm");
    const rightForeArm = findBone("mixamorigRightForeArm");
    const wristPoint = (forearm: THREE.Bone | null, hand: THREE.Bone | null) => {
      const a = worldPos(forearm);
      const b = worldPos(hand);
      return a && b ? a.lerp(b, 0.82) : b;
    };
    const neckPoint = (() => {
      const n = worldPos(neck);
      const h = worldPos(head);
      // Sit the mala at the base of the neck, not floating in front of the face.
      return n && h ? n.lerp(h, 0.16) : n;
    })();
    const spine = findBone("mixamorigSpine2");
    return {
      neckMala: attachAt(neck, neckPoint),
      malaBead: attachAt(neck, neckPoint),
      leftWrist: attachAt(findBone("mixamorigLeftHand"), wristPoint(leftForeArm, leftHand)),
      rightWrist: attachAt(findBone("mixamorigRightHand"), wristPoint(rightForeArm, rightHand)),
      sash: attachAt(spine, worldPos(spine), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.42, 0, 0))),
      hairBun: attachAt(head, worldPos(head)),
      hairTail: attachAt(head, worldPos(head), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.14))),
    };
  }, [model]);
  const clips = useMemo(() => {
    // Replace the GLB's incorrect custom prayer/kneel/meditation clips with
    // corrected ones built from this rig's rest pose (verified via FK on both
    // the male and female models).
    const built = buildTemplePoseClips(model);
    const builtNames = new Set(built.map((c) => c.name));
    const sourceClips = gltf.animations
      .filter((source) => !builtNames.has(source.name))
      .map((source) => {
        const clip = source.clone();
        const locomotion = source.name === "walk" || source.name === "run";
        // Only lock the actual root/hips/pelvis channel. Never match the full
        // track path: exporters often prefix every bone with "Armature".
        clip.tracks = clip.tracks.filter((track) => {
          if (!/\.position$/i.test(track.name)) return true;
          let target = "";
          try {
            const parsed = THREE.PropertyBinding.parseTrackName(track.name);
            target = [parsed.nodeName, parsed.objectIndex].filter(Boolean).join(" ").toLowerCase();
          } catch {
            target = track.name.toLowerCase().replace(/\.(position|quaternion|scale)$/i, "").split(/[|/]/).pop() ?? "";
          }
          const isRootMotion = isRootMotionBoneName(target);
          if (!isRootMotion) return true;
          const values = track.values as Float32Array;
          const stride = track.getValueSize();
          if (stride < 3 || values.length < stride) return false;
          // The supplied walk/run hips tracks contain cumulative vertical drift;
          // remove only that net cycle displacement while preserving body bounce.
          stabilizeRootPositionTrack(values, track.times, stride, locomotion);
          return true;
        });
        return clip;
      });

    return [...sourceClips, ...built];
  }, [gltf.animations, model]);
  const { actions, mixer } = useAnimations(clips, root);
  const activeClip = useRef("");
  const locomotionBones = useMemo(() => {
    const bones: Record<string, THREE.Bone | null> = {
      leftUpLeg: null,
      rightUpLeg: null,
      leftLeg: null,
      rightLeg: null,
    };
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
    model.traverse((object) => {
      if (!(object as THREE.Bone).isBone) return;
      const name = normalize(object.name);
      for (const key of Object.keys(bones)) {
        if (name.endsWith(`mixamorig${key}`)) bones[key] = object as THREE.Bone;
      }
    });
    return bones;
  }, [model]);

  useLayoutEffect(() => {
    activeClip.current = "";
    mixer.stopAllAction();
    return () => Object.values(actions).forEach((clip) => clip?.stop());
  }, [actions, mixer]);

  useEffect(() => {
    const handleFinished = (event: { action: THREE.AnimationAction }) => {
      const completedAction = interactionActionForCompletedClip(event.action.getClip().name);
      if (!completedAction) return;
      const expectedClip = completedAction === "chap" ? actions["prayer"] : actions["kneel"];
      if (event.action !== expectedClip || actionRef.current !== completedAction) return;
      onActionCompleteRef.current?.(completedAction);
    };
    mixer.addEventListener("finished", handleFinished);
    return () => mixer.removeEventListener("finished", handleFinished);
  }, [actions, mixer]);

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
    const selected = desired === "run" && !actions["run"] ? "walk" : desired;
    // Keep cadence readable while the world movement is faster. The stride
    // extension below increases distance per step instead of making feet
    // flicker at the world-speed ratio.
    const playbackRate = desired === "run"
      ? selected === "walk" ? 1.14 : 1.2
      : desired === "walk" ? 1.08 : 1;

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
      const oneShot = selected === "prayer" || selected === "kneel";
      next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
      next.clampWhenFinished = oneShot;
      next.fadeIn(0.12).play();
    }
    activeClip.current = selected;
  });

  useFrame(({ clock }) => {
    if (action !== "none" || pose !== "walk") return;
    const phase = clock.elapsedTime * (input.run ? 7.6 : 6.2);
    const stride = Math.sin(phase) * (input.run ? 0.44 : 0.38);
    const counterStride = -stride;
    if (locomotionBones["leftUpLeg"]) locomotionBones["leftUpLeg"].rotation.x += stride;
    if (locomotionBones["rightUpLeg"]) locomotionBones["rightUpLeg"].rotation.x += counterStride;
    if (locomotionBones["leftLeg"]) locomotionBones["leftLeg"].rotation.x += counterStride * 0.65;
    if (locomotionBones["rightLeg"]) locomotionBones["rightLeg"].rotation.x += stride * 0.65;
  });

  return (
    <group ref={root}>
      <group position={[-center.x * unitScale, -bounds.min.y * unitScale, -center.z * unitScale]} scale={unitScale}>
        {/* The GLBs face local +X. Rotate -90 degrees so their forward axis agrees with player.rot and camera-relative movement. */}
        <group rotation-y={-Math.PI / 2}>
          <primitive object={model} />
          {hair !== "troc" && rig.hairBun && createPortal(
            <mesh position={[0, size.y * 0.035, 0]} scale={[1, 0.72, 1]} castShadow>
              <sphereGeometry args={[Math.max(size.x, size.z) * 0.16, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>,
            rig.hairBun.bone,
          )}
          {hair === "dai" && rig.hairTail && createPortal(
            <mesh position={[0, -size.y * 0.045, -size.z * 0.13]} scale={[0.82, 1.45, 0.56]} castShadow>
              <sphereGeometry args={[Math.max(size.x, size.z) * 0.16, 18, 14]} />
              <meshStandardMaterial color={hairColor} roughness={0.92} />
            </mesh>,
            rig.hairTail.bone,
          )}
          {hair === "bui" && rig.hairBun && createPortal(
            <mesh position={[0, size.y * 0.13, -size.z * 0.03]} castShadow>
              <sphereGeometry args={[Math.max(size.x, size.z) * 0.105, 16, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>,
            rig.hairBun.bone,
          )}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/male_custom_poses.glb");
useGLTF.preload("/models/female_custom_poses.glb");
