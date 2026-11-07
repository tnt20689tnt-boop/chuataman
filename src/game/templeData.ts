// Shared architectural footprint: rendering and collision use the same placement.
export const HALL = { x: 0, z: -62, floor: 1.2, halfW: 23, halfD: 15, stairW: 14 };
export const BUILDINGS = [
  { id: "to", label: "NHÀ THỜ TỔ", x: 0, z: -101, w: 26, d: 17, h: 7, kind: "ancestral" },
  { id: "thienDuong", label: "THIỀN ĐƯỜNG", x: -70, z: -15, w: 24, d: 18, h: 6, kind: "meditation" },
  { id: "thuVien", label: "THƯ VIỆN PHẬT GIÁO", x: 82, z: -64, w: 25, d: 18, h: 7, kind: "library" },
  { id: "nhaKhach", label: "NHÀ KHÁCH", x: -76, z: 70, w: 25, d: 16, h: 6, kind: "guest" },
] as const;
export const SCENE_COLORS = {
  wood: "#553629", woodDark: "#30221b", lacquer: "#793f32", gold: "#b99b58",
  stone: "#b0b3a9", roof: "#655f58", bronze: "#9c834f", sky: "#d9e8e8", fog: "#d4e1da",
  sun: "#fff3de", ambient: "#e5eef3", groundLight: "#657452", foliage: "#426447",
  altarRed: "#72251f", altarGold: "#d1ac61", porcelain: "#e5e9de", porcelainInk: "#386157",
  candle: "#ead7a7", flame: "#ffce79", warmLight: "#ffdfad", smoke: "#e8e5dc",
  mat: "#8c5546", matBorder: "#c49c68", ceiling: "#32251f", ceilingRelief: "#b39153",
};
