export interface PresenceSyncPlayer {
  id: string;
  name?: string;
  x: number;
  z: number;
  rot: number;
  updatedAt: number;
  seq?: number;
  presenceStamp?: number;
}

const PRESENCE_MISSING_GRACE_MS = 2500;

/**
 * Reconciles the full Supabase Presence roster with recent broadcasts.
 * Unchanged Presence entries must not refresh their local receipt time forever:
 * otherwise a departed peer can remain visible indefinitely after a missed leave.
 */
export function reconcilePresencePlayers<T extends PresenceSyncPlayer>(
  previousPlayers: T[],
  presenceState: Record<string, unknown[]>,
  selfId: string,
  now: number,
): T[] {
  const previousById = new Map(previousPlayers.map((player) => [player.id, player]));
  const nextById = new Map<string, T>();

  for (const [presenceKey, rawEntries] of Object.entries(presenceState)) {
    for (const rawEntry of rawEntries ?? []) {
      if (!rawEntry || typeof rawEntry !== "object") continue;
      const meta = rawEntry as Partial<T>;
      const id = typeof meta.id === "string" && meta.id ? meta.id : presenceKey;
      if (!id || id === selfId) continue;

      const previous = previousById.get(id);
      const receivedSeq = Number.isFinite(meta.seq) ? Number(meta.seq) : 0;
      if (previous && Number(previous.seq ?? 0) > receivedSeq) {
        // A broadcast is newer than this Presence snapshot; do not rewind it.
        nextById.set(id, previous);
        continue;
      }

      const x = Number.isFinite(meta.x) ? Number(meta.x) : (previous?.x ?? 0);
      const z = Number.isFinite(meta.z) ? Number(meta.z) : (previous?.z ?? 21);
      const rot = Number.isFinite(meta.rot) ? Number(meta.rot) : (previous?.rot ?? Math.PI);
      const sourceStamp = Number.isFinite(meta.updatedAt) ? Number(meta.updatedAt) : undefined;
      const stateChanged =
        !previous ||
        receivedSeq !== Number(previous.seq ?? 0) ||
        x !== previous.x ||
        z !== previous.z ||
        rot !== previous.rot ||
        sourceStamp !== previous.presenceStamp;

      if (previous && !stateChanged && now - previous.updatedAt > PRESENCE_MISSING_GRACE_MS) {
        continue;
      }

      nextById.set(id, {
        ...previous,
        ...meta,
        id,
        name:
          typeof meta.name === "string" && meta.name.trim() ? meta.name.slice(0, 24) : "Phật tử",
        x,
        z,
        rot,
        updatedAt: stateChanged ? now : previous.updatedAt,
        seq: receivedSeq,
        presenceStamp: sourceStamp,
      } as unknown as T);
    }
  }

  // Keep a peer briefly if a Presence sync omitted it while Broadcast is still
  // arriving, but prune promptly once both sources have gone quiet.
  for (const previous of previousPlayers) {
    if (previous.id === selfId || nextById.has(previous.id)) continue;
    if (now - previous.updatedAt <= PRESENCE_MISSING_GRACE_MS) {
      nextById.set(previous.id, previous);
    }
  }

  return [...nextById.values()];
}
