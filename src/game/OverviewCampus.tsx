import { useMemo } from "react";
import * as THREE from "three";
import { Buddha, Gate, MainHall, Pavilion, Pond, Roof, Tower, Waterfall } from "./Architecture";
import { LotusField, PetalFall, Fireflies } from "./NatureUpgrade";
import { Surface } from "./Materials";
import { Inscription } from "./TempleDetails";
import { BUILDINGS, SCENE_COLORS as C, type TempleBuilding } from "./templeData";

/* ============================================================================
   CHÙA TÂM AN — dựng lại theo "Bản đồ tổng thể Chùa Tâm An":
     1  Tam Quan (cổng tam quan phía trước, z = 112)
     2  Sân Chùa (nền gạch lát rộng sau Tam Quan)
     3  Chính Điện (trung tâm, trên nền gạch lớn)
     4  Nhà Giảng Pháp (bên phải / đông)
     5  Nhà Thờ Tổ (bên trái / tây)
     6  Bảo Tháp (trái sau, gần núi)
     7  Tượng Phật Lớn + Núi Thiên + thác nước (phía sau)
     8  Hồ Sen + Cầu Đá (hai hồ sen hai bên trục, cầu đá bắc qua hồ phải)
     9  Vườn Thiền Cây Bồ Đề (trước bên trái)
   Mọi công trình đặt trên nền gạch lát, hồ sen phủ kín lá sen và hoa sen.
============================================================================ */

// ---------- Nền gạch lát (theo ô gạch trong bản đồ) ----------
function useBrickTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#c9bda6";
      ctx.fillRect(0, 0, 512, 512);
      const bw = 64;
      const bh = 32;
      for (let row = 0; row < 512 / bh; row++) {
        for (let col = -1; col < 512 / bw + 1; col++) {
          const off = row % 2 ? bw / 2 : 0;
          ctx.fillStyle = (row + col) % 2 ? "#c2b69e" : "#d0c5ae";
          ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
        }
      }
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 700; i++) {
        const x = (i * 73) % 512;
        const y = (i * 137) % 512;
        ctx.fillStyle = i % 2 ? "#efe6d2" : "#6b6350";
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function BrickPaving({ w, d, x = 0, z = 0 }: { w: number; d: number; x?: number; z?: number }) {
  const tex = useBrickTexture();
  const map = useMemo(() => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 6, d / 6);
    return t;
  }, [tex, w, d]);
  return (
    <mesh position={[x, 0.055, z]} receiveShadow>
      <boxGeometry args={[w, 0.11, d]} />
      <meshStandardMaterial map={map} roughness={0.94} />
    </mesh>
  );
}

// ---------- Cây cảnh khuôn viên (xanh) & cây hoa anh đào (theo bản đồ) ----------
function MiniTree({ position, scale = 1, blossom = false }: { position: [number, number, number]; scale?: number; blossom?: boolean }) {
  const canopies: [number, number, number, number, number, number][] = [
    [0, 2.95, 0, 1.22, 0.82, 1.08], [-0.9, 2.65, 0.15, 0.74, 0.66, 0.78],
    [0.88, 2.7, -0.18, 0.78, 0.68, 0.8], [0.08, 2.72, 0.86, 0.7, 0.62, 0.72],
  ];
  return (
    <group position={position} scale={scale} name="Cây cảnh khuôn viên">
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.28, 0.46, 2.5, 9]} /><meshStandardMaterial color="#68412d" roughness={1} /></mesh>
      {canopies.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} castShadow>
          <sphereGeometry args={[1.55, 14, 10]} />
          <meshStandardMaterial color={i % 2 === 0 ? (blossom ? "#8aa864" : "#3d7042") : "#4c7c49"} roughness={0.96} />
        </mesh>
      ))}
      {blossom && Array.from({ length: 8 }, (_, i) => {
        const a = i * Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, 3.2 + (i % 3) * 0.22, Math.sin(a) * 0.8]} scale={0.2}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={i % 2 ? "#e795a8" : "#f4c2cd"} roughness={0.86} />
          </mesh>
        );
      })}
    </group>
  );
}

