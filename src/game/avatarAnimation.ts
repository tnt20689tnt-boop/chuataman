import * as THREE from "three";

export type AvatarRig = Map<THREE.Bone, { x: number; y: number; z: number }>;

export function captureAvatarRig(root: THREE.Object3D): AvatarRig {
  const rig: AvatarRig = new Map();
  root.traverse((node) => {
    if ((node as THREE.Bone).isBone) {
      const bone = node as THREE.Bone;
      rig.set(bone, { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z });
    }
  });
  return rig;
}

/** Adds a light procedural gait when a GLB has a skeleton but no animation clips. */
export function animateAvatarRig(
  rig: AvatarRig | null,
  time: number,
  moving: boolean,
  intensity = 1,
) {
  if (!rig?.size) return;
  const stride = moving ? Math.sin(time * 9) * 0.48 * intensity : 0;
  const breath = Math.sin(time * 2.1) * 0.012;
  for (const [bone, base] of rig) {
    const name = bone.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const left = name.includes("left") || name.endsWith("l");
    const side = left ? 1 : -1;
    let x = base.x;
    let y = base.y;
    let z = base.z;

    if (/(upleg|thigh|calf|leg|foot)/.test(name)) {
      x += stride * side * (name.includes("calf") ? 0.45 : 1);
    } else if (/(arm|shoulder|forearm|hand)/.test(name)) {
      x += -stride * side * (name.includes("hand") ? 0.2 : 0.72);
      z += side * (moving ? 0.035 : 0.012);
    } else if (/(spine|hips|pelvis)/.test(name)) {
      x += breath + (moving ? Math.abs(Math.sin(time * 9)) * 0.025 : 0);
      z += Math.sin(time * 1.2) * 0.018;
    } else if (/(neck|head)/.test(name)) {
      y += Math.sin(time * 0.75) * 0.018;
      z += Math.sin(time * 1.05) * 0.012;
    }

    bone.rotation.set(x, y, z);
  }
}
