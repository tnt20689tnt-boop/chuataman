import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildTemplePoseClips } from "./poseClips";

interface GlbDocument {
  nodes: Array<{
    name?: string;
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    children?: number[];
  }>;
}

function readGlbDocument(path: string): GlbDocument {
  const bytes = readFileSync(path);
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) as GlbDocument;
}

function makeRig(path: string) {
  const document = readGlbDocument(path);
  const nodes = document.nodes.map((node) => {
    const object = node.name?.toLowerCase().includes("mixamorig")
      ? new THREE.Bone()
      : new THREE.Group();
    object.name = node.name ?? "";
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
    return object;
  });
  const parent = new Set<number>();
  document.nodes.forEach((node, index) => {
    for (const child of node.children ?? []) {
      nodes[index]!.add(nodes[child]!);
      parent.add(child);
    }
  });
  const root = new THREE.Group();
  nodes.forEach((node, index) => {
    if (!parent.has(index)) root.add(node);
  });
  root.updateMatrixWorld(true);
  return { root, nodes };
}

function sampleClip(root: THREE.Object3D, nodes: THREE.Object3D[], clipName: string, time: number) {
  const clip = buildTemplePoseClips(root).find((candidate) => candidate.name === clipName);
  expect(clip, `${clipName} clip exists`).toBeDefined();
  for (const track of clip!.tracks) {
    const targetName = track.name.replace(/\.(quaternion|position)$/i, "");
    const target = nodes.find((node) => node.name === targetName);
    expect(target, `${track.name} resolves in the GLB skeleton`).toBeDefined();
    const value = (track as THREE.KeyframeTrack & {
      createInterpolant: () => { evaluate: (time: number) => ArrayLike<number> };
    }).createInterpolant().evaluate(time);
    if (track.name.endsWith(".quaternion")) target!.quaternion.fromArray(value);
    else target!.position.fromArray(value);
  }
  root.updateMatrixWorld(true);
  return nodes;
}

function findNode(nodes: THREE.Object3D[], suffix: string): THREE.Object3D {
  const normalizedSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = nodes.find((node) =>
    node.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .endsWith(normalizedSuffix),
  );
  expect(target, `${suffix} bone exists`).toBeDefined();
  return target!;
}

function worldPosition(node: THREE.Object3D) {
  return node.getWorldPosition(new THREE.Vector3());
}

function worldAxis(node: THREE.Object3D, localAxis: THREE.Vector3) {
  return localAxis
    .clone()
    .applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();
}

