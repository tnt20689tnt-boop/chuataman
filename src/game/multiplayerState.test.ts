import { describe, expect, it } from "vitest";
import { reconcilePresencePlayers, type PresenceSyncPlayer } from "./multiplayerState";

const peer = (overrides: Partial<PresenceSyncPlayer> = {}): PresenceSyncPlayer => ({
  id: "peer-1",
  name: "Phật tử",
  x: 4,
  z: 8,
  rot: Math.PI,
  updatedAt: 1000,
  seq: 4,
  presenceStamp: 900,
  ...overrides,
});

describe("reconcilePresencePlayers", () => {
  it("keeps a recently broadcast peer through a brief Presence omission", () => {
    const players = reconcilePresencePlayers([peer()], {}, "self", 2500);
    expect(players).toHaveLength(1);
    expect(players[0]?.id).toBe("peer-1");
  });

  it("removes a peer after its Presence roster and broadcasts have both gone quiet", () => {
    expect(reconcilePresencePlayers([peer()], {}, "self", 4000)).toEqual([]);
  });

  it("does not keep refreshing a Presence entry whose state has not changed", () => {
    const stalePeer = peer({ updatedAt: 1000, presenceStamp: 900 });
    const samePresence = {
      session: [
        {
          id: "peer-1",
          name: "Phật tử",
          x: 4,
          z: 8,
          rot: Math.PI,
          seq: 4,
          updatedAt: 900,
        },
      ],
    };
    expect(reconcilePresencePlayers([stalePeer], samePresence, "self", 10000)).toEqual([]);
  });

  it("accepts changed Presence state and uses local receipt time", () => {
    const result = reconcilePresencePlayers(
      [peer()],
      {
        session: [
          {
            id: "peer-1",
            name: "An",
            x: 5,
            z: 8,
            rot: 1,
            seq: 5,
            updatedAt: 950,
          },
        ],
      },
      "self",
      2000,
    );
    expect(result[0]).toMatchObject({ id: "peer-1", name: "An", x: 5, seq: 5, updatedAt: 2000 });
  });

  it("does not replace a newer broadcast with an older Presence sequence", () => {
    const broadcast = peer({ x: 12, seq: 9, updatedAt: 1900 });
    const result = reconcilePresencePlayers(
      [broadcast],
      {
        session: [
          {
            id: "peer-1",
            x: 2,
            z: 8,
            rot: 1,
            seq: 3,
            updatedAt: 1500,
          },
        ],
      },
      "self",
      2000,
    );
    expect(result[0]).toEqual(broadcast);
  });

  it("never includes the local client's own Presence", () => {
    const result = reconcilePresencePlayers(
      [],
      {
        self: [
          {
            id: "self",
            x: 0,
            z: 0,
            rot: 0,
            seq: 1,
          },
        ],
      },
      "self",
      2000,
    );
    expect(result).toEqual([]);
  });
});
