import { useSyncExternalStore } from "react";
import { type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { getUI, player } from "./store";
import { type Hair, type Outfit } from "./sim";
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
  outfit?: Outfit;
  hair?: Hair;
  hairColor?: string;
}

interface MultiplayerSnapshot {
  connected: boolean;
  players: RemotePlayer[];
  roomId: string;
}

const DEFAULT_ROOM = "chung";
let currentRoomId = DEFAULT_ROOM;
const empty: MultiplayerSnapshot = { connected: false, players: [], roomId: DEFAULT_ROOM };
let snapshot = empty;
const listeners = new Set<() => void>();
let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let clientId = "";
let connectionAttempt = 0;

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
  const uniquePlayers = new Map<string, RemotePlayer>(snapshot.players.map((p) => [p.id, p]));
  for (const presenceKey in state) {
    for (const meta of state[presenceKey] ?? []) {
      if (meta.id && meta.id !== clientId) uniquePlayers.set(meta.id, meta);
    }
  }
  publish({ connected: true, players: [...uniquePlayers.values()], roomId: currentRoomId });
}

export function connectMultiplayer() {
  if (channel) return () => disconnectMultiplayer();

  const authClient = getAuthClient();
  if (!authClient) {
    publish(empty);
    console.warn("Chùa Tâm An: chưa cấu hình xác thực Supabase.");
    return () => {};
  }

  const attempt = ++connectionAttempt;
  void authClient.auth.getSession().then(({ data }) => {
    // Ignore a late session response if the user signed out or auth changed
    // while the request was still in flight.
    if (attempt !== connectionAttempt || channel) return;
    startMultiplayer(authClient, data.session?.user.id ?? getGuestId());
  }).catch((error: unknown) => {
    if (attempt !== connectionAttempt) return;
    publish(empty);
    console.warn("Chùa Tâm An: không thể kiểm tra phiên đăng nhập.", error);
  });
  return () => disconnectMultiplayer();
}

function getGuestId() {
  try {
    const key = "tam-an-guest-id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function getMultiplayerRoom() { return currentRoomId; }

export function switchMultiplayerRoom(roomId: string) {
  const safeRoom = roomId.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32) || DEFAULT_ROOM;
  if (safeRoom === currentRoomId) return;
  disconnectMultiplayer();
  currentRoomId = safeRoom;
  publish({ connected: false, players: [], roomId: currentRoomId });
  connectMultiplayer();
}

function startMultiplayer(authenticatedClient: SupabaseClient, authenticatedUserId: string) {
  if (channel) return;
  clientId = authenticatedUserId;

  client = authenticatedClient;

  channel = client.channel(`tam-an-world:${currentRoomId}`, {
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
      players.push({ ...incoming, name: incoming.name.slice(0, 24), updatedAt: Date.now() });
      publish({ connected: snapshot.connected, players, roomId: currentRoomId });
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
          outfit: avatar?.outfit ?? "lam",
          hair: avatar?.hair ?? "ngan",
          hairColor: avatar?.hairColor ?? "#1b1410",
        } satisfies RemotePlayer);
        publish({ connected: true, players: snapshot.players, roomId: currentRoomId });
        if (timer) clearInterval(timer);
        let lastX = player.x;
        let lastZ = player.z;
        let lastRot = player.rot;
        let lastHeartbeat = 0;
        timer = setInterval(() => {
          if (!channel) return;
          const now = Date.now();
          const currentAvatar = getUI().avatar;
          const moved = Math.abs(player.x - lastX) > 0.035 || Math.abs(player.z - lastZ) > 0.035 || Math.abs(player.rot - lastRot) > 0.035;
          if (!moved && now - lastHeartbeat < 1800) return;
          lastX = player.x; lastZ = player.z; lastRot = player.rot; lastHeartbeat = now;
          const payload: RemotePlayer = {
            id: authenticatedUserId,
            name: currentAvatar?.name || "Phật tử",
            x: player.x, z: player.z, rot: player.rot, updatedAt: now,
            outfit: currentAvatar?.outfit ?? "lam",
            hair: currentAvatar?.hair ?? "ngan",
            hairColor: currentAvatar?.hairColor ?? "#1b1410",
          };
          void channel.send({ type: "broadcast", event: "player_move", payload });
        }, 120);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        publish({ ...empty, roomId: currentRoomId });
      }
    });
}

export function disconnectMultiplayer() {
  connectionAttempt += 1;
  if (timer) clearInterval(timer);
  timer = null;
  const oldChannel = channel;
  channel = null;
  clientId = "";
  publish({ ...empty, roomId: currentRoomId });
  if (oldChannel && client) void client.removeChannel(oldChannel);
  client = null;
}

// Remove peers whose heartbeat stopped (for example after a browser crash).
if (typeof window !== "undefined") {
  window.setInterval(() => {
    const cutoff = Date.now() - 8000;
    const fresh = snapshot.players.filter((p) => p.updatedAt > cutoff);
    if (fresh.length !== snapshot.players.length) publish({ ...snapshot, players: fresh });
  }, 2000);
}
