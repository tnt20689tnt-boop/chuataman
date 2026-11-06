import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import { tileTexture, fallTexture, waterTexture } from "./textures";
import { Surface } from "./Materials";
import { CarvedPanel, Inscription } from "./TempleDetails";
import { SCENE_COLORS as C } from "./templeData";

const RED = C.lacquer;

let _tile: THREE.Texture | null = null;
const tile = () => (_tile ??= tileTexture());

/** Vietnamese-style hipped roof with upturned corner eaves. */
export function Roof({ w, d, h, y = 0 }: { w: number; d: number; h: number; y?: number }) {
  const geo = useMemo(() => {
    const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
    // Four curved roof slopes with lifted eaves, rather than a pyramidal cone.
    const ridge = w * 0.23;
    for (let face = 0; face < 4; face++) {
      const start = vertices.length / 3;
      for (let row = 0; row <= 16; row++) for (let col = 0; col <= 24; col++) {
        const t = row / 16, u = col / 24 * 2 - 1;
        const rise = h * (1 - t) ** 1.65 + h * 0.15 * t ** 8;
        const corner = h * 0.12 * Math.abs(u) ** 6 * t ** 5;
        if (face < 2) vertices.push(u * (ridge + (w * 0.57 - ridge) * t), rise + corner, (face === 0 ? 1 : -1) * d * 0.57 * t);
        else vertices.push((face === 2 ? 1 : -1) * (ridge + (w * 0.57 - ridge) * t), rise + corner, u * d * 0.57 * t);
        uvs.push(col / 24 * w / 5, t * d / 5);
      }
      for (let row = 0; row < 16; row++) for (let col = 0; col < 24; col++) {
        const a = start + row * 25 + col, b = a + 25;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }, [w, d, h]);
  const tex = tile();
  return <group position={[0, y, 0]}>
    <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial map={tex} color={C.roof} roughness={0.92} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, h + 0.08, 0]} castShadow><boxGeometry args={[w * 0.5, 0.25, 0.4]} /><meshStandardMaterial color={C.stone} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * w * 0.25, h + 0.15, 0]} rotation-z={side * -0.5} castShadow><torusGeometry args={[0.6, 0.12, 6, 16, Math.PI]} /><meshStandardMaterial color={C.stone} /></mesh>)}
    {[-1, 1].map(side => <mesh key={side} position={[0, -0.15, side * d * 0.48]} castShadow><boxGeometry args={[w, 0.35, 0.35]} /><Surface kind="wood" /></mesh>)}
  </group>;
}

function Columns({ w, d, h, n = 6 }: { w: number; d: number; h: number; n?: number }) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i / (n - 1)) * w;
    pts.push([x, d / 2], [x, -d / 2]);
  }
  return (
    <>
      {pts.map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, h, 10]} />
          <Surface kind="wood" />
        </mesh>
      ))}
    </>
  );
}

function IncenseSmoke() {
  const wisps = useRef<THREE.Mesh[]>([]);
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    wisps.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = (time * 0.22 + i / 6) % 1;
      mesh.position.set(Math.sin(time * 0.55 + i) * (0.12 + phase * 0.45), 2.25 + phase * 3.2, -2.4 + Math.cos(time * 0.4 + i) * 0.12);
      const s = 0.12 + phase * 0.42;
      mesh.scale.set(s * (1 + Math.sin(time + i) * 0.12), s * 1.35, s);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = (1 - phase) * 0.2;
    });
  });
  return <group>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} ref={el => { if (el) wisps.current[i] = el; }}>
      <sphereGeometry args={[1, 12, 10]} />
      <meshStandardMaterial color="#e8e5dc" transparent opacity={0.16} depthWrite={false} roughness={1} />
    </mesh>)}
  </group>;
}


