import { useMemo } from "react";
import * as THREE from "three";
import { Buddha, Gate, MainHall, Pavilion, Pond, Roof, Tower, Waterfall } from "./Architecture";
import { Surface } from "./Materials";
import { Inscription } from "./TempleDetails";
import { BUILDINGS, SCENE_COLORS as C, type TempleBuilding } from "./templeData";

function SideHall({ building }: { building: TempleBuilding }) {
  const { x, z, w: width, d: depth, h: height, label, kind } = building;
  return <group position={[x, 0, z]} name={label}>
    <mesh position={[0, 0.15, 0]} receiveShadow><boxGeometry args={[width + 2.6, 0.3, depth + 2.6]} /><Surface kind="stone" repeat={3} /></mesh>
    {/* Four separate wall runs leave a full-size, walkable front doorway. */}
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * width / 2, height / 2 + 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.65, height, depth]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>
      {[-1, 1].map((zSide) => <group key={zSide} position={[side * (width / 2 + 0.34), height * 0.58 + 0.3, zSide * depth * 0.23]}>
        <mesh castShadow><boxGeometry args={[0.08, 1.9, 2.25]} /><meshStandardMaterial color="#39251e" roughness={0.58} /></mesh>
        {[-1, 1].map((edge) => <mesh key={edge} position={[side * 0.06, edge * 0.99, 0]}><boxGeometry args={[0.12, 0.12, 2.48]} /><meshStandardMaterial color={C.gold} metalness={0.28} roughness={0.65} /></mesh>)}
        {[-1, 1].map((edge) => <mesh key={edge} position={[side * 0.06, 0, edge * 1.15]}><boxGeometry args={[0.12, 2.1, 0.12]} /><meshStandardMaterial color={C.gold} metalness={0.28} roughness={0.65} /></mesh>)}
      </group>)}
    </group>)}
    <mesh position={[0, height / 2 + 0.3, -depth / 2]} castShadow receiveShadow><boxGeometry args={[width, height, 0.65]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * width / 3, height / 2 + 0.3, depth / 2]} castShadow receiveShadow><boxGeometry args={[width / 3 + 0.3, height, 0.65]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>)}
    <mesh position={[0, height - 0.15, depth / 2]} castShadow><boxGeometry args={[width / 3 + 1.2, 0.85, 0.75]} /><Surface kind="wood" /></mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * (width / 6 + 0.15), 0, depth / 2 + 0.35]}>
      <mesh position={[0, height * 0.48, 0]} castShadow><cylinderGeometry args={[0.25, 0.32, height * 0.9, 10]} /><meshStandardMaterial color={C.woodDark} roughness={0.9} /></mesh>
      <mesh position={[0, height * 0.94, 0]}><boxGeometry args={[0.7, 0.18, 0.7]} /><meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.4} /></mesh>
    </group>)}
    <Roof w={width + 3.2} d={depth + 3.2} h={3.9} y={height + 0.35} />
    <Roof w={width * 0.7} d={depth * 0.42} h={1.55} y={height + 2.25} />
    {[0, 1, 2].map((step) => <mesh key={step} position={[0, (0.12 + step * 0.09) / 2, depth / 2 + 1.1 - step * 0.65]} receiveShadow>
      <boxGeometry args={[Math.min(width * 0.58, 13), 0.12 + step * 0.09, 0.9]} /><meshStandardMaterial color={step === 2 ? "#c8b99d" : "#938b7d"} roughness={0.95} />
    </mesh>)}
    {kind === "ancestral" && <>
      <mesh position={[0, 0.55, -4.3]} castShadow><boxGeometry args={[10, 0.7, 4.5]} /><Surface kind="wood" /></mesh>
      <mesh position={[0, 1.08, -4.3]} castShadow><boxGeometry args={[8.7, 0.36, 3.4]} /><meshStandardMaterial color={C.lacquer} roughness={0.68} /></mesh>
      <Buddha position={[0, 1.3, -4.4]} scale={0.42} />
      {[-3.2, 3.2].map((side) => <mesh key={side} position={[side, 1.46, -4.25]}><cylinderGeometry args={[0.28, 0.34, 0.6, 12]} /><meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.44} /></mesh>)}
      <Inscription text="TỔ ĐƯỜNG" width={6.5} height={0.72} position={[0, height + 0.25, -depth / 2 + 0.36]} />
    </>}
    {kind === "lecture" && <>
      <mesh position={[0, 0.72, -5.1]} castShadow><boxGeometry args={[5.4, 1.08, 2.2]} /><Surface kind="wood" /></mesh>
      <mesh position={[0, 1.3, -5.1]}><boxGeometry args={[5.7, 0.12, 2.5]} /><meshStandardMaterial color={C.gold} metalness={0.38} roughness={0.5} /></mesh>
      {[-1, 1].flatMap((side) => [0, 1, 2].map((row) => <group key={`${side}-${row}`} position={[side * 7, 0.38, -1 + row * 3.1]}>
        <mesh position={[0, 0.18, 0]} castShadow><boxGeometry args={[5.2, 0.38, 1.3]} /><Surface kind="wood" /></mesh>
        {[-1.9, 1.9].map((seat) => <mesh key={seat} position={[seat, -0.02, 0]}><boxGeometry args={[0.22, 0.42, 0.9]} /><Surface kind="wood" /></mesh>)}
      </group>))}
    </>}
    {kind === "meditation" && Array.from({ length: 12 }, (_, i) => <group key={i} position={[-7.5 + (i % 4) * 5, 0.4, -3 + Math.floor(i / 4) * 3]}>
      <mesh><cylinderGeometry args={[0.68, 0.72, 0.18, 24]} /><meshStandardMaterial color={C.mat} roughness={0.94} /></mesh>
      <mesh position={[0, 0.105, 0]}><cylinderGeometry args={[0.56, 0.56, 0.04, 24]} /><meshStandardMaterial color={C.matBorder} roughness={0.86} /></mesh>
    </group>)}
    {kind === "guest" && [-1, 1].map((side) => <group key={side} position={[side * 7, 0, -3]}>
      <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[4.2, 0.52, 6.2]} /><Surface kind="wood" /></mesh>
      <mesh position={[0, 0.9, 0.25]} castShadow><boxGeometry args={[3.95, 0.18, 5.85]} /><meshStandardMaterial color="#e8dfce" roughness={0.94} /></mesh>
      <mesh position={[0, 1.05, -2.1]}><boxGeometry args={[2.1, 0.28, 1.1]} /><meshStandardMaterial color="#cebca0" roughness={0.92} /></mesh>
    </group>)}
    <Inscription text={label} width={width * 0.5} height={1.05} position={[0, height - 0.45, depth / 2 + 0.22]} />
  </group>;
}

