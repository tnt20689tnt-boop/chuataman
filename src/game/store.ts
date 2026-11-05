import { useSyncExternalStore } from "react";
import type { Hair, Outfit, Pose } from "./sim";

// Per-frame mutable state (never put in React state)
export const player = { x: 0, z: 21, rot: Math.PI };
export const cam = { yaw: 0, pitch: 0.42, dist: 14 };
export const input = { fwd: 0, right: 0, run: false, joyF: 0, joyR: 0 };

export type Action = "none" | "le" | "chap" | "thien" | "kinh";

export interface Avatar {
  name: string;
  outfit: Outfit;
  hair: Hair;
  hairColor: string;
}

interface UIState {
  avatar: Avatar | null;
  action: Action;
  pose: Pose;
  panel: null | "tour" | "chat" | "phap" | "avatar" | "pray" | "auth" | "rooms" | "audio";
  zoneLabel: string;
  sceneReady: boolean;
}

let state: UIState = {
  avatar: null,
  action: "none",
  pose: "stand",
  panel: null,
  zoneLabel: "Sân chùa",
  sceneReady: false,
};
const subs = new Set<() => void>();
export function setUI(p: Partial<UIState>) {
  state = { ...state, ...p };
  subs.forEach((f) => f());
}
export function getUI() {
  return state;
}
export function useUI<T>(sel: (s: UIState) => T): T {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => sel(state),
    () => sel(state),
  );
}

const AV_KEY = "tam-an-avatar";
export function loadAvatar(): Avatar | null {
  try {
    const raw = localStorage.getItem(AV_KEY);
    return raw ? (JSON.parse(raw) as Avatar) : null;
  } catch {
    return null;
  }
}
export function saveAvatar(a: Avatar) {
  localStorage.setItem(AV_KEY, JSON.stringify(a));
  setUI({ avatar: a });
}

export function teleport(x: number, z: number, rot: number) {
  player.x = x;
  player.z = z;
  player.rot = rot;
  cam.yaw = rot + Math.PI;
}