function DonationBox() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const amounts = [5000, 10000, 20000, 50000, 100000, 200000];
  const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
  return <group>
    <group scale={2}>
    {/* Double-size lacquered merit box, mounted close to the left wall. */}
    <mesh position={[0, 0.72, 0]} castShadow receiveShadow
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v); setAmount(null); }}>
      <boxGeometry args={[1.45, 1.35, 1.05]} />
      <meshStandardMaterial color="#641f1b" roughness={0.48} metalness={0.12} />
    </mesh>
    <mesh position={[0, 1.42, 0]} castShadow
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v); setAmount(null); }}>
      <boxGeometry args={[1.58, 0.16, 1.16]} />
      <meshStandardMaterial color="#c49a52" metalness={0.78} roughness={0.28} />
    </mesh>
    <mesh position={[0, 1.515, 0]} rotation-x={-0.04}>
      <boxGeometry args={[0.34, 0.025, 0.12]} />
      <meshStandardMaterial color="#241812" roughness={0.9} />
    </mesh>
    {[-0.57, 0.57].map(x => <mesh key={x} position={[x, 0.72, 0.535]}>
      <boxGeometry args={[0.07, 1.08, 0.035]} />
      <meshStandardMaterial color="#d5ad62" metalness={0.72} roughness={0.3} />
    </mesh>)}
    <mesh position={[0, 0.76, 0.545]}
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v); setAmount(null); }}>
      <boxGeometry args={[0.92, 0.43, 0.045]} />
      <meshStandardMaterial color="#8b3023" metalness={0.18} roughness={0.42} />
    </mesh>
    <Inscription text="CÔNG ĐỨC" width={0.78} height={0.28} position={[0, 0.76, 0.575]} small />
    {[-0.48, 0.48].map(x => <mesh key={x} position={[x, 0.12, 0]} castShadow>
      <boxGeometry args={[0.16, 0.24, 0.16]} />
      <meshStandardMaterial color="#b78b4b" metalness={0.72} roughness={0.35} />
    </mesh>)}
    <mesh position={[0, 1.75, 0.62]} onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>
      <boxGeometry args={[1.9, 0.55, 0.12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    </group>
    {/* Separate large sign board suspended above the enlarged donation box. */}
    <Html position={[0, 3.45, 0.72]} center distanceFactor={7} transform={false} style={{ pointerEvents: "auto" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ width: 330, minHeight: 104, boxSizing: "border-box", border: "4px solid #d9b96f", borderRadius: 14, padding: "13px 16px", background: "linear-gradient(145deg,#7c241d,#3e1714)", color: "#fff2ce", fontWeight: 800, whiteSpace: "normal", cursor: "pointer", boxShadow: "0 5px 22px #0009, inset 0 0 0 2px #f0d99b", textAlign: "center" }}>
        <div style={{ fontSize: 25, letterSpacing: 1.5, lineHeight: 1.2 }}>HÒM CÔNG ĐỨC</div>
        <div style={{ fontSize: 15, marginTop: 8, color: "#ffe3a1" }}>{open ? "CHẠM ĐỂ ĐÓNG BẢNG" : "🙏 CHẠM VÀO ĐÂY ĐỂ PHÁT TÂM"}</div>
      </button>
    </Html>
    {open && <Html position={[0, 4.15, 0.78]} center distanceFactor={8} transform={false} zIndexRange={[100, 0]} style={{ pointerEvents: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 290, boxSizing: "border-box", padding: 16, borderRadius: 16, background: "rgba(255,249,232,.98)", color: "#493024", border: "2px solid #b89555", boxShadow: "0 8px 28px #0007", fontFamily: "Arial,sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#743b27" }}>CÔNG ĐỨC CHÙA TÂM AN</div>
        <div style={{ fontSize: 12, margin: "6px 0 12px", color: "#76624d" }}>Tùy tâm gieo duyên lành – xin tùy hỷ công đức</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {amounts.map(value => <button key={value} onClick={() => setAmount(value)} style={{ border: amount === value ? "2px solid #8d4a2e" : "1px solid #c9b58e", borderRadius: 9, padding: "10px 4px", background: amount === value ? "#ead5ad" : "#fffdf7", color: "#563524", fontWeight: 700, cursor: "pointer" }}>{money(value)}</button>)}
        </div>
        <div style={{ minHeight: 35, marginTop: 11, fontSize: 12, lineHeight: 1.45 }}>
          {amount ? <>Bạn đã chọn mức công đức <b>{money(amount)}</b>.</> : "Vui lòng chọn mức công đức tùy tâm."}
        </div>
        {amount !== null && <div style={{ margin: "10px auto 4px", padding: 10, border: "1px solid #d8c49d", borderRadius: 12, background: "#fff" }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 7, color: "#63351f" }}>QUÉT MÃ ĐỂ CÔNG ĐỨC</div>
          <img
            src={`https://img.vietqr.io/image/VCB-9988514001-compact2.png?amount=${amount}&addInfo=${encodeURIComponent("Cong duc Chua Tam An")}&accountName=${encodeURIComponent("TRAN NGOC TOAN")}`}
            alt="Mã QR Vietcombank công đức Chùa Tâm An"
            style={{ display: "block", width: 220, height: "auto", maxWidth: "100%", margin: "0 auto" }}
          />
          <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 6, color: "#594331" }}>
            <b>Vietcombank</b><br/>STK: <b>9988514001</b><br/>Chủ TK: <b>TRAN NGOC TOAN</b><br/>Số tiền: <b>{money(amount)}</b><br/>Nội dung: Cong duc Chua Tam An
          </div>
          <div style={{ fontSize: 11, color: "#806b54", marginTop: 7 }}>Vui lòng kiểm tra đúng tên người nhận và số tiền trong ứng dụng ngân hàng trước khi xác nhận.</div>
        </div>}
        <button onClick={() => { setOpen(false); setAmount(null); }} style={{ marginTop: 7, border: 0, borderRadius: 9, padding: "9px 18px", background: "#75412d", color: "#fff7e8", fontWeight: 700, cursor: "pointer" }}>Đóng</button>
      </div>
    </Html>}
  </group>;
}