function MiniTree({ position, scale = 1, blossom = false }: { position: [number, number, number]; scale?: number; blossom?: boolean }) {
  const canopies: [number, number, number, number, number, number][] = [
    [0, 2.95, 0, 1.22, 0.82, 1.08], [-0.9, 2.65, 0.15, 0.74, 0.66, 0.78],
    [0.88, 2.7, -0.18, 0.78, 0.68, 0.8], [0.08, 2.72, 0.86, 0.7, 0.62, 0.72],
  ];
  return <group position={position} scale={scale} name="Cây cảnh khuôn viên">
    <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.28, 0.46, 2.5, 9]} /><meshStandardMaterial color="#68412d" roughness={1} /></mesh>
    {canopies.map(([x, y, z, sx, sy, sz], i) => <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} castShadow><sphereGeometry args={[1.55, 14, 10]} /><meshStandardMaterial color={i % 2 === 0 ? (blossom ? "#789b58" : "#3d7042") : "#4c7c49"} roughness={0.96} /></mesh>)}
    {blossom && Array.from({ length: 7 }, (_, i) => {
      const a = i * Math.PI * 2 / 7;
      return <mesh key={i} position={[Math.cos(a) * 0.94, 3.18 + (i % 2) * 0.28, Math.sin(a) * 0.78]} scale={0.2}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={i % 2 ? "#e4a1a5" : "#f2c4c8"} roughness={0.86} /></mesh>;
    })}
  </group>;
}

function LotusBridge() {
  const length = 24;
  const rail = useMemo(() => {
    const points = Array.from({ length: 73 }, (_, i) => new THREE.Vector3(
      0,
      0.45 + Math.sin((i / 72) * Math.PI) * 1.1,
      -length / 2 + (i / 72) * length,
    ));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 72, 0.08, 6, false);
  }, []);
  return <group position={[30, 0, 12]} name="Cầu đá cong hồ sen">
    {Array.from({ length }, (_, i) => <mesh key={i} position={[0, 0.27 + Math.sin(((i + 0.5) / length) * Math.PI) * 1.1, -length / 2 + 0.5 + i]} receiveShadow castShadow>
      <boxGeometry args={[3.2, 0.36, 1.06]} /><Surface kind="stone" />
    </mesh>)}
    {[-1, 1].map((side) => <group key={side} position={[side * 1.5, 0, 0]}>
      <mesh geometry={rail} position={[0, 1, 0]} castShadow><meshStandardMaterial color={C.stone} roughness={0.86} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, 0.95 + Math.sin((i / 8) * Math.PI) * 1.1, -length / 2 + i * (length / 8)]} castShadow>
        <boxGeometry args={[0.2, 1.15, 0.2]} /><Surface kind="stone" />
      </mesh>)}
    </group>)}
    {[-1, 1].map((end) => <mesh key={end} position={[0, 0.08, end * (length / 2 + 1.1)]} receiveShadow>
      <boxGeometry args={[4.8, 0.16, 2.2]} /><Surface kind="stone" />
    </mesh>)}
  </group>;
}