// Cây hoa (sakura) như trong bản đồ: tán hoa hồng phủ kín.
function SakuraTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale} name="Cây hoa anh đào">
      <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.26, 0.44, 3, 9]} /><meshStandardMaterial color="#5d3d2c" roughness={1} /></mesh>
      <mesh position={[0.35, 2.9, 0.15]} rotation-z={-0.5} castShadow><cylinderGeometry args={[0.12, 0.18, 1.6, 7]} /><meshStandardMaterial color="#5d3d2c" roughness={1} /></mesh>
      {[[0, 3.7, 0, 1.35, 0.9, 1.2], [-0.95, 3.35, 0.25, 0.8, 0.62, 0.8], [1, 3.4, -0.25, 0.85, 0.66, 0.85], [0.15, 3.35, 0.95, 0.75, 0.58, 0.75]].map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} castShadow>
          <sphereGeometry args={[1.5, 14, 10]} />
          <meshStandardMaterial color={i % 2 ? "#e8a7b8" : "#f2c4d0"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Hoa sen (lá + bông sen hồng) ----------
function LotusPond({ x, z, w, d, count = 120 }: { x: number; z: number; w: number; d: number; count?: number }) {
  return (
    <group position={[x, 0, z]} name="Hồ sen">
      <Pond position={[0, 0, 0]} w={w} d={d} />
      <LotusField w={w} d={d} count={count} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0.22, s * d / 2]} castShadow receiveShadow><boxGeometry args={[w + 1.4, 0.44, 1]} /><Surface kind="stone" repeat={4} /></mesh>
          <mesh position={[s * w / 2, 0.22, 0]} castShadow receiveShadow><boxGeometry args={[1, 0.44, d + 1.4]} /><Surface kind="stone" repeat={4} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Cầu đá cong bắc qua hồ sen (theo bản đồ) ----------
function LotusBridge({ x, z }: { x: number; z: number }) {
  // Span the full 40m pond, with stone landing pads at both banks.
  const length = 40;
  const rail = useMemo(() => {
    const points = Array.from({ length: 121 }, (_, i) => new THREE.Vector3(
      0,
      0.45 + Math.sin((i / 120) * Math.PI) * 1.1,
      -length / 2 + (i / 120) * length,
    ));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.08, 6, false);
  }, []);
  return (
    <group position={[x, 0, z]} name="Cầu đá cong hồ sen">
      {Array.from({ length }, (_, i) => (
        <mesh key={i} position={[0, 0.27 + Math.sin(((i + 0.5) / length) * Math.PI) * 1.1, -length / 2 + 0.5 + i]} receiveShadow castShadow>
          <boxGeometry args={[3.2, 0.36, 1.06]} /><Surface kind="stone" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.5, 0, 0]}>
          <mesh geometry={rail} position={[0, 1, 0]} castShadow><meshStandardMaterial color={C.stone} roughness={0.86} /></mesh>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[0, 0.95 + Math.sin((i / 8) * Math.PI) * 1.1, -length / 2 + i * (length / 8)]} castShadow>
              <boxGeometry args={[0.2, 1.15, 0.2]} /><Surface kind="stone" />
            </mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[0, 0.08, end * (length / 2 + 1.1)]} receiveShadow>
          <boxGeometry args={[4.8, 0.16, 2.2]} /><Surface kind="stone" />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Đèn đá ----------
function StoneLantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="Đèn đá">
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.2, 0.3, 1, 8]} /><meshStandardMaterial color="#8d8a7e" roughness={1} /></mesh>
      <mesh position={[0, 1.06, 0]}><boxGeometry args={[0.78, 0.14, 0.78]} /><meshStandardMaterial color="#77776d" roughness={1} /></mesh>
      <mesh position={[0, 1.34, 0]}><boxGeometry args={[0.48, 0.42, 0.48]} /><meshStandardMaterial color="#d9b779" emissive="#d39a4e" emissiveIntensity={0.3} /></mesh>
      <mesh position={[0, 1.62, 0]}><coneGeometry args={[0.54, 0.26, 4]} /><meshStandardMaterial color="#77776d" roughness={1} /></mesh>
    </group>
  );
}

