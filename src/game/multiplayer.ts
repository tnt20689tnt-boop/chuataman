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
  // Monotonic per-session sequence; unlike Date.now(), this is not affected by clock skew between devices.
  seq?: number;
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
if (typeof window !== "undefined") {
  try { currentRoomId = DEFAULT_ROOM; localStorage.setItem("tam-an-room", DEFAULT_ROOM); } catch { currentRoomId = DEFAULT_ROOM; }
}
const empty: MultiplayerSnapshot = { connected: false, players: [], roomId: DEFAULT_ROOM };
let snapshot = empty;
const listeners = new Set<() => void>();
let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let clientId = "";
let movementSeq = 0;
let connectionAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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

// Subscribe only to connection status so text-entry panels do not re-render
// for every remote player's movement update.
export function useMultiplayerConnected() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot.connected,
    () => false,
  );
}

function readPresence(channelRef: RealtimeChannel) {
  const state = channelRef.presenceState<RemotePlayer>();
  // Presence sync can briefly omit a peer while Realtime is reconciling.
  // Merge instead of replacing the whole list, and never let an older
  // Presence payload overwrite a newer player_move broadcast.
  const merged = new Map(snapshot.players.map((peer) => [peer.id, peer]));
  for (const [presenceKey, entries] of Object.entries(state)) {
    if (presenceKey === clientId) continue;
    for (const meta of entries ?? []) {
      const id = typeof meta.id === "string" && meta.id ? meta.id : presenceKey;
      if (id === clientId) continue;
      const previous = merged.get(id);
      const receivedSeq = Number.isFinite(meta.seq) ? Number(meta.seq) : 0;
      if (previous && Number(previous.seq ?? 0) > receivedSeq) continue;
      merged.set(id, {
        ...meta,
        id,
        name: typeof meta.name === "string" && meta.name.trim() ? meta.name.slice(0, 24) : "Phật tử",
        x: Number.isFinite(meta.x) ? meta.x : previous?.x ?? 0,
        z: Number.isFinite(meta.z) ? meta.z : previous?.z ?? 21,
        rot: Number.isFinite(meta.rot) ? meta.rot : previous?.rot ?? Math.PI,
        // Store local receipt time for stale-peer cleanup; never compare device clocks.
        updatedAt: Date.now(),
        seq: receivedSeq,
      });
    }
  }
  publish({ connected: true, players: [...merged.values()], roomId: currentRoomId });
}

export function connectMultiplayer() {
  if (channel) return () => disconnectMultiplayer();

  const authClient = getAuthClient();
  if (!authClient) {
    publish({ ...empty, roomId: currentRoomId });
    console.warn("Chùa Tâm An: chưa cấu hình xác thực Supabase.");
    return () => {};
  }

  const attempt = ++connectionAttempt;
  void authClient.auth.getSession().then(({ data }) => {
    // Ignore a late session response if the user signed out or auth changed
    // while the request was still in flight.
    if (attempt !== connectionAttempt || channel) return;
    startMultiplayer(authClient, getGuestId(), attempt);
  }).catch((error: unknown) => {
    if (attempt !== connectionAttempt) return;
    publish({ ...empty, roomId: currentRoomId });
    console.warn("Chùa Tâm An: không thể kiểm tra phiên đăng nhập.", error);
  });
  return () => disconnectMultiplayer();
}

function getGuestId() {
  // Generate a fresh identity for every live page instance. sessionStorage
  // can be cloned when a tab is duplicated, causing two visitors to share
  // one Supabase Presence key and appear as a single person.
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getMultiplayerRoom() { return currentRoomId; }

export function switchMultiplayerRoom(roomId: string) {
  const safeRoom = roomId.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 32) || DEFAULT_ROOM;
  if (safeRoom === currentRoomId) return;
  disconnectMultiplayer();
  currentRoomId = safeRoom;
  try { localStorage.setItem("tam-an-room", currentRoomId); } catch { /* storage may be unavailable */ }
  publish({ connected: false, players: [], roomId: currentRoomId });
  connectMultiplayer();
}