function AxialGardens() {
  const trees: [number, number, number, boolean][] = [
    [-72, 83, 1.3, false], [-48, 75, 1.0, true], [52, 76, 1.1, true], [74, 62, 1.35, false],
    [-75, 35, 1.25, false], [76, 34, 1.25, false], [-68, -8, 1.25, true], [68, -8, 1.25, true],
    [-63, -88, 1.4, false], [64, -89, 1.35, false], [-16, 26, 0.82, true], [16, 26, 0.82, true],
  ];
  return <group name="Vườn cây và sân đá toàn cảnh">
    <mesh position={[0, 0.04, 27]} receiveShadow><boxGeometry args={[6.4, 0.08, 132]} /><meshStandardMaterial color="#c5b79e" roughness={0.98} /></mesh>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * 26, 0.045, -13]} receiveShadow><boxGeometry args={[46, 0.09, 4.6]} /><meshStandardMaterial color="#c5b79e" roughness={0.98} /></mesh>
      <mesh position={[side * 25, 0.05, 36]} receiveShadow><boxGeometry args={[32, 0.1, 3.2]} /><meshStandardMaterial color="#c5b79e" roughness={0.98} /></mesh>
      {[-30, 12, 52].map((z) => <group key={z} position={[side * 22, 0, z]}>
        <mesh position={[0, 0.08, 0]} receiveShadow><boxGeometry args={[11, 0.16, 7]} /><meshStandardMaterial color={side < 0 ? "#6e8d54" : "#789657"} roughness={1} /></mesh>
        {[-3.7, 3.7].map((x) => <mesh key={x} position={[x, 0.3, 0]}><sphereGeometry args={[0.55, 10, 8]} /><meshStandardMaterial color="#d88d9c" roughness={0.9} /></mesh>)}
      </group>)}
    </group>)}
    {trees.map(([x, z, scale, blossom], i) => <MiniTree key={i} position={[x, 0, z]} scale={scale} blossom={blossom} />)}
    <group position={[-34, 0.05, 24]} name="Vườn thiền Cây Bồ Đề">
      <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[15, 72]} /><meshStandardMaterial color="#b8ad98" roughness={1} /></mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.12, 0]}><torusGeometry args={[14.55, 0.25, 10, 96]} /><meshStandardMaterial color="#8e8879" roughness={0.92} /></mesh>
      <mesh position={[0, 0.16, -1.8]} rotation-x={-Math.PI / 2}><circleGeometry args={[4.7, 48]} /><meshStandardMaterial color="#557576" roughness={0.25} metalness={0.16} /></mesh>
      {/* Lotus leaves and blossoms make the meditation pond read clearly from above. */}
      {Array.from({ length: 15 }, (_, i) => {
        const a = i * 2.399;
        const radius = 1.15 + (i % 4) * 0.72;
        const x = Math.cos(a) * radius;
        const z = -1.8 + Math.sin(a) * radius * 0.78;
        return <group key={i} position={[x, 0.22, z]} rotation-y={a}>
          <mesh rotation-x={-Math.PI / 2} scale={[1, 0.72, 1]}>
            <circleGeometry args={[0.48 + (i % 3) * 0.06, 24]} />
            <meshStandardMaterial color={i % 2 ? "#477b4b" : "#5c8a50"} roughness={0.96} side={THREE.DoubleSide} />
          </mesh>
          {i % 4 === 0 && <group position={[0, 0.16, 0]}>
            <mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.14, 14, 10]} /><meshStandardMaterial color="#e99caf" roughness={0.7} /></mesh>
            {Array.from({ length: 6 }, (_, petal) => <mesh key={petal} position={[Math.cos(petal * Math.PI / 3) * 0.16, 0.1, Math.sin(petal * Math.PI / 3) * 0.16]} scale={[0.8, 0.55, 1]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#f4c5d0" roughness={0.72} /></mesh>)}
          </group>}
        </group>;
      })}
      {/* Low moss stones define the water edge without blocking the walking ring. */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = i * Math.PI / 6;
        const radius = 5.65 + (i % 3) * 0.22;
        return <mesh key={i} position={[Math.cos(a) * radius, 0.34, -1.8 + Math.sin(a) * radius * 0.82]} scale={[0.75, 0.48, 0.62]} castShadow>
          <dodecahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color={i % 2 ? "#727c61" : "#898b73"} roughness={1} />
        </mesh>;
      })}
      {/* Bamboo and flowering shrubs stay on the outer rim; the central route remains open. */}
      {[-1, 1].map((side) => <group key={side} position={[side * 11.6, 0, -1]}>
        {[0, 1, 2, 3].map((n) => <group key={n} position={[side * (n % 2) * 0.55, 0, n * 2.2 - 3.3]}>
          <mesh position={[0, 2.1 + (n % 2) * 0.25, 0]} castShadow><cylinderGeometry args={[0.09, 0.13, 4.2 + (n % 2) * 0.5, 8]} /><meshStandardMaterial color="#66804b" roughness={0.88} /></mesh>
          {[1.2, 2.3, 3.4].map((y) => <mesh key={y} position={[side * 0.28, y, 0]} rotation-z={side * -0.55}><coneGeometry args={[0.12, 0.85, 5]} /><meshStandardMaterial color="#78945b" roughness={0.92} /></mesh>)}
        </group>)}
      </group>)}
      {[-1, 1].map((side) => <group key={side} position={[side * 8.2, 0, 10.2]}>
        <mesh position={[0, 0.62, 0]} castShadow><cylinderGeometry args={[0.22, 0.32, 1.24, 8]} /><meshStandardMaterial color="#898579" roughness={1} /></mesh>
        <mesh position={[0, 1.28, 0]}><boxGeometry args={[0.82, 0.14, 0.82]} /><meshStandardMaterial color="#77776d" roughness={1} /></mesh>
        <mesh position={[0, 1.58, 0]}><boxGeometry args={[0.5, 0.46, 0.5]} /><meshStandardMaterial color="#d9b779" emissive="#d39a4e" emissiveIntensity={0.25} /></mesh>
        <mesh position={[0, 1.86, 0]}><coneGeometry args={[0.56, 0.24, 4]} /><meshStandardMaterial color="#77776d" roughness={1} /></mesh>
      </group>)}
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.sin(i * 0.42) * 2.1, 0.2, 12 - i * 2.15]} rotation-y={i * 0.48} castShadow receiveShadow>
        <cylinderGeometry args={[0.72 + (i % 3) * 0.12, 0.82 + (i % 3) * 0.12, 0.28, 7]} /><meshStandardMaterial color={i % 2 ? "#aaa18f" : "#c2b9a6"} roughness={0.96} />
      </mesh>)}
      <group position={[0, 0, -10.5]}><mesh position={[0, 2.4, 0]} castShadow><cylinderGeometry args={[0.5, 0.8, 4.8, 12]} /><meshStandardMaterial color="#704a31" roughness={1} /></mesh><mesh position={[0, 5.1, 0]} scale={[2.8, 0.9, 2.4]} castShadow><sphereGeometry args={[1.7, 14, 10]} /><meshStandardMaterial color="#4f7e4c" roughness={1} /></mesh></group>
      <Inscription text="VƯỜN THIỀN" width={5} height={1} position={[0, 1.4, 14.1]} stone />
    </group>
  </group>;
}

export function OverviewCampus() {
  return <group name="Chùa Tâm An - mô hình tổng thể dựng lại">
    <AxialGardens />
    <MainHall />
    <Gate z={112} />
    {BUILDINGS.map((building) => <SideHall key={building.id} building={building} />)}
    <Tower position={[-55, 0, -112]} tiers={5} label="Bảo tháp" />
    <Pond position={[30, 0, 12]} w={22} d={24} />
    <LotusBridge />
    <Pavilion position={[45, 0, 12]} />
    {/* The main cascade sits behind the Buddha, leaving the ceremonial approach open. */}
    <Waterfall position={[0, 0, -181]} />
    <group position={[0, 0, -155]} name="Tượng Phật lớn và núi thiêng">
      <mesh position={[0, 0.25, 0]} receiveShadow><cylinderGeometry args={[14, 14, 0.5, 40]} /><meshStandardMaterial color="#cfc3ac" roughness={0.96} /></mesh>
      <Buddha position={[0, 0.5, 0]} scale={0.8} />
    </group>
  </group>;
}