// ---------- Vườn Thiền Cây Bồ Đề (trước bên trái, theo bản đồ) ----------
function BodhiGarden() {
  return (
    <group position={[-70, 0, 80]} name="Vườn Thiền Cây Bồ Đề">
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} receiveShadow>
        <circleGeometry args={[15, 72]} />
        <meshStandardMaterial color="#b9ae97" roughness={1} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.14, 0]}>
        <torusGeometry args={[14.55, 0.26, 10, 96]} />
        <meshStandardMaterial color="#8e8879" roughness={0.92} />
      </mesh>
      {/* đường cái rối dẫn vào tâm vườn */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 0.5) * 2, 0.2, 13 - i * 2]} rotation-y={i * 0.5} castShadow receiveShadow>
          <cylinderGeometry args={[0.72 + (i % 3) * 0.1, 0.82 + (i % 3) * 0.1, 0.26, 7]} />
          <meshStandardMaterial color={i % 2 ? "#aaa18f" : "#c2b9a6"} roughness={0.96} />
        </mesh>
      ))}
      {/* vòng đèn đá */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = i * Math.PI / 3 + 0.4;
        return <StoneLantern key={i} position={[Math.cos(a) * 12.2, 0, Math.sin(a) * 12.2]} />;
      })}
      {/* Cây Bồ Đề lớn ở tâm */}
      <group position={[0, 0, -2]} name="Cây Bồ Đề">
        <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.85, 5.2, 14]} />
          <meshStandardMaterial color="#6f4b32" roughness={0.96} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => {
          const a = i * Math.PI * 2 / 7;
          return (
            <group key={i} rotation-y={a}>
              <mesh position={[0.36, 0.34, 0]} rotation-z={-0.42} castShadow>
                <coneGeometry args={[0.22, 1.5, 8]} />
                <meshStandardMaterial color="#76543a" roughness={0.96} />
              </mesh>
            </group>
          );
        })}
        {Array.from({ length: 14 }, (_, i) => {
          const a = i * 2.399;
          const ring = i % 3;
          const x = Math.cos(a) * (2 + ring * 0.7);
          const z = Math.sin(a) * (1.75 + ring * 0.5);
          const y = 5 + (i % 4) * 0.66;
          const size = 1.5 + (i % 3) * 0.24;
          return (
            <mesh key={i} position={[x, y, z]} scale={[size * 1.18, size * 0.78, size]} castShadow receiveShadow>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color={i % 3 === 0 ? "#4f7d45" : "#649054"} roughness={0.94} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.1, 0]} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[2.2, 0.12, 8, 48]} />
          <meshStandardMaterial color="#a99b7e" roughness={0.95} />
        </mesh>
      </group>
      <Inscription text="VƯỜN THIỀN CÂY BỒ ĐỀ" width={7} height={1} position={[0, 1.5, 14.4]} stone />
    </group>
  );
}

