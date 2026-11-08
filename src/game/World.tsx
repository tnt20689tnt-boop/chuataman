import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky, Cloud, Clouds } from "@react-three/drei";
import { grassTexture, stoneTexture } from "./textures";
import { Forest, StoneLanterns, SkyLanterns } from "./Architecture";
import { PlayerAvatar } from "./Characters";
import { RemotePlayers } from "./RemotePlayers";
import { ZONES, clamp, rng, stepPlayer } from "./sim";
import { cam, getUI, input, player, setUI } from "./store";
import { playFootstep, stopFootsteps, setAudioZone } from "./audio";
import { Surface } from './Materials';
import { OverviewCampus } from "./OverviewCampus";
import { SacredLandscape } from './SacredLandscape';
import { BUILDINGS, SCENE_COLORS as C } from './templeData';
import { surfaceHeight, setTreeCollisionPoints } from './collision';
import { teleport } from './store';

function getVietnamDaylight() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const hour = part("hour") + part("minute") / 60 + part("second") / 3600;
  // Sunrise around 05:30, sunset around 18:15 (Vietnam local device time).
  const daylight = THREE.MathUtils.clamp((hour - 5.5) / 1.1, 0, 1) *
    (1 - THREE.MathUtils.clamp((hour - 17.2) / 1.1, 0, 1));
  const morning = THREE.MathUtils.clamp(1 - Math.abs(hour - 8.0) / 4.5, 0, 1);
  const evening = THREE.MathUtils.clamp(1 - Math.abs(hour - 17.4) / 2.2, 0, 1);
  const night = 1 - daylight;
  return { hour, daylight, morning, evening, night };
}

