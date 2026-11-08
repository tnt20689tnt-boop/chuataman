// Avatar-specific temple poses for the existing Mixamo GLBs. Arm placement is
// solved from each rig's bind pose (rather than assuming both genders share the
// same local Euler axes); hand orientation is calibrated from its skinned mesh.
import * as THREE from "three";

const D2R = Math.PI / 180;
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const FORWARD = new THREE.Vector3(1, 0, 0); // The GLBs face local +X.
const UP = new THREE.Vector3(0, 1, 0);
const EPSILON = 1e-5;

type Side = "Left" | "Right";
type HandPose = "prayer" | "meditation";
interface HandAxes {
  finger: THREE.Vector3;
  palmNormal: THREE.Vector3;
}
interface RestTransform {
  quaternion: THREE.Quaternion;
  position: THREE.Vector3;
}
interface PoseState {
  rotations: Map<string, THREE.Quaternion>;
  hipsPosition?: THREE.Vector3;
}

function findBone(root: THREE.Object3D, expected: string): THREE.Bone | null {
  const target = normalize(expected);
  let exact: THREE.Bone | null = null;
  let suffix: THREE.Bone | null = null;
  root.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    const bone = object as THREE.Bone;
    const name = normalize(bone.name);
    if (name === target) exact = bone;
    else if (!suffix && name.endsWith(target)) suffix = bone;
  });
  return exact ?? suffix;
}

function makeBasis(finger: THREE.Vector3, normal: THREE.Vector3): THREE.Quaternion {
  const y = finger.clone().normalize();
  const z = normal.clone().addScaledVector(y, -normal.dot(y)).normalize();
  const x = y.clone().cross(z).normalize();
  z.copy(x).cross(y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Jacobi diagonalization for the symmetric 3x3 covariance of hand vertices. */
function principalAxes(points: THREE.Vector3[], mean: THREE.Vector3): HandAxes | null {
  if (points.length < 8) return null;
  const covariance = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const point of points) {
    const d = [point.x - mean.x, point.y - mean.y, point.z - mean.z];
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) covariance[row]![col]! += d[row]! * d[col]!;
  }
  const vectors = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let iteration = 0; iteration < 18; iteration++) {
    let p = 0;
    let q = 1;
    let largest = Math.abs(covariance[p]![q]!);
    for (const [row, col] of [
      [0, 2],
      [1, 2],
    ] as const) {
      const value = Math.abs(covariance[row]![col]!);
      if (value > largest) {
        p = row;
        q = col;
        largest = value;
      }
    }
    if (largest < 1e-10) break;
    const angle = 0.5 * Math.atan2(2 * covariance[p]![q]!, covariance[q]![q]! - covariance[p]![p]!);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const app = covariance[p]![p]!;
    const aqq = covariance[q]![q]!;
    const apq = covariance[p]![q]!;
    covariance[p]![p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    covariance[q]![q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    covariance[p]![q] = covariance[q]![p] = 0;
    for (let k = 0; k < 3; k++) {
      if (k === p || k === q) continue;
      const akp = covariance[k]![p]!;
      const akq = covariance[k]![q]!;
      covariance[k]![p] = covariance[p]![k] = c * akp - s * akq;
      covariance[k]![q] = covariance[q]![k] = s * akp + c * akq;
    }
    for (let row = 0; row < 3; row++) {
      const vp = vectors[row]![p]!;
      const vq = vectors[row]![q]!;
      vectors[row]![p] = c * vp - s * vq;
      vectors[row]![q] = s * vp + c * vq;
    }
  }
  const eigenvalues = [covariance[0]![0]!, covariance[1]![1]!, covariance[2]![2]!];
  const largestIndex = eigenvalues.indexOf(Math.max(...eigenvalues));
  const smallestIndex = eigenvalues.indexOf(Math.min(...eigenvalues));
  const axis = (index: number) =>
    new THREE.Vector3(vectors[0]![index]!, vectors[1]![index]!, vectors[2]![index]!).normalize();
  const finger = axis(largestIndex);
  if (finger.dot(mean) < 0) finger.negate();
  const palmNormal = axis(smallestIndex);
  // PCA has an arbitrary sign. The GLB hand meshes use local +Z for the palm
  // plane's normal; fix the sign independently on each model/hand.
  if (palmNormal.z < 0) palmNormal.negate();
  if (Math.abs(finger.dot(palmNormal)) > 0.2) return null;
  return { finger, palmNormal };
}

export function getHandAnatomicalAxes(root: THREE.Object3D, hand: THREE.Bone): HandAxes {
  const points: THREE.Vector3[] = [];
  root.traverse((object) => {
    if (!(object as THREE.SkinnedMesh).isSkinnedMesh) return;
    const mesh = object as THREE.SkinnedMesh;
    const boneIndex = mesh.skeleton.bones.indexOf(hand);
    const skinIndex = mesh.geometry.getAttribute("skinIndex");
    const skinWeight = mesh.geometry.getAttribute("skinWeight");
    const position = mesh.geometry.getAttribute("position");
    if (boneIndex < 0 || !skinIndex || !skinWeight || !position) return;
    mesh.updateMatrixWorld(true);
    mesh.skeleton.update();
    const vertex = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      let handWeight = 0;
      for (let influence = 0; influence < 4; influence++) {
        if (skinIndex.getComponent(i, influence) === boneIndex)
          handWeight += skinWeight.getComponent(i, influence);
      }
      if (handWeight < 0.45) continue;
      vertex.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, vertex);
      mesh.localToWorld(vertex);
      hand.worldToLocal(vertex);
      points.push(vertex.clone());
    }
  });
  const mean = new THREE.Vector3();
  for (const point of points) mean.add(point);
  if (points.length) mean.multiplyScalar(1 / points.length);
  // Canonical fallback is also the GLB's verified hand-bone convention: local
  // +Y follows the wrist-to-fingertip axis and local Z is the palm plane normal.
  return (
    principalAxes(points, mean) ?? {
      finger: new THREE.Vector3(0, 1, 0),
      palmNormal: new THREE.Vector3(0, 0, 1),
    }
  );
}