// ---------- Nhà bên (Thờ Tổ / Giảng Pháp / Thiền đường / Nhà khách) ----------
function SideHall({ building }: { building: TempleBuilding }) {
  const { x, z, w: width, d: depth, h: height, label, kind } = building;
  return (
    <group position={[x, 0, z]} name={label}>
      <mesh position={[0, 0.15, 0]} receiveShadow><boxGeometry args={[width + 2.6, 0.3, depth + 2.6]} /><Surface kind="stone" repeat={3} /></mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * width / 2, height / 2 + 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.65, height, depth]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>
          {[-1, 1].map((zSide) => (
            <group key={zSide} position={[side * (width / 2 + 0.34), height * 0.58 + 0.3, zSide * depth * 0.23]}>
              <mesh castShadow><boxGeometry args={[0.08, 1.9, 2.25]} /><meshStandardMaterial color="#39251e" roughness={0.58} /></mesh>
              {[-1, 1].map((edge) => <mesh key={edge} position={[side * 0.06, edge * 0.99, 0]}><boxGeometry args={[0.12, 0.12, 2.48]} /><meshStandardMaterial color={C.gold} metalness={0.28} roughness={0.65} /></mesh>)}
              {[-1, 1].map((edge) => <mesh key={edge} position={[side * 0.06, 0, edge * 1.15]}><boxGeometry args={[0.12, 2.1, 0.12]} /><meshStandardMaterial color={C.gold} metalness={0.28} roughness={0.65} /></mesh>)}
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, height / 2 + 0.3, -depth / 2]} castShadow receiveShadow><boxGeometry args={[width, height, 0.65]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * width / 3, height / 2 + 0.3, depth / 2]} castShadow receiveShadow><boxGeometry args={[width / 3 + 0.3, height, 0.65]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>)}
      <mesh position={[0, height - 0.15, depth / 2]} castShadow><boxGeometry args={[width / 3 + 1.2, 0.85, 0.75]} /><Surface kind="wood" /></mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 6 + 0.15), 0, depth / 2 + 0.35]}>
          <mesh position={[0, height * 0.48, 0]} castShadow><cylinderGeometry args={[0.25, 0.32, height * 0.9, 10]} /><meshStandardMaterial color={C.woodDark} roughness={0.9} /></mesh>
          <mesh position={[0, height * 0.94, 0]}><boxGeometry args={[0.7, 0.18, 0.7]} /><meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.4} /></mesh>
        </group>
      ))}
      <Roof w={width + 3.2} d={depth + 3.2} h={3.9} y={height + 0.35} />
      <Roof w={width * 0.7} d={depth * 0.42} h={1.55} y={height + 2.25} />
      {kind === "ancestral" && (
        <>
          <mesh position={[0, 0.55, -4.3]} castShadow><boxGeometry args={[10, 0.7, 4.5]} /><Surface kind="wood" /></mesh>
          <mesh position={[0, 1.08, -4.3]} castShadow><boxGeometry args={[8.7, 0.36, 3.4]} /><meshStandardMaterial color={C.lacquer} roughness={0.68} /></mesh>
          <Buddha position={[0, 1.3, -4.4]} scale={0.42} />
          {[-3.2, 3.2].map((side) => <mesh key={side} position={[side, 1.46, -4.25]}><cylinderGeometry args={[0.28, 0.34, 0.6, 12]} /><meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.44} /></mesh>)}
          <Inscription text="TỔ ĐƯỜNG" width={6.5} height={0.72} position={[0, height + 0.25, -depth / 2 + 0.36]} />
        </>
      )}
      {kind === "lecture" && (
        <>
          <mesh position={[0, 0.72, -5.1]} castShadow><boxGeometry args={[5.4, 1.08, 2.2]} /><Surface kind="wood" /></mesh>
          <mesh position={[0, 1.3, -5.1]}><boxGeometry args={[5.7, 0.12, 2.5]} /><meshStandardMaterial color={C.gold} metalness={0.38} roughness={0.5} /></mesh>
          {[-1, 1].flatMap((side) => [0, 1, 2].map((row) => (
            <group key={`${side}-${row}`} position={[side * 7, 0.38, -1 + row * 3.1]}>
              <mesh position={[0, 0.18, 0]} castShadow><boxGeometry args={[5.2, 0.38, 1.3]} /><Surface kind="wood" /></mesh>
              {[-1.9, 1.9].map((seat) => <mesh key={seat} position={[seat, -0.02, 0]}><boxGeometry args={[0.22, 0.42, 0.9]} /><Surface kind="wood" /></mesh>)}
            </group>
          )))}
        </>
      )}
      {kind === "meditation" && Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[-7.5 + (i % 4) * 5, 0.4, -3 + Math.floor(i / 4) * 3]}>
          <mesh><cylinderGeometry args={[0.68, 0.72, 0.18, 24]} /><meshStandardMaterial color={C.mat} roughness={0.94} /></mesh>
          <mesh position={[0, 0.105, 0]}><cylinderGeometry args={[0.56, 0.56, 0.04, 24]} /><meshStandardMaterial color={C.matBorder} roughness={0.86} /></mesh>
        </group>
      ))}
      {kind === "guest" && [-1, 1].map((side) => (
        <group key={side} position={[side * 7, 0, -3]}>
          <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[4.2, 0.52, 6.2]} /><Surface kind="wood" /></mesh>
          <mesh position={[0, 0.9, 0.25]} castShadow><boxGeometry args={[3.95, 0.18, 5.85]} /><meshStandardMaterial color="#e8dfce" roughness={0.94} /></mesh>
          <mesh position={[0, 1.05, -2.1]}><boxGeometry args={[2.1, 0.28, 1.1]} /><meshStandardMaterial color="#cebca0" roughness={0.92} /></mesh>
        </group>
      ))}
      <Inscription text={label} width={width * 0.5} height={1.05} position={[0, height - 0.45, depth / 2 + 0.22]} />
    </group>
  );
}