function PrayerAudio() {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (!("speechSynthesis" in window)) { setPlaying(false); return; }
    const speak = () => {
      window.speechSynthesis.cancel();
      const line = new SpeechSynthesisUtterance("Nam mô A Di Đà Phật");
      line.lang = "vi-VN"; line.rate = 0.72; line.pitch = 0.86; line.volume = 0.28;
      const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("vi"));
      if (voice) line.voice = voice;
      window.speechSynthesis.speak(line);
    };
    speak();
    const timer = window.setInterval(speak, 12000);
    return () => { window.clearInterval(timer); window.speechSynthesis.cancel(); };
  }, [playing]);
  return <Html position={[0, 2.1, 10.5]} center transform={false} distanceFactor={10}>
    <button onClick={() => setPlaying(v => !v)} style={{ border: "1px solid #c7b98f", borderRadius: 24, padding: "9px 14px", background: "rgba(250,245,225,.94)", color: "#294332", fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 3px 12px #0003" }}>
      {playing ? "🔇 Tắt niệm Phật" : "🔊 Nghe A Di Đà Phật"}
    </button>
  </Html>;
}

export function MainHall() {
  return (
    <group position={[0, 0, -62]}>
      {/* platform & steps */}
      <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
        <boxGeometry args={[46, 1.2, 30]} />
        <Surface kind="stone" repeat={4} />
      </mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[0, (i + 1) * 0.2, 17.5 - i]} receiveShadow castShadow><boxGeometry args={[14, (i + 1) * 0.4, 1]} /><Surface kind="stone" /></mesh>)}
      <group position={[0, 1.2, 0]}>
        {/* back & side walls (front open so the Buddha is visible) */}
        <mesh position={[0, 5, -12]} castShadow receiveShadow>
          <boxGeometry args={[40, 10, 0.8]} />
          <Surface kind="wood" repeat={3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 20, 5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 10, 24]} />
            <Surface kind="wood" repeat={3} />
          </mesh>
        ))}
        <Columns w={38} d={24} h={10} n={8} />
        {/* lower roof */}
        <Roof w={44} d={28} h={7} y={9.5} />
        {/* upper tier */}
        <mesh position={[0, 15, 0]} castShadow>
          <boxGeometry args={[24, 4, 14]} />
          <Surface kind="wood" repeat={3} />
        </mesh>
        <Roof w={28} d={17} h={6} y={16.5} />
        <Inscription text="CHÍNH ĐIỆN" width={10} height={1.6} position={[0, 8.6, 12.6]} />
        {[-15, -10, 10, 15].map(x => <CarvedPanel key={x} position={[x, 4.5, -11.5]} w={3.8} h={6} />)}
        {[-1, 1].map(side => <Inscription key={side} text="TÂM AN" width={1} height={3} position={[side * 7.8, 5, 12.4]} small />)}
        {/* altar */}
        <mesh position={[0, 0.8, -4]} castShadow>
          <boxGeometry args={[10, 1.6, 4]} />
          <meshStandardMaterial color={RED} />
        </mesh>
        <Buddha position={[0, 1.6, -6.5]} scale={1.6} />

        {/* Two smaller attendant Bodhisattva statues, symmetrically flanking the main Buddha. */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 7.2, 0, -6.1]}>
            <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
              <boxGeometry args={[4.2, 1.05, 3.2]} />
              <meshStandardMaterial color="#6f352c" roughness={0.72} />
            </mesh>
            <mesh position={[0, 1.62, 0]} castShadow>
              <boxGeometry args={[4.35, 0.12, 3.35]} />
              <meshStandardMaterial color="#c49a52" metalness={0.42} roughness={0.48} />
            </mesh>
            <Buddha position={[0, 1.7, 0]} scale={0.62} />
            <pointLight position={[0, 4.1, 1.2]} intensity={5} distance={8} color="#ffd99b" />
          </group>
        ))}
        {/* incense bowl + smoke */}
        <mesh position={[0, 2.0, -2.4]}>
          <cylinderGeometry args={[0.6, 0.45, 0.6, 16]} />
          <meshStandardMaterial color="#8a6a2a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Three clearly visible incense sticks standing upright in the bowl. */}
        {[-0.18, 0, 0.18].map((x, i) => (
          <group key={i} position={[x, 2.28, -2.4 + (i - 1) * 0.045]} rotation-z={(i - 1) * 0.045}>
            <mesh castShadow>
              <cylinderGeometry args={[0.025, 0.032, 0.92, 8]} />
              <meshStandardMaterial color="#8b3525" roughness={0.82} />
            </mesh>
            <mesh position={[0, 0.47, 0]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#ff6a24" emissive="#ff3b0a" emissiveIntensity={1.8} />
            </mesh>
          </group>
        ))}
        <IncenseSmoke />
        <Sparkles position={[0, 2.7, -2.4]} count={12} scale={[0.5, 0.7, 0.5]} size={2} speed={0.15} color="#f5dfaa" opacity={0.35} />
        {/* Cushioned meditation mats facing the Buddha, arranged in calm rows. */}
        {[-12, -6, 0, 6, 12].flatMap((x) => [2.5, 7].map((z, row) => (
          <group key={`mat-${x}-${row}`} position={[x, 0.18, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[2.35, 0.22, 1.75]} />
              <meshStandardMaterial color={row === 0 ? "#8d4939" : "#a65e48"} roughness={0.96} />
            </mesh>
            <mesh position={[0, 0.13, 0]}>
              <boxGeometry args={[2.12, 0.08, 1.52]} />
              <meshStandardMaterial color="#c18a62" roughness={1} />
            </mesh>
            <mesh position={[0, 0.2, -0.48]} scale={[0.48, 0.12, 0.28]}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial color="#6f392f" roughness={1} />
            </mesh>
          </group>
        )))}
        <PrayerAudio />
        {/* Enlarged merit box mounted against the left inner wall; its sign hangs separately above it. */}
        <group position={[-18.4, 0, 0]} rotation-y={Math.PI / 2}>
          <DonationBox />
        </group>
        {/* lanterns */}
        {[-8, -3, 3, 8].map((x) => (
          <group key={x} position={[x, 8, 11]}>
            <mesh>
              <sphereGeometry args={[0.6, 12, 12]} />
              <meshStandardMaterial color="#e2512e" emissive="#ff6a2a" emissiveIntensity={0.9} />
            </mesh>
          </group>
        ))}
        <pointLight position={[0, 6, -2]} intensity={60} distance={30} color="#ffcf8a" />
      </group>
    </group>
  );
}

