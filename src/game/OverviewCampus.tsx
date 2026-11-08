import { Buddha, Gate, MainHall, Pavilion, Pond, Roof, Tower, Waterfall } from "./Architecture";
import { Surface } from "./Materials";
import { Inscription } from "./TempleDetails";
import { SCENE_COLORS as C } from "./templeData";

function SideHall({ position, label, width = 25, depth = 17, height = 7 }: { position: [number, number, number]; label: string; width?: number; depth?: number; height?: number }) {
  return <group position={position} name={label}>
    <mesh position={[0, 0.18, 0]} receiveShadow><boxGeometry args={[width + 2.6, 0.36, depth + 2.6]} /><Surface kind="stone" repeat={3} /></mesh>
    <mesh position={[0, height / 2 + 0.36, 0]} castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#743c2b" roughness={0.9} /></mesh>
    <mesh position={[0, height / 2 + 0.38, depth / 2 + 0.08]} castShadow><boxGeometry args={[width * 0.74, height * 0.82, 0.22]} /><meshStandardMaterial color="#a95435" roughness={0.84} /></mesh>
    <Roof w={width + 3.2} d={depth + 3.2} h={3.9} y={height + 0.35} />
    <Roof w={width * 0.7} d={depth * 0.42} h={1.55} y={height + 2.25} />
    {[-1, 1].map((side) => <group key={side} position={[side * width * 0.25, 0, depth / 2 + 0.75]}>
      <mesh position={[0, height * 0.48, 0]} castShadow><cylinderGeometry args={[0.25, 0.32, height * 0.9, 10]} /><meshStandardMaterial color={C.woodDark} roughness={0.9} /></mesh>
      <mesh position={[0, height * 0.94, 0]}><boxGeometry args={[0.7, 0.18, 0.7]} /><meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.4} /></mesh>
    </group>)}
    {[0, 1, 2].map((step) => <mesh key={step} position={[0, 0.14 + step * 0.14, depth / 2 + 1.1 - step * 0.65]} receiveShadow>
      <boxGeometry args={[Math.min(width * 0.58, 13), 0.2 + step * 0.06, 0.9]} /><meshStandardMaterial color={step === 2 ? "#c8b99d" : "#938b7d"} roughness={0.95} />
    </mesh>)}
    <Inscription text={label} width={width * 0.5} height={1.05} position={[0, height - 0.45, depth / 2 + 0.22]} />
  </group>;
}

function MiniTree({ position, scale = 1, blossom = false }: { position: [number, number, number]; scale?: number; blossom?: boolean }) {
  return <group position={position} scale={scale} name="Cây cảnh khuôn viên">
    <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.28, 0.46, 2.5, 9]} /><meshStandardMaterial color="#68412d" roughness={1} /></mesh>
    <mesh position={[0, 2.95, 0]} scale={[1.22, 0.82, 1.08]} castShadow><sphereGeometry args={[1.55, 14, 10]} /><meshStandardMaterial color={blossom ? "#789b58" : "#3d7042"} roughness={0.96} /></mesh>
    {blossom && <mesh position={[0.58, 3.28, 0.44]} scale={0.34}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#e4a1a5" roughness={0.86} /></mesh>}
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
    <SideHall position={[-42, 0, -62]} label="NHÀ THỜ TỔ" />
    <SideHall position={[42, 0, -62]} label="NHÀ GIẢNG PHÁP" />
    <Tower position={[-55, 0, -112]} tiers={5} label="Bảo tháp" />
    <Pond position={[30, 0, 12]} w={22} d={24} />
    <Pavilion position={[45, 0, 12]} />
    <Waterfall position={[0, 0, -147]} />
    <group position={[0, 0, -155]} name="Tượng Phật lớn và núi thiêng">
      <mesh position={[0, 0.25, 0]} receiveShadow><cylinderGeometry args={[14, 14, 0.5, 40]} /><meshStandardMaterial color="#cfc3ac" roughness={0.96} /></mesh>
      <Buddha position={[0, 0.5, 0]} scale={0.8} />
    </group>
  </group>;
}