// ---------- Tường bao mái ngói cam (theo bản đồ) ----------
function PerimeterWall() {
  const runs = [
    { x: 0, z: -185, length: 240, rotation: 0 },
    { x: -120, z: -36.5, length: 297, rotation: Math.PI / 2 },
    { x: 120, z: -36.5, length: 297, rotation: Math.PI / 2 },
    { x: -65, z: 112, length: 110, rotation: 0 },
    { x: 65, z: 112, length: 110, rotation: 0 },
  ];
  return (
    <group name="Tường bao khuôn viên">
      {runs.map((run, index) => (
        <group key={index} position={[run.x, 0, run.z]} rotation-y={run.rotation}>
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[run.length, 2.5, 1.15]} />
            <Surface kind="stone" repeat={Math.max(2, Math.round(run.length / 8))} />
          </mesh>
          {/* mái ngói cam đặc trưng trên đỉnh tường */}
          <mesh position={[0, 2.62, 0]} castShadow>
            <boxGeometry args={[run.length + 0.3, 0.22, 1.7]} />
            <meshStandardMaterial color={C.roof} roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.78, 0]}>
            <boxGeometry args={[run.length + 0.34, 0.08, 0.5]} />
            <meshStandardMaterial color={C.gold} metalness={0.4} roughness={0.5} />
          </mesh>
          {Array.from({ length: Math.floor(run.length / 12) + 1 }, (_, i) => {
            const offset = -run.length / 2 + i * 12;
            return (
              <group key={i} position={[offset, 0, 0]}>
                <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.9, 2.9, 1.45]} />
                  <Surface kind="stone" />
                </mesh>
                <mesh position={[0, 3.05, 0]} castShadow>
                  <boxGeometry args={[1.3, 0.3, 1.8]} />
                  <meshStandardMaterial color={C.roof} roughness={0.85} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 12.5, 0, 112]}>
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.5, 1.1, 2]} /><Surface kind="stone" /></mesh>
          <mesh position={[0, 1.18, 0]}><boxGeometry args={[1.9, 0.18, 2.3]} /><meshStandardMaterial color={C.gold} /></mesh>
          <Inscription text={side < 0 ? "TỪ BI" : "AN LẠC"} width={1.1} height={0.65} position={[0, 0.62, 1.02]} stone small />
        </group>
      ))}
    </group>
  );
}