export function Buddha(props: { position: [number, number, number]; scale?: number }) {
  const gold = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#c49a52", metalness: 0.48, roughness: 0.42,
  }), []);
  const robe = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#b87932", metalness: 0.34, roughness: 0.5,
  }), []);
  const skin = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#d8b879", metalness: 0.22, roughness: 0.58,
  }), []);
  const shadowGold = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#785326", metalness: 0.38, roughness: 0.58,
  }), []);
  const folds = useMemo(() => {
    const paths: THREE.Vector3[][] = [];
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.22;
      paths.push([
        new THREE.Vector3(x * 0.55, 3.9, 0.66),
        new THREE.Vector3(x * 0.78, 3.25, 0.83),
        new THREE.Vector3(x * 1.35, 2.5, 1.0),
        new THREE.Vector3(x * 2.1, 1.65, 1.13),
      ]);
    }
    return paths.map(points => new THREE.CatmullRomCurve3(points));
  }, []);
  const curls = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let row = 0; row < 7; row++) {
      const y = 5.48 + row * 0.105;
      const radius = Math.sqrt(Math.max(0.05, 1 - ((y - 5.82) / 0.48) ** 2));
      const count = Math.max(8, Math.round(30 * radius));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + row * 0.16;
        pts.push([Math.cos(a) * 0.57 * radius, y, Math.sin(a) * 0.49 * radius]);
      }
    }
    return pts;
  }, []);
  return (
    <group position={props.position} scale={props.scale ?? 1} name="Tượng Phật Thích Ca trang nghiêm">
      {/* Wide, finely layered lotus throne */}
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.35, 2.55, 0.52, 64]} /><primitive object={shadowGold} attach="material" />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.36, 0.22, 64]} /><primitive object={gold} attach="material" />
      </mesh>
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return <group key={i} position={[Math.cos(a) * 2.02, 0.82, Math.sin(a) * 2.02]} rotation-y={-a}>
          <mesh rotation-x={-0.28} rotation-z={0.12} scale={[0.48, 0.72, 0.22]} castShadow>
            <sphereGeometry args={[1, 24, 18]} /><primitive object={gold} attach="material" />
          </mesh>
          <mesh position={[0, -0.18, 0.04]} scale={[0.25, 0.34, 0.16]}>
            <sphereGeometry args={[1, 18, 12]} /><primitive object={shadowGold} attach="material" />
          </mesh>
        </group>;
      })}
      <mesh position={[0, 1.02, 0]}><cylinderGeometry args={[1.82, 2.12, 0.3, 64]} /><primitive object={gold} attach="material" /></mesh>
      {/* Cross-legged meditative posture, sculpted robe and natural shoulder line */}
      <mesh position={[0, 1.48, 0.12]} scale={[1.9, 0.62, 1.25]} castShadow>
        <sphereGeometry args={[1, 48, 32]} /><primitive object={robe} attach="material" />
      </mesh>
      <mesh position={[0, 1.88, 0.03]} scale={[1.25, 0.45, 0.92]} castShadow>
        <sphereGeometry args={[1, 40, 28]} /><primitive object={gold} attach="material" />
      </mesh>
      <mesh position={[0, 3.05, -0.02]} scale={[0.91, 1.38, 0.72]} castShadow>
        <sphereGeometry args={[1, 48, 36]} /><primitive object={robe} attach="material" />
      </mesh>
      <mesh position={[0, 3.56, 0.02]} rotation-z={-0.08} scale={[1.02, 0.72, 0.76]} castShadow>
        <sphereGeometry args={[1, 40, 28]} /><primitive object={robe} attach="material" />
      </mesh>
      {/* Draped robe over the left shoulder and across the chest */}
      <mesh position={[-0.48, 3.35, 0.55]} rotation-z={0.22} rotation-x={-0.16} scale={[0.48, 1.12, 0.22]} castShadow>
        <sphereGeometry args={[1, 32, 24]} /><primitive object={gold} attach="material" />
      </mesh>
      {folds.map((curve, i) => <mesh key={i} geometry={new THREE.TubeGeometry(curve, 24, 0.018, 7, false)}>
        <primitive object={shadowGold} attach="material" />
      </mesh>)}
      {/* Hands rest gently in dhyana mudra */}
      <mesh position={[-0.78, 2.05, 0.86]} rotation-z={-0.35} scale={[0.28, 0.55, 0.28]} castShadow>
        <capsuleGeometry args={[0.5, 1, 8, 16]} /><primitive object={skin} attach="material" />
      </mesh>
      <mesh position={[0.72, 2.05, 0.86]} rotation-z={0.35} scale={[0.28, 0.55, 0.28]} castShadow>
        <capsuleGeometry args={[0.5, 1, 8, 16]} /><primitive object={skin} attach="material" />
      </mesh>
      <mesh position={[0, 2.2, 1.02]} scale={[0.64, 0.16, 0.23]} castShadow>
        <sphereGeometry args={[1, 32, 20]} /><primitive object={skin} attach="material" />
      </mesh>
      {/* Calm oval face, softly rounded cheeks, long ears and serene closed eyes */}
      <mesh position={[0, 4.86, 0.08]} scale={[0.59, 0.76, 0.52]} castShadow>
        <sphereGeometry args={[1, 56, 40]} /><primitive object={skin} attach="material" />
      </mesh>
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[s * 0.57, 4.86, 0.02]} scale={[0.14, 0.34, 0.16]}>
          <sphereGeometry args={[1, 24, 18]} /><primitive object={skin} attach="material" />
        </mesh>
        <mesh position={[s * 0.22, 4.91, 0.548]} rotation-z={s * -0.08} scale={[0.145, 0.022, 0.025]}>
          <sphereGeometry args={[1, 28, 16]} /><primitive object={shadowGold} attach="material" />
        </mesh>
        <mesh position={[s * 0.22, 5.02, 0.53]} rotation-z={s * -0.16} scale={[0.17, 0.035, 0.035]}>
          <sphereGeometry args={[1, 24, 16]} /><primitive object={skin} attach="material" />
        </mesh>
        <mesh position={[s * 0.66, 4.8, -0.01]} scale={[0.12, 0.43, 0.16]} castShadow>
          <capsuleGeometry args={[0.5, 1, 8, 12]} /><primitive object={skin} attach="material" />
        </mesh>
      </group>)}
      <mesh position={[0, 4.83, 0.59]} rotation-x={-0.12} scale={[0.09, 0.25, 0.12]}>
        <capsuleGeometry args={[0.5, 1, 8, 12]} /><primitive object={skin} attach="material" />
      </mesh>
      <mesh position={[0, 4.59, 0.57]} scale={[0.15, 0.035, 0.025]}>
        <sphereGeometry args={[1, 24, 14]} /><primitive object={shadowGold} attach="material" />
      </mesh>
      <mesh position={[0, 4.62, 0.585]} scale={[0.1, 0.018, 0.02]}>
        <sphereGeometry args={[1, 20, 12]} /><primitive object={skin} attach="material" />
      </mesh>
      {/* Sculpted facial planes: gentle brows, eyelid curves, nostrils and defined lips */}
      {[-1, 1].map(s => {
        const brow = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.08, 5.13, 0.535),
          new THREE.Vector3(s * 0.2, 5.18, 0.54),
          new THREE.Vector3(s * 0.34, 5.14, 0.51),
        ]);
        const lid = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.08, 4.91, 0.555),
          new THREE.Vector3(s * 0.2, 4.88, 0.57),
          new THREE.Vector3(s * 0.34, 4.91, 0.54),
        ]);
        return <group key={s}>
          <mesh geometry={new THREE.TubeGeometry(brow, 16, 0.026, 8, false)}>
            <primitive object={skin} attach="material" />
          </mesh>
          <mesh geometry={new THREE.TubeGeometry(lid, 16, 0.018, 8, false)}>
            <primitive object={shadowGold} attach="material" />
          </mesh>
        </group>;
      })}
      <mesh position={[-0.075, 4.56, 0.585]} rotation-z={-0.08} scale={[0.075, 0.026, 0.025]}>
        <sphereGeometry args={[1, 20, 12]} /><primitive object={skin} attach="material" />
      </mesh>
      <mesh position={[0.075, 4.56, 0.585]} rotation-z={0.08} scale={[0.075, 0.026, 0.025]}>
        <sphereGeometry args={[1, 20, 12]} /><primitive object={skin} attach="material" />
      </mesh>
      <mesh position={[0, 4.43, 0.535]} scale={[0.2, 0.12, 0.075]}>
        <sphereGeometry args={[1, 28, 18]} /><primitive object={skin} attach="material" />
      </mesh>
      {/* Fine robe edging and shoulder drape */}
      <mesh position={[0.02, 3.88, 0.62]} rotation-z={-0.12} scale={[0.66, 0.035, 0.035]}>
        <sphereGeometry args={[1, 32, 16]} /><primitive object={gold} attach="material" />
      </mesh>
      <mesh position={[-0.68, 3.25, 0.61]} rotation-z={0.34} scale={[0.055, 0.92, 0.045]}>
        <sphereGeometry args={[1, 24, 16]} /><primitive object={gold} attach="material" />
      </mesh>
      {curls.map(([x, y, z], i) => <mesh key={i} position={[x, y, z]} scale={0.068}>
        <sphereGeometry args={[1, 12, 10]} /><primitive object={shadowGold} attach="material" />
      </mesh>)}
      <mesh position={[0, 5.78, 0.02]} scale={[0.23, 0.32, 0.23]}>
        <sphereGeometry args={[1, 28, 20]} /><primitive object={gold} attach="material" />
      </mesh>
      <mesh position={[0, 5.08, 0.57]} scale={[0.045, 0.045, 0.025]}>
        <sphereGeometry args={[1, 16, 12]} /><primitive object={gold} attach="material" />
      </mesh>
      {/* Double ornamental halo behind the head */}
      <mesh position={[0, 4.92, -0.68]}><torusGeometry args={[1.13, 0.055, 12, 80]} /><primitive object={gold} attach="material" /></mesh>
      <mesh position={[0, 4.92, -0.72]}><torusGeometry args={[1.29, 0.018, 8, 80]} /><primitive object={shadowGold} attach="material" /></mesh>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = i / 24 * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 1.28, 4.92 + Math.sin(a) * 1.28, -0.7]} scale={0.055}>
          <sphereGeometry args={[1, 12, 10]} /><primitive object={gold} attach="material" />
        </mesh>;
      })}
    </group>
  );
}

