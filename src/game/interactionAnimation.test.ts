import { describe, expect, it } from "vitest";
import { interactionActionForCompletedClip } from "./interactionAnimation";

describe("interactionActionForCompletedClip", () => {
  it("returns chắp tay to the normal state after the prayer gesture finishes", () => {
    expect(interactionActionForCompletedClip("prayer")).toBe("chap");
  });

  it("returns lễ Phật to the normal state after the bow sequence finishes", () => {
    expect(interactionActionForCompletedClip("kneel")).toBe("le");
  });

  it("leaves continuous and timed animations under their own controls", () => {
    expect(interactionActionForCompletedClip("meditation")).toBeNull();
    expect(interactionActionForCompletedClip("walk")).toBeNull();
    expect(interactionActionForCompletedClip("run")).toBeNull();
  });
});