// ---------- Cây cối, hoa trồng dọc lối đi (theo bản đồ) ----------
function CampusPlantings() {
  const axisTrees: [number, number, number, boolean][] = [
    [-8.5, 88, 1.1, false], [8.5, 88, 1.1, false],
    [-8.5, 76, 1.05, true], [8.5, 76, 1.05, true],
    [-8.5, 28, 1.0, false], [8.5, 28, 1.0, false],
    [-8.5, 16, 1.05, true], [8.5, 16, 1.05, true],
  ];
  const sakuras: [number, number, number][] = [
    [-46, 74, 1.2], [-44, 34, 1.05], [46, 76, 1.25], [44, 32, 1.1],
    [-80, 40, 1.3], [82, 44, 1.35], [-58, -20, 1.2], [58, -20, 1.2],
  ];
  const greens: [number, number, number][] = [
    [-86, 84, 1.4], [-88, 10, 1.3], [88, 86, 1.45], [88, 8, 1.3],
    [-70, -60, 1.35], [72, -62, 1.3], [-40, -92, 1.4], [42, -94, 1.35],
  ];
  return (
    <group name="Cây cối và hoa khuôn viên">
      {axisTrees.map(([x, z, s, b], i) => <MiniTree key={i} position={[x, 0, z]} scale={s} blossom={b} />)}
      {sakuras.map(([x, z, s], i) => <SakuraTree key={i} position={[x, 0, z]} scale={s} />)}
      {greens.map(([x, z, s], i) => <MiniTree key={i} position={[x, 0, z]} scale={s} />)}
      {/* viền hoa hồng dọc trục chính */}
      {Array.from({ length: 22 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const z = 100 - Math.floor(i / 2) * 9;
        return (
          <mesh key={i} position={[side * 5.6, 0.42, z]} castShadow>
            <sphereGeometry args={[0.55 + (i % 3) * 0.09, 10, 8]} />
            <meshStandardMaterial color={i % 4 === 0 ? "#d97f95" : "#7aa052"} roughness={0.92} />
          </mesh>
        );
      })}
      {/* chậu hoa hai bên cổng và bậc thềm */}
      {[[-7, 106], [7, 106], [-10, -42], [10, -42], [-30, -44], [30, -44]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.7, 0.5, 0.7, 12]} /><meshStandardMaterial color="#a8552f" roughness={0.9} /></mesh>
          <mesh position={[0, 0.95, 0]} castShadow><sphereGeometry args={[0.62, 12, 9]} /><meshStandardMaterial color={i % 2 ? "#e58aa0" : "#d9758c"} roughness={0.9} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Sơ đồ tổng thể ----------
export function OverviewCampus() {
  return (
    <group name="Chùa Tâm An - bản đồ tổng thể">
      <PerimeterWall />

      {/* 2 · Sân Chùa: nền gạch lát rộng sau Tam Quan */}
      <BrickPaving w={148} d={26} x={0} z={96} />
      {/* Trục chính Tam Quan -> Chính Điện + đường ngang trước sân */}
      <BrickPaving w={7} d={150} x={0} z={36} />
      <BrickPaving w={120} d={6} x={0} z={8} />
      {/* 3 · Quảng trường nền gạch trước Chính Điện */}
      <BrickPaving w={78} d={48} x={0} z={-22} />

      {/* 8 · Hồ Sen hai bên trục — lá sen và hoa sen phủ kín mặt nước */}
      <LotusPond x={-27} z={52} w={30} d={40} count={110} />
      <LotusPond x={28} z={52} w={32} d={40} count={120} />
      <LotusBridge x={28} z={52} />
      <Pavilion position={[52, 0, 52]} />

      {/* 9 · Vườn Thiền Cây Bồ Đề */}
      <BodhiGarden />

      {/* Công trình chính — đặt trên nền gạch riêng */}
      {BUILDINGS.map((b) => <BrickPaving key={b.id} w={b.w + 10} d={b.d + 10} x={b.x} z={b.z} />)}
      {BUILDINGS.map((b) => <SideHall key={b.id} building={b} />)}
      <MainHall />
      <Gate z={112} />

      {/* 6 · Bảo Tháp (trái sau) */}
      <Tower position={[-58, 0, -118]} tiers={5} label="Bảo tháp" />

      {/* 7 · Tượng Phật Lớn + Núi Thiên + thác nước (phía sau cùng) */}
      <group position={[0, 0, -155]} name="Tượng Phật Lớn và Núi Thiên">
        <mesh position={[0, 0.25, 0]} receiveShadow><cylinderGeometry args={[42, 42, 1.6, 64]} /><meshStandardMaterial color="#cfc3ac" roughness={0.96} /></mesh>
        <mesh position={[0, 1.15, 0]} receiveShadow><cylinderGeometry args={[34, 34, 0.32, 64]} /><meshStandardMaterial color="#d7b56e" metalness={0.45} roughness={0.42} /></mesh>
        <mesh position={[0, 39, 0]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[15, 0.75, 16, 64]} /><meshStandardMaterial color="#e4bd62" emissive="#b8812f" emissiveIntensity={0.22} metalness={0.5} roughness={0.38} /></mesh>
        <Buddha position={[0, 1.45, 0]} scale={10} />
        <Inscription text="TƯỢNG PHẬT LỚN VÀ NÚI THIÊN" width={22} height={1.9} position={[0, 2.1, 34.2]} stone />
      </group>
      <Waterfall position={[0, 0, -181]} />

      {/* Cây cối, cây hoa và hiệu ứng thiên nhiên */}
      <CampusPlantings />
      <PetalFall />
      <Fireflies />
    </group>
  );
}