function startMultiplayer(authenticatedClient: SupabaseClient, authenticatedUserId: string, attempt: number) {
  if (channel) return;
  clientId = authenticatedUserId;
  movementSeq = 0;

  client = authenticatedClient;

  // This is one shared temple world: visitors must see one another across every zone.\n  channel = client.channel("tam-an-world:chung", {
    config: {
      presence: { key: clientId },
      broadcast: { self: false },
    },
  });
  // Keep a stable reference to this connection. A reconnect can replace the
  // global channel while an older async subscribe/track callback is still running.
  const activeChannel = channel;

  activeChannel
    .on("presence", { event: "sync" }, () => {
      if (attempt === connectionAttempt && channel === activeChannel) readPresence(activeChannel);
    })
    .on("presence", { event: "join" }, () => {
      if (attempt === connectionAttempt && channel === activeChannel) readPresence(activeChannel);
    })
    .on("presence", { event: "leave" }, () => {
      if (attempt === connectionAttempt && channel === activeChannel) readPresence(activeChannel);
    })
    .on("broadcast", { event: "chat_message" }, ({ payload }) => {
      if (attempt !== connectionAttempt || channel !== activeChannel) return;
      const message = payload as TempleChatMessage;
      if (message && typeof message.id === "string" && typeof message.name === "string" && typeof message.text === "string" && typeof message.at === "number") {
        addChatMessage({ id: message.id, name: message.name.slice(0, 24), text: message.text.slice(0, 300), at: message.at });
      }
    })
    .on("broadcast", { event: "prayer_message" }, ({ payload }) => {
      if (attempt !== connectionAttempt || channel !== activeChannel) return;
      const prayer = payload as TemplePrayer;
      if (prayer && typeof prayer.id === "string" && typeof prayer.name === "string" && typeof prayer.text === "string" && typeof prayer.at === "number") {
        addPrayer({ id: prayer.id, name: prayer.name.slice(0, 24), text: prayer.text.slice(0, 200), at: prayer.at });
      }
    })
    .on("broadcast", { event: "player_move" }, ({ payload }) => {
      if (attempt !== connectionAttempt || channel !== activeChannel) return;
      const incoming = payload as RemotePlayer;
      if (!incoming || typeof incoming.id !== "string" || !incoming.id || incoming.id === clientId ||
          !Number.isFinite(incoming.x) || !Number.isFinite(incoming.z)) return;
      const previous = snapshot.players.find((peer) => peer.id === incoming.id);
      const receivedSeq = Number.isFinite(incoming.seq) ? Number(incoming.seq) : 0;
      if (previous && Number(previous.seq ?? 0) > receivedSeq) return;
      const next: RemotePlayer = {
        ...incoming,
        name: typeof incoming.name === "string" && incoming.name.trim() ? incoming.name.slice(0, 24) : "Phật tử",
        x: incoming.x,
        z: incoming.z,
        rot: Number.isFinite(incoming.rot) ? incoming.rot : previous?.rot ?? Math.PI,
        // Local receipt time drives expiry; sender clocks may differ.
        updatedAt: Date.now(),
        seq: receivedSeq,
      };
      const players = snapshot.players.filter((peer) => peer.id !== next.id);
      players.push(next);
      publish({ connected: snapshot.connected, players, roomId: currentRoomId });
    })
    .subscribe(async (status) => {
      if (attempt !== connectionAttempt || channel !== activeChannel) return;
      if (status === "SUBSCRIBED") {
        // Supabase recovered on its own; cancel any pending full reconnect.
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        const avatar = getUI().avatar;

        const initialPresence: RemotePlayer = {
          id: authenticatedUserId,
          name: avatar?.name || "Phật tử",
          x: player.x,
          z: player.z,
          rot: player.rot,
          updatedAt: Date.now(),
          seq: movementSeq,
          outfit: avatar?.outfit ?? "lam",
          hair: avatar?.hair ?? "ngan",
          hairColor: avatar?.hairColor ?? "#1b1410",
        };
        const { error: trackError } = await activeChannel.track(initialPresence);
        // The page may have signed out or reconnected while track() was pending.
        if (attempt !== connectionAttempt || channel !== activeChannel) return;
        if (trackError) console.warn("Chùa Tâm An: chưa đăng ký được Presence.", trackError);
        let lastPresenceAt = Date.now();
        // Reconcile periodically in case a presence sync event was missed.
        readPresence(activeChannel);
        publish({ ...snapshot, connected: true, roomId: currentRoomId });
        if (presenceTimer) clearInterval(presenceTimer);
        presenceTimer = setInterval(() => {
          if (channel === activeChannel && attempt === connectionAttempt) readPresence(activeChannel);
        }, 1500);
        if (timer) clearInterval(timer);
        let lastX = player.x;
        let lastZ = player.z;
        let lastRot = player.rot;
        let lastBroadcastAt = 0;
        timer = setInterval(() => {
          if (channel !== activeChannel || attempt !== connectionAttempt) return;
          const now = Date.now();
          const currentAvatar = getUI().avatar;
          const moved = Math.abs(player.x - lastX) > 0.06 || Math.abs(player.z - lastZ) > 0.06 || Math.abs(player.rot - lastRot) > 0.06;
          const heartbeatDue = now - lastBroadcastAt >= 1500;
          if (!moved && !heartbeatDue) {
            // Presence is a room roster, not a per-frame movement stream.
            // Refresh it slowly so Supabase does not flood every client with
            // presence-sync events while someone walks or runs.
            if (now - lastPresenceAt >= 3000) {
              lastPresenceAt = now;
              void activeChannel.track({
                id: authenticatedUserId,
                name: currentAvatar?.name || "Phật tử",
                x: player.x, z: player.z, rot: player.rot, updatedAt: now,
                outfit: currentAvatar?.outfit ?? "lam",
                hair: currentAvatar?.hair ?? "ngan",
                hairColor: currentAvatar?.hairColor ?? "#1b1410",
                seq: movementSeq,
              } satisfies RemotePlayer);
            }
            return;
          }
          lastX = player.x; lastZ = player.z; lastRot = player.rot; lastBroadcastAt = now;
          const payload: RemotePlayer = {
            id: authenticatedUserId,
            name: currentAvatar?.name || "Phật tử",
            x: player.x, z: player.z, rot: player.rot, updatedAt: now,
            seq: ++movementSeq,
            outfit: currentAvatar?.outfit ?? "lam",
            hair: currentAvatar?.hair ?? "ngan",
            hairColor: currentAvatar?.hairColor ?? "#1b1410",
          };
          // Broadcast movement frequently enough for smooth remote motion,
          // but update Presence only every 3 seconds to avoid sync storms.
          void activeChannel.send({ type: "broadcast", event: "player_move", payload });
          if (now - lastPresenceAt >= 3000) {
            lastPresenceAt = now;
            void activeChannel.track(payload);
          }
        }, 150);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        // Keep the last known remote avatars briefly to avoid visual flicker
        // while Realtime recovers, then rebuild the channel if it did not.
        publish({ ...snapshot, connected: false, roomId: currentRoomId });
        if (timer) clearInterval(timer);
        timer = null;
        if (presenceTimer) clearInterval(presenceTimer);
        presenceTimer = null;
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (attempt !== connectionAttempt) return;
            // Do not let an obsolete channel's retry tear down a newer connection.
            if (channel !== activeChannel || attempt !== connectionAttempt) return;
            channel = null;
            if (client) void client.removeChannel(activeChannel);
            client = null;
            connectMultiplayer();
          }, 2500);
        }
      }
    });
}

export function disconnectMultiplayer() {
  connectionAttempt += 1;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (timer) clearInterval(timer);
  timer = null;
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
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