function addSeatContactProbe(root: THREE.Object3D, nodes: THREE.Object3D[]) {
  const hips = findNode(nodes, "Hips") as THREE.Bone;
  const bones = nodes.filter((node) => (node as THREE.Bone).isBone) as THREE.Bone[];
  const hipIndex = bones.indexOf(hips);
  const hip = worldPosition(hips);
  const positions = [
    hip.x - 0.04,
    hip.y - 0.16,
    hip.z - 0.04,
    hip.x + 0.04,
    hip.y - 0.16,
    hip.z - 0.04,
    hip.x - 0.04,
    hip.y - 0.16,
    hip.z + 0.04,
    hip.x + 0.04,
    hip.y - 0.16,
    hip.z + 0.04,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const skinIndices = new Uint16Array(16);
  const skinWeights = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    skinIndices[i * 4] = hipIndex;
    skinWeights[i * 4] = 1;
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  root.add(mesh);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  mesh.bind(skeleton);
  root.updateMatrixWorld(true);
  return { mesh, supportY: new THREE.Box3().setFromObject(root).min.y };
}

const avatarAssets = [
  ["male", "public/models/male_custom_poses.glb"],
  ["female", "public/models/female_custom_poses.glb"],
] as const;

describe("temple avatar pose clips", () => {
  it.each(avatarAssets)(
    "keeps prayer and bow hands forward, upright, inward, and balanced for %s",
    (_gender, path) => {
      for (const [clipName, time] of [
        ["prayer", 1.2],
        ["kneel", 2.0],
      ] as const) {
        const { root, nodes } = makeRig(path);
        sampleClip(root, nodes, clipName, time);
        const leftShoulder = worldPosition(findNode(nodes, "LeftShoulder"));
        const rightShoulder = worldPosition(findNode(nodes, "RightShoulder"));
        const center = leftShoulder.clone().add(rightShoulder).multiplyScalar(0.5);
        const leftHand = findNode(nodes, "LeftHand");
        const rightHand = findNode(nodes, "RightHand");
        const leftWrist = worldPosition(leftHand);
        const rightWrist = worldPosition(rightHand);
        const leftElbow = worldPosition(findNode(nodes, "LeftForeArm"));
        const rightElbow = worldPosition(findNode(nodes, "RightForeArm"));

        expect((leftWrist.x + rightWrist.x) / 2).toBeGreaterThan(center.x + 0.07);
        expect(Math.abs(leftWrist.y - rightWrist.y)).toBeLessThan(0.025);
        expect(Math.abs(leftWrist.z - rightWrist.z)).toBeLessThan(0.08);
        expect(leftElbow.z).toBeLessThan(center.z);
        expect(rightElbow.z).toBeGreaterThan(center.z);
        expect(
          worldAxis(leftHand, new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(0, 1, 0)),
        ).toBeGreaterThan(0.9);
        expect(
          worldAxis(rightHand, new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(0, 1, 0)),
        ).toBeGreaterThan(0.9);
        expect(
          worldAxis(leftHand, new THREE.Vector3(0, 0, 1)).dot(new THREE.Vector3(0, 0, 1)),
        ).toBeGreaterThan(0.9);
        expect(
          worldAxis(rightHand, new THREE.Vector3(0, 0, 1)).dot(new THREE.Vector3(0, 0, -1)),
        ).toBeGreaterThan(0.9);
      }
    },
  );

  it.each(avatarAssets)(
    "places both meditation hands on the lap with palms up for %s",
    (_gender, path) => {
      const { root, nodes } = makeRig(path);
      const seatProbe = addSeatContactProbe(root, nodes);
      const hips = findNode(nodes, "Hips");
      const restHip = worldPosition(hips);
      sampleClip(root, nodes, "meditation", 1.55);
      const leftShoulder = worldPosition(findNode(nodes, "LeftShoulder"));
      const rightShoulder = worldPosition(findNode(nodes, "RightShoulder"));
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const hip = worldPosition(hips);
      const leftFoot = worldPosition(findNode(nodes, "LeftFoot"));
      const rightFoot = worldPosition(findNode(nodes, "RightFoot"));
      const leftHand = findNode(nodes, "LeftHand");
      const rightHand = findNode(nodes, "RightHand");
      const leftWrist = worldPosition(leftHand);
      const rightWrist = worldPosition(rightHand);

      expect(hip.x).toBeCloseTo(restHip.x, 3);
      expect(leftFoot.z).toBeGreaterThan(hip.z + 0.01);
      expect(rightFoot.z).toBeLessThan(hip.z - 0.01);
      seatProbe.mesh.skeleton.update();
      let lowestSeatVertex = Number.POSITIVE_INFINITY;
      for (let i = 0; i < seatProbe.mesh.geometry.getAttribute("position").count; i++) {
        const vertex = new THREE.Vector3();
        seatProbe.mesh.getVertexPosition(i, vertex);
        seatProbe.mesh.localToWorld(vertex);
        root.worldToLocal(vertex);
        lowestSeatVertex = Math.min(lowestSeatVertex, vertex.y);
      }
      expect(lowestSeatVertex).toBeCloseTo(seatProbe.supportY, 3);
      expect(leftWrist.y).toBeLessThan(shoulderY - 0.08);
      expect(rightWrist.y).toBeLessThan(shoulderY - 0.08);
      expect(Math.abs(leftWrist.y - rightWrist.y)).toBeLessThan(0.03);
      expect(leftWrist.z).toBeLessThan(hip.z);
      expect(rightWrist.z).toBeGreaterThan(hip.z);
      expect(
        worldAxis(leftHand, new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(1, 0, 0)),
      ).toBeGreaterThan(0.9);
      expect(
        worldAxis(rightHand, new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(1, 0, 0)),
      ).toBeGreaterThan(0.9);
      expect(
        worldAxis(leftHand, new THREE.Vector3(0, 0, 1)).dot(new THREE.Vector3(0, 1, 0)),
      ).toBeGreaterThan(0.9);
      expect(
        worldAxis(rightHand, new THREE.Vector3(0, 0, 1)).dot(new THREE.Vector3(0, 1, 0)),
      ).toBeGreaterThan(0.9);
    },
  );

  it.each(avatarAssets)(
    "holds a continuous seated pose across meditation loop boundaries for %s",
    (_gender, path) => {
      const { root } = makeRig(path);
      const clip = buildTemplePoseClips(root).find((candidate) => candidate.name === "meditation");
      expect(clip).toBeDefined();
      expect(clip!.duration).toBe(2);
      for (const track of clip!.tracks) {
        const size = track.getValueSize();
        for (let i = 0; i < size; i++) {
          expect(track.values[i]).toBeCloseTo(track.values[track.values.length - size + i]!, 6);
        }
      }
    },
  );
});
