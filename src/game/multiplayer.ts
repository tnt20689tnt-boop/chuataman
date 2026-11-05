import { useSyncExternalStore } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { getUI, player } from "./store";

export interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  z: number;
  rot: number;
  updatedAt: number;
}

interface MultiplayerSnapshot {
  connected: boolean;
  players: RemotePlayer[];
}

const empty: MultiplayerSnapshot = { connected: false, players: [] };
let snapshot = empty;
const listeners = new Set<() => void>();
let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let clientId = "";

function publish(next: MultiplayerSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function useMultiplayer() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => empty,
  );
}

function readPresence(channelRef: RealtimeChannel) {
  const state = channelRef.presenceState<RemotePlayer>();
  const players: RemotePlayer[] = [];
  for (const constKey in state) {
    for (const meta of state[constKey] ?? []) {
      if (meta.id !== clientId) players.push(meta);
    }
  }
  publish({ connected: true, players });
}

export function connectMultiplayer() {
  if (channel) return () => disconnectMultiplayer();

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

  if (!url || !key) {
    publish(empty);
    console.warn("Chùa Tâm An: thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY.");
    return () => {};
  }

  clientId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  channel = client.channel("tam-an-world", {
    config: {
      presence: { key: clientId },
      broadcast: { self: false },
    },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      if (channel) readPresence(channel);
    })
    .on("presence", { event: "join" }, () => {
      if (channel) readPresence(channel);
    })
    .on("presence", { event: "leave" }, () => {
      if (channel) readPresence(channel);
    })
    .on("broadcast", { event: "player_move" }, ({ payload }) => {
      const incoming = payload as RemotePlayer;
      if (!incoming || incoming.id === clientId || typeof incoming.x !== "number" || typeof incoming.z !== "number") return;
      const players = snapshot.players.filter((p) => p.id !== incoming.id);
      players.push(incoming);
      publish({ connected: snapshot.connected, players });
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED" && channel) {
        const avatar = getUI().avatar;
        await channel.track({
          id: clientId,
          name: avatar?.name || "Phật tử",
          x: player.x,
          z: player.z,
          rot: player.rot,
          updatedAt: Date.now(),
        } satisfies RemotePlayer);
        publish({ connected: true, players: snapshot.players });
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          if (!channel) return;
          const currentAvatar = getUI().avatar;
          const payload: RemotePlayer = {
            id: clientId,
            name: currentAvatar?.name || "Phật tử",
            x: player.x,
            z: player.z,
            rot: player.rot,
            updatedAt: Date.now(),
          };
          void channel.send({ type: "broadcast", event: "player_move", payload });
        }, 150);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        publish(empty);
      }
    });

  return () => disconnectMultiplayer();
}

export function disconnectMultiplayer() {
  if (timer) clearInterval(timer);
  timer = null;
  const oldChannel = channel;
  channel = null;
  clientId = "";
  publish(empty);
  if (oldChannel && client) void client.removeChannel(oldChannel);
  client = null;
}
