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

export type AvatarAccessory = "neck_mala" | "wrist_mala" | "shoulder_sash";
// Measured from the GLB clips: at 1x playback the walk cycle covers ~1.07 and
// the run cycle ~3.65 game units per second. Playback rate = speed / reference
// keeps footsteps exactly matched to world movement (no foot sliding).
const GAIT_REFERENCE_SPEED = { walk: 1.07, run: 3.65 };

interface BoneAttachment {
  bone: THREE.Bone;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}

export function AnimatedAvatarAppearance({
  modelId, outfit, hair, hairColor, accessory, pose = "stand", action = "none", onActionComplete,
}: {
  modelId: "male_animated" | "female_animated";
  outfit: Outfit;
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

  // Accessories and extra hair attach to bones so they follow every animation
  // (walk, run, prayer, bow, meditation) instead of floating at fixed offsets.
  // Attachments are computed while the clone is still in its bind pose.
  const rig = useMemo(() => {
    model.updateMatrixWorld(true);
    const bones: Record<string, THREE.Bone> = {};
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    });
    const attach = (boneName: string, world: THREE.Vector3, worldQuat: THREE.Quaternion): BoneAttachment | null => {
      const bone = bones[boneName];
      if (!bone) return null;
      const pos = bone.worldToLocal(world.clone());
      const quat = bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQuat);
      return { bone, pos, quat };
    };
    const handWorld = (name: string) => {
      const hand = bones[name];
      if (!hand) return null;
      const hp = hand.getWorldPosition(new THREE.Vector3());
      const fp = hand.parent?.getWorldPosition(new THREE.Vector3());
      return fp ? hp.lerp(fp, 0.3) : hp;
    };
    // The model faces local -X; its left side is -Z.
    return {
      neckMala: attach(
        "mixamorigNeck",
        new THREE.Vector3(center.x - size.x * 0.10, neckY, center.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      ),
      malaBead: attach(
        "mixamorigNeck",
        new THREE.Vector3(center.x - size.x * 0.22, neckY - size.y * 0.09, center.z),
        new THREE.Quaternion(),
      ),
      leftWrist: handWorld("mixamorigLeftHand")
        ? attach("mixamorigLeftHand", handWorld("mixamorigLeftHand")!, new THREE.Quaternion())
        : null,
      rightWrist: handWorld("mixamorigRightHand")
        ? attach("mixamorigRightHand", handWorld("mixamorigRightHand")!, new THREE.Quaternion())
        : null,
      sash: attach(
        "mixamorigSpine2",
        new THREE.Vector3(center.x - size.x * 0.06, bounds.min.y + size.y * 0.60, center.z - size.z * 0.02),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.42, 0, 0)),
      ),
      hairBun: attach(
        "mixamorigHead",
        new THREE.Vector3(center.x + size.x * 0.14, bounds.max.y - size.y * 0.03, center.z),
        new THREE.Quaternion(),
      ),
      hairTail: attach(
        "mixamorigHead",
        new THREE.Vector3(center.x + size.x * 0.18, bounds.min.y + size.y * 0.80, center.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.14)),
      ),
    };
  }, [model, bounds, size, center, neckY]);

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

  useLayoutEffect(() => {
    activeClip.current = "";
    return () => Object.values(actions).forEach((clip) => clip?.stop());
  }, [actions]);

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
    const playbackRate = desired === "run"
      ? selected === "walk"
        ? MOVE.RUN / GAIT_REFERENCE_SPEED.walk
        : 1.25 * (MOVE.RUN / GAIT_REFERENCE_SPEED.run)
      : desired === "walk"
        ? MOVE.SPEED / GAIT_REFERENCE_SPEED.walk
        : 1;

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
          {accessory === "neck_mala" && rig.neckMala && createPortal(
            <group position={rig.neckMala.pos} quaternion={rig.neckMala.quat}>
              <mesh rotation-x={Math.PI / 2} castShadow>
                <torusGeometry args={[size.y * 0.075, size.y * 0.009, 8, 48]} />
                <meshStandardMaterial color="#70452d" roughness={0.72} />
              </mesh>
              <mesh position={[0, -size.y * 0.09, size.z * 0.025]}>
                <sphereGeometry args={[size.y * 0.018, 12, 10]} />
                <meshStandardMaterial color="#c49a54" metalness={0.2} roughness={0.55} />
              </mesh>
            </group>,
            rig.neckMala.bone,
          )}
          {accessory === "wrist_mala" && rig.leftWrist && createPortal(
            <group position={rig.leftWrist.pos} quaternion={rig.leftWrist.quat}>
              <mesh rotation-x={Math.PI / 2} castShadow>
                <torusGeometry args={[size.y * 0.028, size.y * 0.008, 7, 24]} />
                <meshStandardMaterial color="#70452d" roughness={0.8} />
              </mesh>
            </group>,
            rig.leftWrist.bone,
          )}
          {accessory === "wrist_mala" && rig.rightWrist && createPortal(
            <group position={rig.rightWrist.pos} quaternion={rig.rightWrist.quat}>
              <mesh rotation-x={Math.PI / 2} castShadow>
                <torusGeometry args={[size.y * 0.028, size.y * 0.008, 7, 24]} />
                <meshStandardMaterial color="#70452d" roughness={0.8} />
              </mesh>
            </group>,
            rig.rightWrist.bone,
          )}
          {accessory === "shoulder_sash" && rig.sash && createPortal(
            <group position={rig.sash.pos} quaternion={rig.sash.quat}>
              <mesh rotation-z={-0.28} rotation-y={0.12} castShadow>
                <boxGeometry args={[Math.max(size.x * 0.16, 0.035), size.y * 0.40, Math.max(size.z * 0.055, 0.018)]} />
                <meshStandardMaterial color="#c49a54" roughness={0.75} />
              </mesh>
            </group>,
            rig.sash.bone,
          )}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/male_custom_poses.glb");
useGLTF.preload("/models/female_custom_poses.glb");
