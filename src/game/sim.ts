// Pure simulation/data for Chùa Tâm An. No React, no three.js.
import { moveVisitor } from './collision';
import { BUILDINGS } from './templeData';

export type Pose = "stand" | "walk" | "sit" | "kneel" | "pray" | "lie";
export type Outfit = "lam" | "trang" | "nau" | "tusi" | "vang";
export type Gender = "nam" | "nu";

export const OUTFIT_COLORS: Record<Outfit, string> = {
  lam: "#6f8fa8", // áo lam
  trang: "#ecebe4", // áo tràng trắng
  nau: "#7a5a3c", // áo tràng nâu
  tusi: "#c9772b", // tu sĩ (y vàng đậm)
  vang: "#d9a93a", // áo vàng
};
export const OUTFIT_LABEL: Record<Outfit, string> = {
  lam: "Áo lam",
  trang: "Áo tràng trắng",
  nau: "Áo tràng nâu",
  tusi: "Y tu sĩ",
  vang: "Áo vàng",
};
export const HAIR_COLORS: [string, ...string[]] = ["#1b1410", "#2b1d14", "#3a2a1e", "#151515"];
export type Hair = "troc" | "ngan" | "bui" | "dai";
export const HAIR_LABEL: Record<Hair, string> = {
  troc: "Cạo trọc",
  ngan: "Tóc ngắn",
  bui: "Búi tóc",
  dai: "Tóc dài",
};

export interface Npc {
  id: number;
  name: string;
  x: number;
  z: number;
  rot: number;
  pose: Pose;
  outfit: Outfit;
  hair: Hair;
  gender: Gender;
  // walkers circle around a center
  cx: number;
  cz: number;
  r: number;
  speed: number;
  phase: number;
}

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const PHAP = ["Diệu Hạnh", "Tâm Minh", "Thiện Tâm", "Quảng Đức", "Diệu Liên", "Minh Tuệ", "An Lạc", "Tịnh Hải", "Chơn Như", "Huệ Tâm", "Từ Bi", "Pháp Hỷ", "Nguyên Thanh", "Diệu Âm", "Thiện Phúc", "Hạnh Nguyên"];

// deterministic RNG
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Courtyard bounds (in front of main hall which sits at z = -62)
export const COURT = { minX: -38, maxX: 38, minZ: -44, maxZ: 22 };
export const HALL_Z = -62;

export function makeCrowd(count = 1000, seed = 7): Npc[] {
  const r = rng(seed);
  const out: Npc[] = [];
  const cols = 40;
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const row = Math.floor(i / cols);
    const x = COURT.minX + 2 + (c / (cols - 1)) * (COURT.maxX - COURT.minX - 4) + (r() - 0.5) * 0.6;
    const z = COURT.minZ + 4 + (row / (rows - 1)) * (COURT.maxZ - COURT.minZ - 8) + (r() - 0.5) * 0.6;
    const p = r();
    // Front rows kneel/pray facing the hall, middle sit in meditation, back stand/walk
    let pose: Pose;
    if (row < 6) pose = p < 0.6 ? "kneel" : "pray";
    else if (row < 14) pose = p < 0.75 ? "sit" : "pray";
    else pose = p < 0.35 ? "walk" : p < 0.7 ? "stand" : "pray";
    const o = r();
    const outfit: Outfit = o < 0.08 ? "tusi" : o < 0.45 ? "lam" : o < 0.7 ? "trang" : o < 0.9 ? "nau" : "vang";
    const gender: Gender = outfit === "tusi" || r() < 0.5 ? "nam" : "nu";
    const h = r();
    const hair: Hair = outfit === "tusi" ? "troc" : gender === "nam" ? (h < 0.72 ? "ngan" : "bui") : (h < 0.48 ? "bui" : "dai");
    const name = outfit === "tusi" ? `Thầy ${PHAP[Math.floor(r() * PHAP.length)]}` : `${HO[Math.floor(r() * HO.length)]} ${PHAP[Math.floor(r() * PHAP.length)]}`;
    out.push({
      id: i,
      name,
      x,
      z,
      rot: Math.PI, // face the hall (-z)
      pose,
      outfit,
      hair,
      gender,
      cx: x,
      cz: z,
      r: 1.5 + r() * 3,
      speed: (0.25 + r() * 0.35) * (r() < 0.5 ? 1 : -1),
      phase: r() * Math.PI * 2,
    });
  }
  return out;
}

export function walkerPos(n: Npc, t: number) {
  const a = n.phase + t * n.speed;
  return {
    x: n.cx + Math.cos(a) * n.r,
    z: n.cz + Math.sin(a) * n.r,
    rot: Math.atan2(-Math.sin(a) * Math.sign(n.speed), Math.cos(a) * Math.sign(n.speed)) ,
  };
}