function desiredHandWorldQuaternion(
  axes: HandAxes,
  pose: HandPose,
  side: number,
): THREE.Quaternion {
  const targetFinger = pose === "prayer" ? UP : FORWARD;
  const targetNormal = pose === "prayer" ? new THREE.Vector3(0, 0, -side) : UP;
  return makeBasis(targetFinger, targetNormal)
    .multiply(makeBasis(axes.finger, axes.palmNormal).invert())
    .normalize();
}

function aimBoneAt(
  root: THREE.Object3D,
  bone: THREE.Bone,
  child: THREE.Bone,
  target: THREE.Vector3,
): void {
  root.updateMatrixWorld(true);
  const origin = bone.getWorldPosition(new THREE.Vector3());
  const childPosition = child.getWorldPosition(new THREE.Vector3());
  const currentDirection = childPosition.sub(origin).normalize();
  const targetDirection = target.clone().sub(origin).normalize();
  if (currentDirection.lengthSq() < EPSILON || targetDirection.lengthSq() < EPSILON) return;
  const currentWorld = bone.getWorldQuaternion(new THREE.Quaternion());
  const parentWorld =
    bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
  const aimedWorld = new THREE.Quaternion()
    .setFromUnitVectors(currentDirection, targetDirection)
    .multiply(currentWorld);
  bone.quaternion.copy(parentWorld.invert().multiply(aimedWorld)).normalize();
  root.updateMatrixWorld(true);
}

