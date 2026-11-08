// Shared architectural footprint: rendering and collision use the same placement.
export const HALL = { x: 0, z: -62, floor: 1.2, halfW: 23, halfD: 15, stairW: 14 };
export interface TempleBuilding {
  id: string;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: "ancestral" | "meditation" | "lecture" | "guest" | "library";
}
export const BUILDINGS: readonly TempleBuilding[] = [
  { id: "to", label: "NHÀ THỜ TỔ", x: -42, z: -62, w: 26, d: 17, h: 7, kind: "ancestral" },
  { id: "thienDuong", label: "THIỀN ĐƯỜNG", x: -42, z: -15, w: 24, d: 18, h: 6, kind: "meditation" },
  { id: "nhaGiang", label: "NHÀ GIẢNG PHÁP", x: 42, z: -62, w: 26, d: 18, h: 7, kind: "lecture" },
  { id: "nhaKhach", label: "NHÀ KHÁCH", x: 42, z: -15, w: 25, d: 16, h: 6, kind: "guest" },
] as const;
export const SCENE_COLORS = {
  wood: "#7a3d2d", woodDark: "#4b241b", lacquer: "#b5482c", gold: "#d6a653",
  stone: "#b8b19e", roof: "#bd4b2f", bronze: "#9c834f", sky: "#d9e8e8", fog: "#d4e1da",
  sun: "#fff3de", ambient: "#e5eef3", groundLight: "#657452", foliage: "#426447",
  altarRed: "#72251f", altarGold: "#d1ac61", porcelain: "#e5e9de", porcelainInk: "#386157",
  candle: "#ead7a7", flame: "#ffce79", warmLight: "#ffdfad", smoke: "#e8e5dc",
  mat: "#8c5546", matBorder: "#c49c68", ceiling: "#32251f", ceilingRelief: "#b39153",
};