export function Tower({ position, tiers = 3, label }: { position: [number, number, number]; tiers?: number; label?: string }) {
  return (
    <group position={position} name={label ?? ""}>
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[10, 1, 10]} />
        <meshStandardMaterial color="#a89c88" />
      </mesh>
      {Array.from({ length: tiers }).map((_, i) => {
        const s = 1 - i * 0.18;
        const y = 1 + i * 5.5;
        return (
          <group key={i} position={[0, y, 0]} scale={[s, 1, s]}>
            <mesh position={[0, 2.2, 0]} castShadow>
              <boxGeometry args={[6, 4.4, 6]} />
              <Surface kind="wood" repeat={3} />
            </mesh>
            <Columns w={6} d={6} h={4.4} n={3} />
            <Roof w={8} d={8} h={2.2} y={4.2} />
          </group>
        );
      })}
    </group>
  );
}

export function BellTower({ position }: { position: [number, number, number] }) {
  const bell = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bell.current) bell.current.rotation.z = Math.sin(clock.elapsedTime * 1.2) * 0.04;
  });
  return (
    <group position={position}>
      <Tower position={[0, 0, 0]} tiers={2} />
      <group ref={bell} position={[0, 4.5, 0]}>
        <mesh position={[0, -1.2, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1.2, 2.4, 20]} />
          <meshStandardMaterial color="#6d5a2c" metalness={0.9} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

export function Gate({ z }: { z: number }) {
  return <group position={[0, 0, z]} name="Cổng tam quan Chùa Tâm An">
    {[-8, -3.6, 3.6, 8].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow><boxGeometry args={[1.1, 9, 1.5]} /><Surface kind="stone" repeat={2} /></mesh>
      <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.5, 0.8, 1.9]} /><Surface kind="stone" /></mesh>
      <Inscription text="TỪ BI" width={0.65} height={3} position={[0, 4, 0.78]} small />
      {Math.abs(x) === 8 && <>
        <Inscription text="TÂM AN" width={2.15} height={0.78} position={[0, 6.65, 0.86]} small />
        <mesh position={[0, 7.12, 0.82]} castShadow><boxGeometry args={[2.35, 0.09, 0.34]} /><meshStandardMaterial color={C.gold} metalness={0.55} roughness={0.42} /></mesh>
      </>}
    </group>)}
    {/* Main timber lintel visually supports the temple name plaque. */}
    <mesh position={[0, 7.65, 0]} castShadow receiveShadow>
      <boxGeometry args={[8.4, 0.42, 1.9]} />
      <Surface kind="wood" color={C.woodDark} />
    </mesh>
    <mesh position={[0, 7.9, 0]} castShadow>
      <boxGeometry args={[8.05, 0.12, 1.72]} />
      <meshStandardMaterial color={C.gold} metalness={0.58} roughness={0.38} />
    </mesh>
    <Roof w={9} d={4.5} h={2.5} y={9} />
    {[-5.8, 5.8].map(x => <group key={x} position={[x, 0, 0]}><Roof w={4.5} d={3.5} h={1.8} y={7} /></group>)}
    {/* Large, readable name board on both approaches to the gate. */}
    <Inscription text="CHÙA TÂM AN" width={7.55} height={1.55} position={[0, 8.42, 1.22]} />
    <group rotation-y={Math.PI}><Inscription text="CHÙA TÂM AN" width={7.55} height={1.55} position={[0, 8.42, 1.22]} /></group>
    {/* Gold lotus-like medallions frame the main sign without obscuring its lettering. */}
    {[-4.05, 4.05].map(x => <group key={x} position={[x, 8.42, 1.39]}>
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.22, 0.045, 8, 24]} /><meshStandardMaterial color={C.gold} metalness={0.72} roughness={0.28} /></mesh>
      <mesh><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color={C.gold} metalness={0.72} roughness={0.28} /></mesh>
    </group>)}
  </group>;
}