function solveCrossedLeg(root: THREE.Object3D, side: Side): void {
  const upperLeg = findBone(root, `mixamorig${side}UpLeg`);
  const lowerLeg = findBone(root, `mixamorig${side}Leg`);
  const foot = findBone(root, `mixamorig${side}Foot`);
  if (!upperLeg || !lowerLeg || !foot) return;
  root.updateMatrixWorld(true);
  const sideSign = side === "Left" ? -1 : 1;
  const modelRotation = root.getWorldQuaternion(new THREE.Quaternion());
  const upperOrigin = upperLeg.getWorldPosition(new THREE.Vector3());
  const knee = lowerLeg.getWorldPosition(new THREE.Vector3());
  const upperLength = upperOrigin.distanceTo(knee);
  // Open the knees to the sides first, then sweep each lower leg across the
  // lap. The feet stay offset on opposite thighs instead of meeting at the
  // center as if the soles were pressed together.
  const kneeDirection = new THREE.Vector3(0.65, 0.35, sideSign * 0.58)
    .normalize()
    .applyQuaternion(modelRotation);
  aimBoneAt(root, upperLeg, lowerLeg, upperOrigin.addScaledVector(kneeDirection, upperLength));

  root.updateMatrixWorld(true);
  const ankle = foot.getWorldPosition(new THREE.Vector3());
  const kneePosition = lowerLeg.getWorldPosition(new THREE.Vector3());
  const lowerLength = kneePosition.distanceTo(ankle);
  const ankleDirection = new THREE.Vector3(0.18, 0.12, -sideSign * 0.976)
    .normalize()
    .applyQuaternion(modelRotation);
  aimBoneAt(root, lowerLeg, foot, kneePosition.addScaledVector(ankleDirection, lowerLength));
  // Turn each foot slightly outward so the soles rest independently on the
  // opposite thigh instead of visually pressing together at the center.
  setEulerDelta(foot, [0, 0, sideSign * 14]);
}

function solveArm(
  root: THREE.Object3D,
  side: Side,
  wristTarget: THREE.Vector3,
  elbowSide: number,
  handPose: HandPose,
  axes: HandAxes,
): void {
  const arm = findBone(root, `mixamorig${side}Arm`);
  const forearm = findBone(root, `mixamorig${side}ForeArm`);
  const hand = findBone(root, `mixamorig${side}Hand`);
  if (!arm || !forearm || !hand) return;
  root.updateMatrixWorld(true);
  const shoulder = arm.getWorldPosition(new THREE.Vector3());
  const elbowRest = forearm.getWorldPosition(new THREE.Vector3());
  const wristRest = hand.getWorldPosition(new THREE.Vector3());
  const upperLength = shoulder.distanceTo(elbowRest);
  const lowerLength = elbowRest.distanceTo(wristRest);
  const toWrist = wristTarget.clone().sub(shoulder);
  const maxReach = Math.max(EPSILON, upperLength + lowerLength - EPSILON);
  const minReach = Math.abs(upperLength - lowerLength) + EPSILON;
  const reach = THREE.MathUtils.clamp(toWrist.length(), minReach, maxReach);
  const direction = toWrist.normalize();
  const solvedWrist = shoulder.clone().addScaledVector(direction, reach);
  const along =
    (upperLength * upperLength - lowerLength * lowerLength + reach * reach) / (2 * reach);
  const bend = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  const pole = new THREE.Vector3(0, -0.22, elbowSide);
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  const elbowTarget = shoulder
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(pole, bend);

  aimBoneAt(root, arm, forearm, elbowTarget);
  aimBoneAt(root, forearm, hand, solvedWrist);
  root.updateMatrixWorld(true);
  const parentWorld =
    hand.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
  hand.quaternion
    .copy(parentWorld.invert().multiply(desiredHandWorldQuaternion(axes, handPose, elbowSide)))
    .normalize();
  root.updateMatrixWorld(true);
}

function solveArms(root: THREE.Object3D, pose: HandPose, handAxes: Record<Side, HandAxes>): void {
  root.updateMatrixWorld(true);
  const hips = findBone(root, "mixamorigHips");
  const leftShoulder =
    findBone(root, "mixamorigLeftShoulder") ?? findBone(root, "mixamorigLeftArm");
  const rightShoulder =
    findBone(root, "mixamorigRightShoulder") ?? findBone(root, "mixamorigRightArm");
  if (!leftShoulder || !rightShoulder) return;
  const leftPosition = leftShoulder.getWorldPosition(new THREE.Vector3());
  const rightPosition = rightShoulder.getWorldPosition(new THREE.Vector3());
  const center = leftPosition.clone().add(rightPosition).multiplyScalar(0.5);
  const leftSide = Math.sign(leftPosition.z - center.z) || -1;
  const rightSide = Math.sign(rightPosition.z - center.z) || 1;
  const targets =
    pose === "prayer"
      ? [
          center.clone().add(new THREE.Vector3(0.16, 0.055, leftSide * 0.018)),
          center.clone().add(new THREE.Vector3(0.16, 0.055, rightSide * 0.018)),
        ]
      : (() => {
          const lap =
            hips?.getWorldPosition(new THREE.Vector3()) ??
            center.clone().add(new THREE.Vector3(0, -0.28, 0));
          return [
            lap.clone().add(new THREE.Vector3(0.1, -0.035, leftSide * 0.085)),
            lap.clone().add(new THREE.Vector3(0.1, -0.035, rightSide * 0.085)),
          ];
        })();
  solveArm(root, "Left", targets[0]!, leftSide, pose, handAxes.Left);
  solveArm(root, "Right", targets[1]!, rightSide, pose, handAxes.Right);
}

