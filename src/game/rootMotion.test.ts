import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stabilizeRootPositionTrack } from "./rootMotion";

interface GlbAccessor {
  bufferView: number;
  byteOffset?: number;
  count: number;
  type: string;
  componentType: number;
}

interface GlbDocument {
  nodes: Array<{ name?: string }>;
  bufferViews: Array<{ byteOffset?: number; byteStride?: number }>;
  accessors: GlbAccessor[];
  animations: Array<{
    name: string;
    channels: Array<{ sampler: number; target: { node: number; path: string } }>;
    samplers: Array<{ input: number; output: number }>;
  }>;
}

function readGlb(path: string): { document: GlbDocument; binary: Buffer } {
  const file = readFileSync(resolve(process.cwd(), path));
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  let offset = 12;
  let document: GlbDocument | undefined;
  let binary: Buffer | undefined;
  while (offset + 8 <= file.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    const chunk = file.subarray(offset, offset + length);
    if (type === 0x4e4f534a) {
      document = JSON.parse(chunk.toString("utf8").replace(/[\0\s]+$/, "")) as GlbDocument;
    } else if (type === 0x004e4942) {
      binary = chunk;
    }
    offset += length;
  }
  if (!document || !binary) throw new Error(`Invalid GLB: ${path}`);
  return { document, binary };
}

function readFloatAccessor(
  document: GlbDocument,
  binary: Buffer,
  accessorIndex: number,
): Float32Array {
  const accessor = document.accessors[accessorIndex];
  if (!accessor || accessor.componentType !== 5126)
    throw new Error("Expected float animation accessor");
  const components = accessor.type === "SCALAR" ? 1 : Number(accessor.type.slice(3));
  const bufferView = document.bufferViews[accessor.bufferView];
  if (!components || !bufferView) throw new Error("Invalid animation accessor shape");
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = bufferView.byteStride ?? components * 4;
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const values = new Float32Array(accessor.count * components);
  for (let key = 0; key < accessor.count; key++) {
    for (let component = 0; component < components; component++) {
      values[key * components + component] = view.getFloat32(
        start + key * stride + component * 4,
        true,
      );
    }
  }
  return values;
}

describe("stabilizeRootPositionTrack", () => {
  it("removes net vertical drift while preserving cyclic bounce and horizontal locking", () => {
    const values = new Float32Array([2, 0, 5, 2.5, -0.8, 5.4, 1.5, -0.2, 4.7, 2, -1.2, 5]);

    stabilizeRootPositionTrack(values, [0, 1, 2, 3], 3, true);

    expect(values[0]).toBe(2);
    expect(values[2]).toBe(5);
    expect(values[3]).toBe(2);
    expect(values[5]).toBe(5);
    expect(values[6]).toBe(2);
    expect(values[8]).toBe(5);
    expect(values[9]).toBe(2);
    expect(values[11]).toBe(5);
    expect(values[1]).toBeCloseTo(0);
    expect(values[10]).toBeCloseTo(0);
    expect(values[4]).toBeCloseTo(-0.4);
    expect(values[7]).toBeCloseTo(0.6, 3);
  });

  it("keeps vertical pose values when only horizontal root motion should be locked", () => {
    const values = new Float32Array([1, 0.2, 3, 2, 0.8, 4]);

    stabilizeRootPositionTrack(values, [0, 1], 3, false);

    expect(values[0]).toBe(1);
    expect(values[1]).toBeCloseTo(0.2);
    expect(values[2]).toBe(3);
    expect(values[3]).toBe(1);
    expect(values[4]).toBeCloseTo(0.8);
    expect(values[5]).toBe(3);
  });

  it("handles a single key without changing its vertical component", () => {
    const values = new Float32Array([1, 0.5, 3]);

    stabilizeRootPositionTrack(values, [0], 3, true);

    expect([...values]).toEqual([1, 0.5, 3]);
  });

  it("normalizes the real male and female walk/run hip tracks at loop boundaries", () => {
    for (const path of [
      "public/models/male_custom_poses.glb",
      "public/models/female_custom_poses.glb",
    ]) {
      const { document, binary } = readGlb(path);
      for (const clipName of ["walk", "run"]) {
        const clip = document.animations.find((animation) => animation.name === clipName);
        expect(clip, `${path} ${clipName} clip`).toBeDefined();
        const hipChannel = clip?.channels.find(
          (channel) =>
            channel.target.path === "translation" &&
            /hips|pelvis/i.test(document.nodes[channel.target.node]?.name ?? ""),
        );
        expect(hipChannel, `${path} ${clipName} hips track`).toBeDefined();
        if (!clip || !hipChannel) continue;

        const sampler = clip.samplers[hipChannel.sampler];
        expect(sampler).toBeDefined();
        if (!sampler) continue;
        const times = readFloatAccessor(document, binary, sampler.input);
        const values = readFloatAccessor(document, binary, sampler.output);
        const keyCount = values.length / 3;
        const originalVerticalDrift = Math.abs(values[(keyCount - 1) * 3 + 1]! - values[1]!);
        expect(originalVerticalDrift).toBeGreaterThan(0.5);

        stabilizeRootPositionTrack(values, times, 3, true);

        expect(values[0]).toBeCloseTo(values[(keyCount - 1) * 3]!, 5);
        expect(values[1]).toBeCloseTo(values[(keyCount - 1) * 3 + 1]!, 5);
        expect(values[2]).toBeCloseTo(values[(keyCount - 1) * 3 + 2]!, 5);
      }
    }
  });
});
