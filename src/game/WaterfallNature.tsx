import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getAudioSettings } from "./audio";
import { player } from "./store";

const WATERFALL_AUDIO = "https://upload.wikimedia.org/wikipedia/commons/transcoded/2/26/Flowing-water-100019.ogg/Flowing-water-100019.ogg.mp3";
const FALLS_CENTER = new THREE.Vector3(0, 0, -176.9);
const _fishPosition = new THREE.Vector3();

/** Quiet waterfall ambience fades in near the Buddha mountain and respects the audio toggle. */
export function WaterfallAmbience() {
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = new Audio(WATERFALL_AUDIO);
    element.loop = true;
    element.preload = "none";
    audio.current = element;
    return () => {
      element.pause();
      element.src = "";
      audio.current = null;
    };
  }, []);

  useFrame(() => {
    const element = audio.current;
    if (!element) return;
    const settings = getAudioSettings();
    const distance = Math.hypot(player.x - FALLS_CENTER.x, player.z - FALLS_CENTER.z);
    const proximity = THREE.MathUtils.clamp(1 - distance / 78, 0, 1);
    const volume = settings.enabled ? settings.nature * 0.62 * proximity : 0;
    element.volume = THREE.MathUtils.clamp(volume, 0, 0.42);
    if (volume > 0.008 && element.paused) {
      void element.play().catch(() => undefined);
    } else if (volume <= 0.008 && !element.paused) {
      element.pause();
    }
  });

  return null;
}

type BirdFlight = { phase: number; radius: number; height: number; speed: number; scale: number };

/** A small flock circling the waterfall cliff; wing motion is deliberately subtle. */
export function WaterfallBirds() {
  const birds = useRef<(THREE.Group | null)[]>([]);
  const flights = useMemo<BirdFlight[]>(() => Array.from({ length: 7 }, (_, i) => ({
    phase: i * (Math.PI * 2 / 7),
    radius: 11 + (i % 3) * 3.2,
    height: 11 + (i % 4) * 1.7,
    speed: 0.11 + (i % 3) * 0.025,
    scale: 0.38 + (i % 3) * 0.08,
  })), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flights.forEach((bird, i) => {
      const group = birds.current[i];
      if (!group) return;
      const angle = bird.phase + t * bird.speed;
      group.position.set(Math.cos(angle) * bird.radius, bird.height + Math.sin(t * 0.7 + bird.phase) * 0.8, -179 + Math.sin(angle) * bird.radius * 0.7);
      group.rotation.y = -angle;
      const flap = Math.sin(t * 7 + bird.phase) * 0.28;
      if (group.children[1]) group.children[1].rotation.z = flap;
      if (group.children[2]) group.children[2].rotation.z = -flap;
    });
  });

  return <group name="Đàn chim quanh thác nước">
    {flights.map((bird, i) => (
      <group key={i} ref={(element) => { birds.current[i] = element; }} scale={bird.scale}>
        <mesh scale={[0.5, 0.22, 0.22]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#343b36" roughness={0.96} />
        </mesh>
        <mesh position={[-0.06, 0.03, 0.28]} rotation-y={-0.18} rotation-z={0.12}>
          <coneGeometry args={[0.08, 0.78, 4]} />
          <meshStandardMaterial color="#414840" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.06, 0.03, -0.28]} rotation-y={0.18} rotation-z={0.12}>
          <coneGeometry args={[0.08, 0.78, 4]} />
          <meshStandardMaterial color="#414840" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.49, 0.03, 0]} rotation-z={-Math.PI / 2}>
          <coneGeometry args={[0.075, 0.22, 5]} />
          <meshStandardMaterial color="#c69b58" />
        </mesh>
      </group>
    ))}
  </group>;
}

/** A few koi circle the waterfall's shallow basin with gently wagging tails. */
export function WaterfallKoi() {
  const fish = useRef<(THREE.Group | null)[]>([]);
  const paths = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    phase: i * Math.PI * 2 / 5,
    radius: 2.2 + (i % 3) * 0.85,
    speed: 0.2 + (i % 2) * 0.07,
    scale: 0.42 + (i % 3) * 0.1,
  })), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    paths.forEach((path, i) => {
      const group = fish.current[i];
      if (!group) return;
      const angle = path.phase + t * path.speed;
      group.position.set(Math.cos(angle) * path.radius, 0.28 + Math.sin(t * 1.4 + path.phase) * 0.035, -176.9 + Math.sin(angle) * path.radius * 0.72);
      group.rotation.y = -angle;
      const tail = group.children[1];
      if (tail) tail.rotation.y = Math.sin(t * 5 + path.phase) * 0.32;
    });
  });

  return <group name="Cá koi dưới chân thác">
    {paths.map((path, i) => (
      <group key={i} ref={(element) => { fish.current[i] = element; }} scale={path.scale}>
        <mesh scale={[0.88, 0.38, 0.43]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color={i % 2 ? "#f2eee0" : "#d96c3e"} roughness={0.38} />
        </mesh>
        <group position={[0, 0, -0.72]}>
          <mesh rotation-x={Math.PI / 2} scale={[0.7, 0.75, 0.7]}>
            <coneGeometry args={[0.45, 0.8, 6]} />
            <meshStandardMaterial color={i % 2 ? "#d96c3e" : "#f2eee0"} roughness={0.45} />
          </mesh>
        </group>
        <mesh position={[0.55, 0.14, 0.2]} scale={0.055}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#171717" />
        </mesh>
        <mesh position={[0.55, 0.14, -0.2]} scale={0.055}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#171717" />
        </mesh>
      </group>
    ))}
  </group>;
}

void _fishPosition;
