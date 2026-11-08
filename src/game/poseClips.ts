// Corrected prayer / bow / meditation pose clips for the Mixamo-rigged avatars.
// The GLB's supplied custom clips have wrong poses (prayer hands apart at
// shoulder height, kneel returning to T-pose, meditation tipping the body
// sideways). These clips are built procedurally from the rig's rest pose with
// rotations verified against forward kinematics on both the male and female
// models, so both genders get the same correct result.
import * as THREE from "three";

export interface PoseDelta {
  /** Local XYZ euler deltas in degrees, multiplied onto the rest rotation. */
  rot?: Record<string, [number, number, number]>;
  /** Raw model units the hips lower (along the hips' local Z, which is world down). */
  hipsDrop?: number;
}

const D2R = Math.PI / 180;

// Chắp tay: rotate the shoulders/forearms toward the FRONT of the torso (the previous X signs drove both arms behind the back).
export const PRAYER_POSE: PoseDelta = {
  rot: {
    mixamorigLeftArm: [56, 0, -44],
    mixamorigRightArm: [56, 0, 44],
    mixamorigLeftForeArm: [66, 0, -75],
    mixamorigRightForeArm: [66, 0, 75],
    mixamorigLeftHand: [0, 0, -12],
    mixamorigRightHand: [0, 0, 12],
  },
};

// Lễ Phật: prayer hands held while the spine flexes FORWARD with dignity.
export const BOW_POSE: PoseDelta = {
  rot: {
    ...PRAYER_POSE.rot,
    mixamorigSpine: [48, 0, 0],
    mixamorigSpine1: [20, 0, 0],
    mixamorigHead: [8, 0, 0],
  },
};

// Ngồi thiền: upright cross-legged seat, thighs fold forward, knees bend forward, hands rest on lap.
export const MEDITATION_POSE: PoseDelta = {
  hipsDrop: 0.3,
  rot: {
    mixamorigLeftUpLeg: [75, -40, 35],
    mixamorigRightUpLeg: [75, 40, -35],
    mixamorigLeftLeg: [-95, 0, -15],
    mixamorigRightLeg: [-95, 0, 15],
    mixamorigLeftArm: [55, 0, -18],
    mixamorigRightArm: [55, 0, 18],
    mixamorigLeftForeArm: [58, 0, -34],
    mixamorigRightForeArm: [58, 0, 34],
    mixamorigHead: [6, 0, 0],
  },
};

interface Key {
  t: number;
  pose: PoseDelta | null;
}

/**
 * Builds the three temple pose clips for a cloned avatar rig.
 * Must be called while the rig is still in its bind/rest pose.
 */
export function buildTemplePoseClips(root: THREE.Object3D): THREE.AnimationClip[] {
  const rest = new Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>();
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      rest.set(o.name, { q: (o as THREE.Bone).quaternion.clone(), p: (o as THREE.Bone).position.clone() });
    }
  });
  const resolveBoneName = (expected: string) => {
    const target = normalize(expected);
    return [...rest.keys()].find((name) => normalize(name) === target) ??
      [...rest.keys()].find((name) => normalize(name).endsWith(target));
  };
  const hipsName = resolveBoneName("mixamorigHips");
  const hips = hipsName ? rest.get(hipsName) : undefined;
  const euler = new THREE.Euler();
  const delta = new THREE.Quaternion();

  const posedQuat = (name: string, pose: PoseDelta | null): THREE.Quaternion | null => {
    const actualName = resolveBoneName(name);
    const r = actualName ? rest.get(actualName) : undefined;
    if (!r) return null;
    const deltaName = Object.keys(pose?.rot ?? {}).find((key) => normalize(key) === normalize(name));
    const d = deltaName ? pose?.rot?.[deltaName] : undefined;
    if (!d) return r.q;
    euler.set(d[0] * D2R, d[1] * D2R, d[2] * D2R, "XYZ");
    return r.q.clone().multiply(delta.setFromEuler(euler));
  };

  const makeClip = (name: string, keys: Key[]): THREE.AnimationClip => {
    const times = keys.map((k) => k.t);
    const boneNames = new Set<string>();
    keys.forEach((k) => Object.keys(k.pose?.rot ?? {}).forEach((n) => {
      const actualName = resolveBoneName(n);
      if (actualName) boneNames.add(actualName);
    }));
    const tracks: THREE.KeyframeTrack[] = [];
    for (const n of boneNames) {
      const values: number[] = [];
      for (const k of keys) {
        const q = posedQuat(n, k.pose);
        if (!q) continue;
        values.push(q.x, q.y, q.z, q.w);
      }
      if (values.length === times.length * 4) {
        tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, values));
      }
    }
    if (hips && keys.some((k) => k.pose?.hipsDrop)) {
      const values: number[] = [];
      for (const k of keys) {
        const p = hips.p.clone();
        if (k.pose?.hipsDrop) p.z -= k.pose.hipsDrop;
        values.push(p.x, p.y, p.z);
      }
      if (hipsName) tracks.push(new THREE.VectorKeyframeTrack(`${hipsName}.position`, times, values));
    }
    return new THREE.AnimationClip(name, keys.at(-1)!.t, tracks);
  };

  return [
    // Chắp tay: ease into the prayer pose and hold it.
    makeClip("prayer", [
      { t: 0, pose: null },
      { t: 0.45, pose: PRAYER_POSE },
      { t: 1.6, pose: PRAYER_POSE },
    ]),
    // Lễ Phật: join palms, bow slowly, hold, rise, return to standing.
    makeClip("kneel", [
      { t: 0, pose: null },
      { t: 0.7, pose: PRAYER_POSE },
      { t: 1.7, pose: BOW_POSE },
      { t: 2.3, pose: BOW_POSE },
      { t: 3.0, pose: PRAYER_POSE },
      { t: 3.4, pose: null },
    ]),
    // Ngồi thiền: lower into the seat and hold it upright (clamped, not looped).
    makeClip("meditation", [
      { t: 0, pose: null },
      { t: 1.1, pose: MEDITATION_POSE },
      { t: 2.0, pose: MEDITATION_POSE },
    ]),
  ];
}
