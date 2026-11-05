import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky, Cloud, Clouds } from "@react-three/drei";
import { grassTexture, stoneTexture } from "./textures";
import {
  BellTower,
  Forest,
  Gate,
  MainHall,
  Pavilion,
  Pond,
  ReleaseLanterns,
  StoneLanterns,
  Tower,
  Waterfall,
  Buddha,
} from "./Architecture";
import { Crowd, PlayerAvatar } from "./Characters";
import { RemotePlayers } from "./RemotePlayers";
import { ZONES, clamp, rng, stepPlayer } from "./sim";
import { cam, getUI, input, player, setUI } from "./store";

function Ground() {
  const grass = useMemo(() => grassTexture(), []);
  const stone = useMemo(() => stoneTexture(), []);
  const path = useMemo(() => {
    const t = stoneTexture();
    t.repeat.set(2, 22);
    return t;
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -14]} receiveShadow>
        <planeGeometry args={[84, 82]} />
        <meshStandardMaterial map={stone} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 70]} receiveShadow>
        <planeGeometry args={[8, 96]} />
        <meshStandardMaterial map={path} roughness={0.9} />
      </mesh>
      {/* side paths */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 30]} receiveShadow>
        <planeGeometry args={[170, 5]} />
        <meshStandardMaterial map={path} roughness={0.9} />
      </mesh>
    </>
  );
}

function Mountains() {
  const peaks = useMemo(() => {
    const r = rng(3);
    return Array.from({ length: 22 }).map((_, i) => {
      const a = (i / 22) * Math.PI * 2;
      const d = 190 + r() * 30;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, h: 40 + r() * 50, w: 40 + r() * 30 };
    });
  }, []);
  return (
    <>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2 - 2, p.z]}>
          <coneGeometry args={[p.w, p.h, 7]} />
          <meshStandardMaterial color="#6f8a6a" roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
}

function treePoints(): [number, number, number][] {
  const r = rng(11);
  const pts: [number, number, number][] = [];
  for (let z = 26; z < 116; z += 7) {
    pts.push([-8, z, 0.9 + r() * 0.3], [8, z, 0.9 + r() * 0.3]);
  }
  let tries = 0;
  while (pts.length < 260 && tries++ < 4000) {
    const x = (r() - 0.5) * 300;
    const z = (r() - 0.5) * 300;
    const inCourt = Math.abs(x) < 50 && z > -85 && z < 28;
    const onPath = Math.abs(x) < 12 && z > 20;
    const nearZone = ZONES.some((zn) => (zn.x - x) ** 2 + (zn.z - z) ** 2 < 220);
    const sidePath = Math.abs(z - 30) < 5;
    const pond = x > 50 && x < 102 && z > -36 && z < 8;
    if (inCourt || onPath || nearZone || sidePath || pond) continue;
    pts.push([x, z, 0.8 + r() * 0.8]);
  }
  return pts;
}

function Controller() {
  const { camera, gl } = useThree();
  const last = useRef(0);
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const el = gl.domElement;
    let drag: { id: number; x: number; y: number } | null = null;
    const pd = (e: PointerEvent) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const pm = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      cam.yaw -= (e.clientX - drag.x) * 0.006;
      cam.pitch = clamp(cam.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.3);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const pu = () => (drag = null);
    const wheel = (e: WheelEvent) => {
      cam.dist = clamp(cam.dist + e.deltaY * 0.01, 4, 40);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu);
    el.addEventListener("pointercancel", pu);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu);
      el.removeEventListener("pointercancel", pu);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    input.fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) + input.joyF;
    input.right = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + input.joyR;
    input.run = k.has("ShiftLeft") || k.has("ShiftRight");
    const moved = stepPlayer(player, input, cam.yaw, dt);
    const ui = getUI();
    if (moved && ui.pose !== "walk") setUI({ pose: "walk", action: "none" });
    if (!moved && ui.pose === "walk") setUI({ pose: "stand" });

    target.set(player.x, 1.6, player.z);
    const cp = Math.cos(cam.pitch);
    camera.position.lerp(
      new THREE.Vector3(
        player.x + Math.sin(cam.yaw) * cam.dist * cp,
        1.6 + Math.sin(cam.pitch) * cam.dist,
        player.z + Math.cos(cam.yaw) * cam.dist * cp,
      ),
      1 - Math.exp(-8 * dt),
    );
    camera.lookAt(target);

    const t = state.clock.elapsedTime;
    if (t - last.current > 0.5) {
      last.current = t;
      let best = "Thế giới Tâm An";
      let bd = 900;
      for (const z of ZONES) {
        const d = (z.x - player.x) ** 2 + (z.z - player.z) ** 2;
        if (d < bd) {
          bd = d;
          best = z.name;
        }
      }
      if (best !== ui.zoneLabel) setUI({ zoneLabel: best });
      if (!ui.sceneReady) setUI({ sceneReady: true });
    }
  });
  return null;
}

export default function World() {
  const trees = useMemo(() => treePoints(), []);
  const lanterns = useMemo(() => {
    const p: [number, number][] = [];
    for (let z = 30; z < 110; z += 10) p.push([-5, z], [5, z]);
    for (let x = -36; x <= 36; x += 12) p.push([x, 24]);
    return p;
  }, []);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 55, near: 0.3, far: 600, position: [0, 8, 50] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#f2d8b8"]} />
      <fog attach="fog" args={["#f0d6b8", 70, 330]} />
      <Sky sunPosition={[120, 22, -200]} turbidity={6} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <hemisphereLight args={["#ffe9cc", "#4d6a3a", 0.75]} />
      <directionalLight
        position={[60, 45, -40]}
        intensity={2.6}
        color="#ffcf9a"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-far={250}
        shadow-bias={-0.0005}
      />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} color="#ffe2bd" />
        <Lightformer intensity={1} color="#bcd6e0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <Clouds limit={60}>
        <Cloud position={[-60, 55, -150]} seed={2} segments={20} bounds={[40, 6, 10]} volume={12} color="#fff2e2" opacity={0.7} />
        <Cloud position={[80, 60, -120]} seed={5} segments={20} bounds={[40, 6, 10]} volume={12} color="#ffe8d0" opacity={0.7} />
      </Clouds>

      <Ground />
      <Mountains />
      <Forest points={trees} />
      <MainHall />
      <Gate z={112} />
      <Gate z={24} />
      <BellTower position={[-55, 0, -52]} />
      <Tower position={[50, 0, -62]} tiers={5} label="Tháp kinh" />
      <Pond position={[76, 0, -14]} w={30} d={22} />
      <Waterfall position={[76, 0, -32]} />
      <ReleaseLanterns position={[100, 0, -20]} />
      {/* Meditation zone: stone platform with an outdoor Buddha */}
      <group position={[-78, 0, 20]}>
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <cylinderGeometry args={[14, 14, 0.5, 40]} />
          <meshStandardMaterial color="#cfc3ac" />
        </mesh>
        <Buddha position={[-8, 0.5, 0]} scale={0.8} />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 9 + 1, 0.6, Math.sin(a) * 9]} receiveShadow>
              <cylinderGeometry args={[0.5, 0.5, 0.18, 14]} />
              <meshStandardMaterial color="#a8432a" />
            </mesh>
          );
        })}
      </group>
      <Pavilion position={[70, 0, 52]} rot={0} />
      <Pavilion position={[-70, 0, 70]} rot={0} />
      <StoneLanterns points={lanterns} />
      <Crowd count={1000} />
      <PlayerAvatar />
      <RemotePlayers />
      <Controller />
    </Canvas>
  );
}
