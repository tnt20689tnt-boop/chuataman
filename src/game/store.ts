import { useSyncExternalStore } from "react";
import type { Hair, Outfit, Pose } from "./sim";
import { isBlocked, surfaceHeight } from './collision';

// Per-frame mutable state (never put in React state)
// Spawn on the main approach, 5m before the near end of the lotus bridge, facing straight toward it.
export const player = { x: 0, y: 0, z: 34, rot: Math.PI };
export const cam = { yaw: 0, pitch: 0.42, dist: 14 };
export const input = { fwd: 0, right: 0, run: false, joyF: 0, joyR: 0 };

export type Action = "none" | "le" | "chap" | "thien" | "kinh";

export type AvatarModelId = "male_animated" | "female_animated";

export type AvatarAccessory = "neck_mala" | "wrist_mala" | "shoulder_sash";

export interface Avatar {
  name: string;
  modelId?: AvatarModelId;
  gender?: "nam" | "nu";
  outfit: Outfit;
  hair: Hair;
  hairColor: string;
  accessory?: AvatarAccessory;
}

interface UIState {
  avatar: Avatar | null;
  avatarPreview: Avatar | null;
  action: Action;
  pose: Pose;
  panel: null | "tour" | "chat" | "phap" | "avatar" | "pray" | "auth" | "rooms" | "audio";
  zoneLabel: string;
  sceneReady: boolean;
}

let state: UIState = {
  avatar: null,
  avatarPreview: null,
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
    if (!raw) return null;
    const saved = JSON.parse(raw) as Avatar;
    // Keep the selected gender mapped to its matching animated GLB character.
    saved.modelId = saved.gender === "nu" ? "female_animated" : "male_animated";
    localStorage.setItem(AV_KEY, JSON.stringify(saved));
    return saved;
  } catch {
    return null;
  }
}
export function saveAvatar(a: Avatar) {
  const originalAvatar: Avatar = { ...a, modelId: a.gender === "nu" ? "female_animated" : "male_animated" };
  localStorage.setItem(AV_KEY, JSON.stringify(originalAvatar));
  setUI({ avatar: originalAvatar, avatarPreview: null });
}

export function teleport(x: number, z: number, rot: number) {
  // Never place a visitor inside a solid collider (for example pond water).
  // If a future tour waypoint is misplaced, find the nearest walkable point.
  let targetX = x;
  let targetZ = z;
  if (isBlocked(targetX, targetZ)) {
    let found = false;
    for (let radius = 0.5; radius <= 10 && !found; radius += 0.5) {
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const candidateX = x + Math.cos(angle) * radius;
        const candidateZ = z + Math.sin(angle) * radius;
        if (!isBlocked(candidateX, candidateZ)) {
          targetX = candidateX;
          targetZ = candidateZ;
          found = true;
          break;
        }
      }
    }
  }
  player.x = targetX;
  player.y = surfaceHeight(targetX, targetZ);
  player.z = targetZ;
  player.rot = rot;
  cam.yaw = rot + Math.PI;
}