export function Pond({ position, w, d }: { position: [number, number, number]; w: number; d: number }) {
  const tex = useMemo(() => waterTexture(), []);
  const lotus = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 160; i++) arr.push([(Math.random() - 0.5) * (w - 2), (Math.random() - 0.5) * (d - 2), Math.random()]);
    return arr;
  }, [w, d]);
  const padRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    (() => {
      const m = new THREE.Object3D();
      lotus.forEach(([x, z, r], i) => {
        m.position.set(x, 0.05, z);
        m.rotation.set(0, r * 6, 0);
        m.scale.setScalar(0.7 + r * 0.6);
        m.updateMatrix();
        padRef.current?.setMatrixAt(i, m.matrix);
        m.position.y = 0.25;
        m.scale.setScalar(r > 0.5 ? 0.5 : 0);
        m.updateMatrix();
        flowerRef.current?.setMatrixAt(i, m.matrix);
      });
      if (padRef.current) padRef.current.instanceMatrix.needsUpdate = true;
      if (flowerRef.current) flowerRef.current.instanceMatrix.needsUpdate = true;
    })();
  }, [lotus]);
  useFrame((_, dt) => {
    tex.offset.x += dt * 0.01;
  });
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={tex} roughness={0.08} metalness={0.4} color="#bfe3e3" />
      </mesh>
      {/* stone rim */}
      {([
        [0, d / 2, w + 1.4, 1],
        [0, -d / 2, w + 1.4, 1],
      ] as [number, number, number, number][]).map(([x, z, l], i) => (
        <mesh key={i} position={[x, 0.4, z]} castShadow receiveShadow>
          <boxGeometry args={[l, 0.8, 0.7]} />
          <meshStandardMaterial color="#56605a" />
        </mesh>
      ))}
      {[w / 2, -w / 2].map((x, i) => (
        <mesh key={i} position={[x, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.8, d]} />
          <meshStandardMaterial color="#56605a" />
        </mesh>
      ))}
      <instancedMesh ref={padRef} args={[undefined, undefined, lotus.length]}>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 12]} />
        <meshStandardMaterial color="#3f7a35" />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[undefined, undefined, lotus.length]}>
        <coneGeometry args={[0.45, 0.6, 7, 1, true]} />
        <meshStandardMaterial color="#f2a6c0" emissive="#f07aa0" emissiveIntensity={0.15} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