// Player movement — camera relative
export const MOVE = { SPEED: 7, RUN: 13, TURN: 12 };
export const WORLD_LIMIT = 140;

export function stepPlayer(
  p: { x: number; y: number; z: number; rot: number },
  input: { fwd: number; right: number; run: boolean },
  camYaw: number,
  dt: number,
) {
  const len = Math.hypot(input.fwd, input.right);
  if (len < 0.01) return false;
  const f = input.fwd / Math.max(1, len);
  const s = input.right / Math.max(1, len);
  // forward = direction camera is looking on XZ plane
  const fx = -Math.sin(camYaw);
  const fz = -Math.cos(camYaw);
  const rx = Math.cos(camYaw);
  const rz = -Math.sin(camYaw);
  const dx = fx * f + rx * s;
  const dz = fz * f + rz * s;
  const sp = input.run ? MOVE.RUN : MOVE.SPEED;
  const nextX = clamp(p.x + dx * sp * dt, -WORLD_LIMIT, WORLD_LIMIT);
  const nextZ = clamp(p.z + dz * sp * dt, -WORLD_LIMIT, WORLD_LIMIT);

  const moved = moveVisitor(p, nextX - p.x, nextZ - p.z);
  const target = Math.atan2(dx, dz);
  let d = target - p.rot;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  p.rot += d * (1 - Math.exp(-MOVE.TURN * dt));
  return moved;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface Zone {
  id: string;
  name: string;
  x: number;
  z: number;
  rot: number;
}
export const ZONES: Zone[] = [
  { id: "cong", name: "Con đường vào chùa", x: 0, z: 95, rot: Math.PI },
  { id: "san", name: "Sân chùa", x: 0, z: 28, rot: Math.PI },
  { id: "dien", name: "Đại điện – Lễ Phật", x: 0, z: -50, rot: Math.PI },
  { id: "thien", name: "Khu thiền định", x: -70, z: 20, rot: Math.PI / 2 },
  { id: "phap", name: "Giảng đường thuyết pháp", x: 70, z: 40, rot: Math.PI },
  { id: "ho", name: "Hồ sen & vườn hoa", x: 76, z: -14, rot: Math.PI },
  { id: "chuong", name: "Tháp chuông", x: -55, z: -40, rot: Math.PI },
  { id: "kinh", name: "Tháp kinh", x: 50, z: -50, rot: Math.PI },
  { id: "giaoluu", name: "Khu giao lưu Phật tử", x: -70, z: 62, rot: Math.PI },
  { id: "phongsinh", name: "Khu phóng sinh (biểu tượng)", x: 90, z: -20, rot: -Math.PI / 2 },
  ...BUILDINGS.map(b => ({ id: b.id, name: b.label, x: b.x, z: b.z + b.d / 2 + 3, rot: Math.PI })),
];

export const QUOTES = [
  "Hận thù không thể xóa bỏ hận thù, chỉ có tình thương mới xóa bỏ được hận thù.",
  "Tâm là gốc của muôn pháp. Tâm dẫn đầu, tâm làm chủ, tâm tạo tác.",
  "Không làm các điều ác, siêng làm các việc lành, giữ tâm ý trong sạch – đó là lời chư Phật dạy.",
  "Hạnh phúc không đến từ bên ngoài, mà đến từ chính tâm an của bạn.",
  "Một ngọn nến có thể thắp sáng ngàn ngọn nến khác mà không tự làm mình ngắn lại.",
  "Đừng sống trong quá khứ, đừng mơ về tương lai, hãy tập trung vào hiện tại.",
  "Người chiến thắng chính mình là người chiến thắng vẻ vang nhất.",
];
export function quoteOfDay(d = new Date()) {
  const day = Math.floor(d.getTime() / 86400000);
  return QUOTES[day % QUOTES.length];
}

export const TAM_KINH =
  "Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời, chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách. Xá Lợi Tử, sắc bất dị không, không bất dị sắc, sắc tức thị không, không tức thị sắc, thọ tưởng hành thức diệc phục như thị.";

export const PHAP_THOAI =
  "Kính thưa đại chúng. Hôm nay chúng ta cùng nói về chánh niệm. Chánh niệm là biết rõ mình đang làm gì trong giây phút hiện tại. Khi bước đi, ta biết mình đang bước. Khi thở vào, ta biết mình đang thở vào. Thực tập như vậy, tâm sẽ an, và hạnh phúc có mặt ngay bây giờ.";
