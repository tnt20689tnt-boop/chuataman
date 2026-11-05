import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useMultiplayer } from "./multiplayer";

function RemoteAvatar({ name, x, z, rot }: { name: string; x: number; z: number; rot: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, x, 12, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, z, 12, delta);
    group.current.rotation.y = rot;
  });
  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.38, 1.15, 12]} />
        <meshStandardMaterial color="#8c6bba" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 12]} />
        <meshStandardMaterial color="#f1cfae" />
      </mesh>
      <Html position={[0, 1.95, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
        <div className="name-tag">{name}</div>
      </Html>
    </group>
  );
}

export function RemotePlayers() {
  const { players } = useMultiplayer();
  return (
    <group>
      {players.map((p) => (
        <RemoteAvatar key={p.id} name={p.name} x={p.x} z={p.z} rot={p.rot} />
      ))}
    </group>
  );
}