export function Waterfall({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => {
    const t = fallTexture();
    t.repeat.set(2, 1);
    return t;
  }, []);
  useFrame((_, dt) => {
    tex.offset.y += dt * 0.9;
  });
  return (
    <group position={position}>
      {([
        [-5, 5, 0, 6],
        [5, 6, 0, 7],
        [0, 9, -3, 7],
        [-3, 3, 2, 4],
        [4, 3, 2, 4],
      ] as [number, number, number, number][]).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color="#6b6a63" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 6, 3.3]} rotation-x={-0.12}>
        <planeGeometry args={[3.2, 12]} />
        <meshStandardMaterial map={tex} transparent opacity={0.85} emissive="#cfeff5" emissiveIntensity={0.3} />
      </mesh>
      <Sparkles position={[0, 0.8, 4.5]} count={50} scale={[5, 1.5, 3]} size={5} speed={0.8} color="#ffffff" />
    </group>
  );
}

/** Instanced trees (trunk + two canopy blobs). */
export function Forest({ points }: { points: [number, number, number][] }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const crown = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    (() => {
      const m = new THREE.Object3D();
      const col = new THREE.Color();
      points.forEach(([x, z, s], i) => {
        m.position.set(x, 2 * s, z);
        m.rotation.set(0, s * 10, 0);
        m.scale.set(s, s, s);
        m.updateMatrix();
        trunk.current?.setMatrixAt(i, m.matrix);
        m.position.set(x, 5.5 * s, z);
        m.scale.set(s * 3, s * 2.6, s * 3);
        m.updateMatrix();
        crown.current?.setMatrixAt(i, m.matrix);
        col.setHSL(0.24 + (s % 0.1), 0.45, 0.28 + (s % 0.12));
        crown.current?.setColorAt(i, col);
      });
      if (trunk.current) trunk.current.instanceMatrix.needsUpdate = true;
      if (crown.current) {
        crown.current.instanceMatrix.needsUpdate = true;
        if (crown.current.instanceColor) crown.current.instanceColor.needsUpdate = true;
      }
    })();
  }, [points]);
  return (
    <>
      <instancedMesh ref={trunk} args={[undefined, undefined, points.length]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 4, 6]} />
        <meshStandardMaterial color="#4a3426" />
      </instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, points.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
      </instancedMesh>
    </>
  );
}