function offsetBoneInModelSpace(
  root: THREE.Object3D,
  bone: THREE.Bone,
  offset: THREE.Vector3,
): void {
  root.updateMatrixWorld(true);
  const modelRotation = root.getWorldQuaternion(new THREE.Quaternion());
  const parentRotation =
    bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
  const localOffset = offset
    .clone()
    .applyQuaternion(modelRotation)
    .applyQuaternion(parentRotation.invert());
  bone.position.add(localOffset);
  root.updateMatrixWorld(true);
}

function getSkinnedBoneBottomY(root: THREE.Object3D, bone: THREE.Bone): number | null {
  root.updateMatrixWorld(true);
  let bottomY = Number.POSITIVE_INFINITY;
  let foundVertex = false;
  const vertex = new THREE.Vector3();
  root.traverse((object) => {
    if (!(object as THREE.SkinnedMesh).isSkinnedMesh) return;
    const mesh = object as THREE.SkinnedMesh;
    const position = mesh.geometry.getAttribute("position");
    const skinIndex = mesh.geometry.getAttribute("skinIndex");
    const skinWeight = mesh.geometry.getAttribute("skinWeight");
    const boneIndex = mesh.skeleton.bones.indexOf(bone);
    if (!position || !skinIndex || !skinWeight || boneIndex < 0) return;
    mesh.updateMatrixWorld(true);
    mesh.skeleton.update();
    for (let i = 0; i < position.count; i++) {
      let weight = 0;
      for (let influence = 0; influence < 4; influence++) {
        if (skinIndex.getComponent(i, influence) === boneIndex)
          weight += skinWeight.getComponent(i, influence);
      }
      if (weight < 0.2) continue;
      mesh.getVertexPosition(i, vertex);
      mesh.localToWorld(vertex);
      root.worldToLocal(vertex);
      bottomY = Math.min(bottomY, vertex.y);
      foundVertex = true;
    }
  });
  return foundVertex ? bottomY : null;
}

function alignHipsToSupport(root: THREE.Object3D, hips: THREE.Bone, supportY: number): void {
  const pelvisBottomY = getSkinnedBoneBottomY(root, hips);
  if (pelvisBottomY === null) return;
  // Use the actual Hips-weighted skin as the seat-contact point; the GLB parents
  // do not share local axes, so the correction is applied in model-space Y.
  offsetBoneInModelSpace(root, hips, new THREE.Vector3(0, supportY - pelvisBottomY, 0));
}

function setEulerDelta(bone: THREE.Bone | null, delta: [number, number, number] | undefined): void {
  if (!bone || !delta) return;
  const euler = new THREE.Euler(delta[0] * D2R, delta[1] * D2R, delta[2] * D2R, "XYZ");
  bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(euler)).normalize();
}

function capturePose(root: THREE.Object3D, rest: Map<THREE.Bone, RestTransform>): PoseState {
  root.updateMatrixWorld(true);
  const rotations = new Map<string, THREE.Quaternion>();
  for (const [bone, initial] of rest) {
    if (Math.abs(bone.quaternion.dot(initial.quaternion)) < 0.999999)
      rotations.set(bone.name, bone.quaternion.clone());
  }
  const hips = findBone(root, "mixamorigHips");
  const hipsRest = hips ? rest.get(hips) : undefined;
  return {
    rotations,
    ...(hips && hipsRest && !hips.position.equals(hipsRest.position)
      ? { hipsPosition: hips.position.clone() }
      : {}),
  };
}