function DayNightCycle({ mobile }: { mobile: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  const [sunPosition, setSunPosition] = useState<[number, number, number]>([120, 100, -200]);

  useEffect(() => {
    const updateSun = () => {
      const { hour } = getVietnamDaylight();
      const angle = ((hour - 6) / 12) * Math.PI;
      setSunPosition([Math.cos(angle) * 180, Math.max(-18, Math.sin(angle) * 150), -80]);
    };
    updateSun();
    const timer = window.setInterval(updateSun, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useFrame(() => {
    const { daylight, morning, evening, night } = getVietnamDaylight();
    const bg = new THREE.Color("#39485d").lerp(new THREE.Color("#e7f0ed"), daylight);
    const dawn = new THREE.Color("#f3b88e");
    bg.lerp(dawn, Math.max(morning, evening) * 0.22);
    const fogColor = new THREE.Color("#344253").lerp(new THREE.Color("#e0e9e2"), daylight);
    fogColor.lerp(new THREE.Color("#d99b78"), evening * 0.18);
    scene.background = bg;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(fogColor);
    if (hemi.current) {
      // Keep the temple readable and welcoming after sunset instead of letting the grounds fall into darkness.
      hemi.current.intensity = 1.05 + daylight * 0.75;
      hemi.current.color.set(night > 0.65 ? "#d7e4ff" : "#f2f7ff");
      hemi.current.groundColor.set(night > 0.65 ? "#78866f" : "#8b9878");
    }
    if (sun.current) {
      sun.current.intensity = 0.32 + daylight * 2.15;
      sun.current.color.set(evening > 0.25 ? "#ffc18b" : "#fff3de");
      sun.current.position.set(sunPosition[0], sunPosition[1], sunPosition[2]);
    }
  });

  return <>
    <Sky sunPosition={sunPosition} turbidity={2.5} rayleigh={1.2} mieCoefficient={0.003} mieDirectionalG={0.8} />
    <hemisphereLight ref={hemi} args={["#e5eef3", "#657452", 1.1]} />
    <directionalLight
      ref={sun}
      position={sunPosition}
      intensity={2.4}
      color="#fff3de"
      castShadow
      shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
      shadow-camera-left={-80}
      shadow-camera-right={80}
      shadow-camera-top={80}
      shadow-camera-bottom={-80}
      shadow-camera-far={250}
      shadow-bias={-0.0005}
    />
  </>;
}

function Ground() {
  const grass = useMemo(() => {
    const texture = grassTexture();
    texture.repeat.set(114, 114);
    return texture;
  }, []);
  const stone = useMemo(() => stoneTexture(), []);
  const path = useMemo(() => {
    const t = stoneTexture();
    t.repeat.set(2, 22);
    return t;
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -14]} receiveShadow>
        <planeGeometry args={[84, 82]} />
        <Suspense fallback={<meshStandardMaterial map={stone} roughness={0.9} />}><Surface kind="stone" repeat={18} /></Suspense>
      </mesh>
      {/* Main ceremonial stone avenue, split around the lotus pond and bridge. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 66]} receiveShadow>
        <planeGeometry args={[12, 96]} />
        <Suspense fallback={<meshStandardMaterial map={path} roughness={0.9} />}><Surface kind="stone" repeat={24} /></Suspense>
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, -25]} receiveShadow>
        <planeGeometry args={[12, 50]} />
        <Suspense fallback={<meshStandardMaterial map={path} roughness={0.9} />}><Surface kind="stone" repeat={14} /></Suspense>
      </mesh>
      {/* Fine bronze borders frame the ceremonial avenue without creating collision obstacles. */}
      {[-6.25, 6.25].map((x) => <group key={x}>
        <mesh position={[x, 0.08, 66]} castShadow><boxGeometry args={[0.22, 0.12, 96]} /><meshStandardMaterial color="#a98a55" metalness={0.42} roughness={0.52} /></mesh>
        <mesh position={[x, 0.08, -25]} castShadow><boxGeometry args={[0.22, 0.12, 50]} /><meshStandardMaterial color="#a98a55" metalness={0.42} roughness={0.52} /></mesh>
      </group>)}
      {/* Broad cross-avenue links the main hall forecourt to both side wings. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 30]} receiveShadow>
        <planeGeometry args={[170, 6]} />
        <meshStandardMaterial map={path} roughness={0.9} />
      </mesh>
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
    // Keep generated forest trees completely outside the ancestral hall footprint.
    const insideAncestralHall = Math.abs(x) < 17 && z > -113 && z < -89;
    if (inCourt || onPath || nearZone || sidePath || pond || insideAncestralHall) continue;
    pts.push([x, z, 0.8 + r() * 0.8]);
  }
  return pts;
}

function Controller() {
  const { camera, gl, scene } = useThree();
  const cameraRay = useMemo(() => new THREE.Raycaster(), []);
  const cameraOrigin = useMemo(() => new THREE.Vector3(), []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const desiredCamera = useMemo(() => new THREE.Vector3(), []);
  const safeCamera = useMemo(() => new THREE.Vector3(), []);
  const lastCameraCheck = useRef(0);
  const safeDistance = useRef(cam.dist);
  const last = useRef(0);
  const lastAudioZone = useRef("");
  const keys = useRef(new Set<string>());
  const restKeyPressed = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const debug = {
        get state() { return { ...player, camera: { ...cam } }; },
        visit: (x: number, z: number, yaw = 0, dist = 14) => { teleport(x, z, Math.PI); cam.yaw = yaw; cam.dist = dist; },
        move: (seconds: number, fwd = 1, right = 0) => {
          for (let t = 0; t < seconds; t += 1 / 60) stepPlayer(player, { fwd, right, run: false }, cam.yaw, 1 / 60);
        },
      };
      Object.assign(window, { __game: debug });
    }
    const requestBedToggle = () => { restKeyPressed.current = true; };
    window.addEventListener("guest-bed-toggle", requestBedToggle);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.code === "KeyE") restKeyPressed.current = true;
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
      // Calibrated pointer response: responsive on touchpads, but damped
      // enough to avoid sudden spins on a phone or mouse.
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
      window.removeEventListener("guest-bed-toggle", requestBedToggle);
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
  const smoothedTarget = useMemo(() => new THREE.Vector3(), []);
  const smoothedCamera = useMemo(() => new THREE.Vector3(), []);
  const cameraInitialized = useRef(false);
  // The camera ray must not treat the controlled avatar as a wall.
  // Otherwise it can hit the avatar's own head/body and suddenly pull the
  // camera toward the character, which looks like a backward snap.
  const isControlledAvatar = (object: THREE.Object3D) => {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.userData?.["cameraIgnore"] === true) return true;
      current = current.parent;
    }
    return false;
  };
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    input.fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) + input.joyF;
    input.right = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + input.joyR;
    input.run = k.has("ShiftLeft") || k.has("ShiftRight");
    let ui = getUI();
    const guestHouse = BUILDINGS.find((b) => b.kind === "guest");
    if (restKeyPressed.current) {
      restKeyPressed.current = false;
      if (ui.pose === "lie" && guestHouse) {
        const side = player.x < guestHouse.x ? -1 : 1;
        player.x = guestHouse.x + side * 7;
        player.z = guestHouse.z + 4.2;
        player.y = surfaceHeight(player.x, player.z);
        setUI({ pose: "stand", action: "none" });
      } else if (guestHouse) {
        const beds = [-1, 1].map((side) => ({ x: guestHouse.x + side * 7, z: guestHouse.z - 3 }));
        const bed = beds.find((b) => Math.hypot(player.x - b.x, player.z - b.z) < 5.2);
        if (bed) {
          player.x = bed.x;
          player.z = bed.z;
          player.y = 1.32;
          player.rot = Math.PI;
          setUI({ pose: "lie", action: "none" });
        }
      }
      ui = getUI();
    }
    const moved = ui.pose === "lie" ? false : stepPlayer(player, input, cam.yaw, dt);
    if (moved) playFootstep();
    else stopFootsteps();
    if (moved && ui.pose !== "walk") setUI({ pose: "walk", action: "none" });
    if (!moved && ui.pose === "walk") setUI({ pose: "stand" });

    target.set(player.x, player.y + 1.6, player.z);
    const cp = Math.cos(cam.pitch);
    desiredCamera.set(
      player.x + Math.sin(cam.yaw) * cam.dist * cp,
      player.y + 1.6 + Math.sin(cam.pitch) * cam.dist,
      player.z + Math.cos(cam.yaw) * cam.dist * cp,
    );

    // The narrow lotus bridge is flanked by rails. Do not let the camera
    // collision ray mistake those rails/bridge surfaces for a wall and pull
    // the view into the avatar while crossing the bridge.
    const onLotusBridge = Math.abs(player.x) < 2.2 && player.z >= -5 && player.z <= 21;
    const now = state.clock.elapsedTime;
    cameraDirection.subVectors(desiredCamera, target);
    const desiredDistance = cameraDirection.length();
    cameraDirection.normalize();

    if (onLotusBridge) {
      safeDistance.current = desiredDistance;
    } else if (now - lastCameraCheck.current > 0.08) {
      lastCameraCheck.current = now;
      cameraOrigin.copy(target).addScaledVector(cameraDirection, 0.38);
      cameraRay.set(cameraOrigin, cameraDirection);
      cameraRay.near = 0.05;
      cameraRay.far = Math.max(0.5, desiredDistance - 0.2);
      const hits = cameraRay.intersectObjects(scene.children, true);
      const obstruction = hits.find((hit) => {
        if (isControlledAvatar(hit.object)) return false;
        const mesh = hit.object as THREE.Mesh;
        if (hit.distance <= 0.35 || !mesh.visible || !mesh.isMesh) return false;
        const material = mesh.material;
        return Array.isArray(material)
          ? material.some((part) => !part.transparent)
          : !material.transparent;
      });
      const available = obstruction
        ? Math.max(1.9, obstruction.distance + 0.38 - 0.5)
        : desiredDistance;
      safeDistance.current = THREE.MathUtils.clamp(available, 1.9, desiredDistance);
    }

    const followAlpha = 1 - Math.exp(-dt * 48);
    const lookAlpha = 1 - Math.exp(-dt * 56);
    safeCamera.copy(target).addScaledVector(cameraDirection, safeDistance.current);
    // Smooth both the follow point and camera position. This removes the
    // one-frame snaps caused by collision checks while keeping the avatar
    // movement and camera heading in sync on desktop and mobile.
    if (!cameraInitialized.current) {
      smoothedTarget.copy(target);
      smoothedCamera.copy(safeCamera);
      cameraInitialized.current = true;
    } else {
      smoothedTarget.lerp(target, lookAlpha);
      smoothedCamera.lerp(safeCamera, followAlpha);
    }
    camera.position.copy(smoothedCamera);
    camera.lookAt(smoothedTarget);

    const t = state.clock.elapsedTime;
    if (t - last.current > 0.5) {
      last.current = t;
      let best = "Thế giới Tâm An";
      let bestId = "san";
      let bd = 900;
      for (const z of ZONES) {
        const d = (z.x - player.x) ** 2 + (z.z - player.z) ** 2;
        if (d < bd) {
          bd = d;
          best = z.name;
          bestId = z.id;
        }
      }
      if (best !== ui.zoneLabel) setUI({ zoneLabel: best });
      if (bestId !== lastAudioZone.current) {
        lastAudioZone.current = bestId;
        setAudioZone(bestId);
      }
      if (!ui.sceneReady) setUI({ sceneReady: true });
      gl.domElement.dataset['sceneReady'] = '1';
    }
  });
  return null;
}

export default function World() {
  const [mobile, setMobile] = useState(true);
  useEffect(() => { setMobile(window.matchMedia('(max-width: 760px)').matches); }, []);
  const trees = useMemo(() => { const points = treePoints(); setTreeCollisionPoints(points); return points; }, []);
  const lanterns = useMemo(() => {
    const p: [number, number][] = [];
    for (let z = 38; z < 108; z += 14) p.push([-10, z], [10, z]);
    for (let z = -42; z <= -6; z += 14) p.push([-10, z], [10, z]);
    for (let x = -36; x <= 36; x += 12) if (x !== 0) p.push([x, 24]);
    return p;
  }, []);
  return (
    <Canvas
      shadows
      dpr={[1, mobile ? 1.25 : 1.5]}
      camera={{ fov: 55, near: 0.3, far: 600, position: [0, 8, 50] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.38 }}
      style={{ touchAction: "none" }}
    >
      <fog attach="fog" args={[C.fog, 140, 400]} />
      <DayNightCycle mobile={mobile} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} color="#ffe2bd" />
        <Lightformer intensity={1} color="#bcd6e0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <Clouds limit={60}>
        <Cloud position={[-60, 55, -150]} seed={2} segments={20} bounds={[40, 6, 10]} volume={12} color="#fff2e2" opacity={0.7} />
        <Cloud position={[80, 60, -120]} seed={5} segments={20} bounds={[40, 6, 10]} volume={12} color="#ffe8d0" opacity={0.7} />
      </Clouds>

      <Ground />
      <Forest points={trees} />
      <Suspense fallback={null}>
      <SacredLandscape existingTrees={trees} />
      <OverviewCampus />
      <StoneLanterns points={lanterns} />
      <SkyLanterns />
      </Suspense>
      <PlayerAvatar />
      <RemotePlayers />
      <Controller />
    </Canvas>
  );
}