/** Symbolic release area: glowing lotus lanterns drifting on water. */
export function ReleaseLanterns({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((c, i) => {
      c.position.y = 0.3 + Math.sin(clock.elapsedTime + i) * 0.08;
      c.position.x = ((i * 3.1 + clock.elapsedTime * 0.3) % 16) - 8;
    });
  });
  return (
    <group position={position}>
      <Pond position={[0, 0, 0]} w={18} d={14} />
      <group ref={g}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} position={[0, 0.3, ((i * 2.7) % 11) - 5.5]}>
            <octahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffb04a" emissiveIntensity={1.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Pavilion({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) {
  return (
    <group position={position} rotation-y={rot}>
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[16, 0.6, 12]} />
        <meshStandardMaterial color="#b3a68f" />
      </mesh>
      <Columns w={14} d={10} h={5} n={4} />
      <group position={[0, 0.3, 0]}>
        <Roof w={16} d={12} h={3.5} y={5} />
      </group>
    </group>
  );
}

export function StoneLanterns({ points }: { points: [number, number][] }) {
  return (
    <>
      {points.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[0.4, 1.6, 0.4]} />
            <meshStandardMaterial color="#8a8a80" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[0.7, 0.5, 0.7]} />
            <meshStandardMaterial color="#fff1c8" emissive="#ffc46a" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <coneGeometry args={[0.65, 0.4, 4]} />
            <meshStandardMaterial color="#77776e" />
          </mesh>
        </group>
      ))}
    </>
  );
}