/** Builds custom clips from this cloned GLB's actual rest pose and mesh/skeleton. */
export function buildTemplePoseClips(root: THREE.Object3D): THREE.AnimationClip[] {
  const rest = new Map<THREE.Bone, RestTransform>();
  const bones: THREE.Bone[] = [];
  root.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    const bone = object as THREE.Bone;
    bones.push(bone);
    rest.set(bone, { quaternion: bone.quaternion.clone(), position: bone.position.clone() });
  });
  root.updateMatrixWorld(true);
  const supportY = new THREE.Box3().setFromObject(root).min.y;
  const hips = findBone(root, "mixamorigHips");
  const leftHand = findBone(root, "mixamorigLeftHand");
  const rightHand = findBone(root, "mixamorigRightHand");
  const handAxes: Record<Side, HandAxes> = {
    Left: leftHand
      ? getHandAnatomicalAxes(root, leftHand)
      : { finger: UP.clone(), palmNormal: new THREE.Vector3(0, 0, 1) },
    Right: rightHand
      ? getHandAnatomicalAxes(root, rightHand)
      : { finger: UP.clone(), palmNormal: new THREE.Vector3(0, 0, 1) },
  };

  const restoreRestPose = () => {
    for (const [bone, initial] of rest) {
      bone.quaternion.copy(initial.quaternion);
      bone.position.copy(initial.position);
    }
    root.updateMatrixWorld(true);
  };
  const poseState = (kind: "prayer" | "bow" | "meditation"): PoseState => {
    restoreRestPose();
    if (kind === "bow") {
      setEulerDelta(findBone(root, "mixamorigSpine"), [48, 0, 0]);
      setEulerDelta(findBone(root, "mixamorigSpine1"), [20, 0, 0]);
      setEulerDelta(findBone(root, "mixamorigHead"), [8, 0, 0]);
    } else if (kind === "meditation") {
      if (hips) offsetBoneInModelSpace(root, hips, new THREE.Vector3(0, -0.3, 0));
      setEulerDelta(findBone(root, "mixamorigHead"), [6, 0, 0]);
    }
    root.updateMatrixWorld(true);
    if (kind === "meditation" && hips) {
      alignHipsToSupport(root, hips, supportY);
      solveCrossedLeg(root, "Left");
      solveCrossedLeg(root, "Right");
      alignHipsToSupport(root, hips, supportY);
    }
    solveArms(root, kind === "meditation" ? "meditation" : "prayer", handAxes);
    return capturePose(root, rest);
  };

  const prayer = poseState("prayer");
  const bow = poseState("bow");
  const meditation = poseState("meditation");
  restoreRestPose();

  const makeClip = (
    name: string,
    keys: { t: number; pose: PoseState | null }[],
  ): THREE.AnimationClip => {
    const times = keys.map((key) => key.t);
    const names = new Set<string>();
    for (const key of keys) key.pose?.rotations.forEach((_q, boneName) => names.add(boneName));
    const tracks: THREE.KeyframeTrack[] = [];
    for (const boneName of names) {
      const restBone = bones.find((bone) => bone.name === boneName);
      if (!restBone) continue;
      const base = rest.get(restBone)!.quaternion;
      const values = keys.flatMap((key) => {
        const q = key.pose?.rotations.get(boneName) ?? base;
        return [q.x, q.y, q.z, q.w];
      });
      tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values));
    }
    if (hips && keys.some((key) => key.pose?.hipsPosition)) {
      const base = rest.get(hips)!.position;
      const values = keys.flatMap((key) => {
        const p = key.pose?.hipsPosition ?? base;
        return [p.x, p.y, p.z];
      });
      tracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`, times, values));
    }
    return new THREE.AnimationClip(name, keys.at(-1)!.t, tracks);
  };

  return [
    makeClip("prayer", [
      { t: 0, pose: null },
      { t: 0.45, pose: prayer },
      { t: 1.6, pose: prayer },
    ]),
    makeClip("kneel", [
      { t: 0, pose: null },
      { t: 0.7, pose: prayer },
      { t: 1.7, pose: bow },
      { t: 2.3, pose: bow },
      { t: 3.0, pose: prayer },
      { t: 3.4, pose: null },
    ]),
    makeClip("meditation", [
      { t: 0, pose: meditation },
      { t: 2.0, pose: meditation },
    ]),
  ];
}
