import { useSyncExternalStore } from "react";
import { type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { getUI, player } from "./store";
import { getAuthClient } from "./auth";

export interface TempleChatMessage { id: string; name: string; text: string; at: number; }

let chatMessages: TempleChatMessage[] = [];

export interface TemplePrayer { id: string; name: string; text: string; at: number; }
let sharedPrayers: TemplePrayer[] = [];

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

export function useTempleChat() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => chatMessages,
    () => [],
  );
}

export function useTemplePrayers() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => sharedPrayers,
    () => [],
  );
}

function addPrayer(prayer: TemplePrayer) {
  if (sharedPrayers.some((item) => item.id === prayer.id)) return;
  sharedPrayers = [prayer, ...sharedPrayers].slice(0, 100);
  listeners.forEach((listener) => listener());
}

export function sendTemplePrayer(name: string, text: string) {
  const prayer: TemplePrayer = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "prayer-" + Date.now() + "-" + Math.random(),
    name: name.slice(0, 24),
    text: text.trim().slice(0, 200),
    at: Date.now(),
  };
  if (!prayer.text || !channel || !snapshot.connected) return false;
  addPrayer(prayer);
  void channel.send({ type: "broadcast", event: "prayer_message", payload: prayer });
  return true;
}

function addChatMessage(message: TempleChatMessage) {
  if (chatMessages.some((item) => item.id === message.id)) return;
  chatMessages = [...chatMessages, message].slice(-100);
  listeners.forEach((listener) => listener());
}

export function sendTempleChat(name: string, text: string) {
  const message: TempleChatMessage = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`,
    name: name.slice(0, 24),
    text: text.trim().slice(0, 300),
    at: Date.now(),
  };
  if (!message.text || !channel || !snapshot.connected) return false;
  addChatMessage(message);
  void channel.send({ type: "broadcast", event: "chat_message", payload: message });
  return true;
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
  // Supabase may return several presence metas for one account (for example,
  // when the same person opens the temple in multiple tabs). Count each
  // authenticated account once and never include the current account.
  const uniquePlayers = new Map<string, RemotePlayer>();
  for (const presenceKey in state) {
    for (const meta of state[presenceKey] ?? []) {
      if (meta.id && meta.id !== clientId) uniquePlayers.set(meta.id, meta);
    }
  }
  publish({ connected: true, players: [...uniquePlayers.values()] });
}

export function connectMultiplayer() {
  if (channel) return () => disconnectMultiplayer();

  const authClient = getAuthClient();
  if (!authClient) {
    publish(empty);
    console.warn("Chùa Tâm An: chưa cấu hình xác thực Supabase.");
    return () => {};
  }

  void authClient.auth.getSession().then(({ data }) => {
    if (channel) return;
    if (!data.session?.user) {
      publish(empty);
      return;
    }
    startAuthenticatedMultiplayer(authClient, data.session.user.id);
  });
  return () => disconnectMultiplayer();
}

function startAuthenticatedMultiplayer(authenticatedClient: SupabaseClient, authenticatedUserId: string) {
  if (channel) return;
  clientId = authenticatedUserId;

  client = authenticatedClient;

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
    .on("broadcast", { event: "chat_message" }, ({ payload }) => {
      const message = payload as TempleChatMessage;
      if (message && typeof message.id === "string" && typeof message.name === "string" && typeof message.text === "string" && typeof message.at === "number") {
        addChatMessage({ id: message.id, name: message.name.slice(0, 24), text: message.text.slice(0, 300), at: message.at });
      }
    })
    .on("broadcast", { event: "prayer_message" }, ({ payload }) => {
      const prayer = payload as TemplePrayer;
      if (prayer && typeof prayer.id === "string" && typeof prayer.name === "string" && typeof prayer.text === "string" && typeof prayer.at === "number") {
        addPrayer({ id: prayer.id, name: prayer.name.slice(0, 24), text: prayer.text.slice(0, 200), at: prayer.at });
      }
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
          id: authenticatedUserId,
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
            id: authenticatedUserId,
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
