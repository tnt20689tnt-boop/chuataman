import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { HAIR_COLORS, OUTFIT_COLORS, OUTFIT_LABEL, HAIR_LABEL } from "./sim";
import { useMultiplayer, type RemotePlayer } from "./multiplayer";

function RemoteAvatar({ player }: { player: RemotePlayer }) {
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const [selected, setSelected] = useState(false);
  const previous = useRef({ x: player.x, z: player.z });
  const phase = useRef(0);
  const outfit = OUTFIT_COLORS[player.outfit ?? "lam"] ?? OUTFIT_COLORS.lam;
  const hairColor = player.hairColor ?? HAIR_COLORS[0];

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, player.x, 11, dt);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, player.z, 11, dt);
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      player.rot,
      12,
      dt,
    );
    const dx = player.x - previous.current.x;
    const dz = player.z - previous.current.z;
    const moving = Math.hypot(dx, dz) > 0.002;
    if (moving) phase.current += dt * 10;
    previous.current = { x: player.x, z: player.z };
    const swing = moving ? Math.sin(phase.current) * 0.48 : 0;
    if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.damp(leftArm.current.rotation.x, swing, 10, dt);
    if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.damp(rightArm.current.rotation.x, -swing, 10, dt);
    if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.damp(leftLeg.current.rotation.x, -swing * 0.8, 10, dt);
    if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.damp(rightLeg.current.rotation.x, swing * 0.8, 10, dt);

    if (label.current) {
      const distance = camera.position.distanceTo(group.current.position);
      const opacity = THREE.MathUtils.clamp((58 - distance) / 18, 0, 1);
      label.current.style.opacity = String(opacity);
      label.current.style.transform = `scale(${THREE.MathUtils.clamp(1.05 - distance / 100, 0.58, 1)})`;
      label.current.style.pointerEvents = distance < 42 ? "auto" : "none";
    }
  });

  return (
    <group
      ref={group}
      position={[player.x, 0, player.z]}
      onClick={(event) => {
        event.stopPropagation();
        setSelected((value) => !value);
      }}
    >
      {/* Robe and torso */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <capsuleGeometry args={[0.29, 0.48, 5, 10]} />
        <meshStandardMaterial color={outfit} roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.235, 18, 14]} />
        <meshStandardMaterial color="#f1cfae" roughness={0.72} />
      </mesh>
      {player.hair !== "troc" && (
        <mesh position={[0, 1.79, -0.015]}>
          <sphereGeometry args={[0.245, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
      )}
      {player.hair === "bui" && (
        <mesh position={[0, 1.96, -0.12]}>
          <sphereGeometry args={[0.105, 12, 10]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      )}
      {/* Face */}
      <mesh position={[-0.075, 1.72, 0.215]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#2a1a12" />
      </mesh>
      <mesh position={[0.075, 1.72, 0.215]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#2a1a12" />
      </mesh>
      {/* Arms */}
      <group ref={leftArm} position={[-0.34, 1.24, 0]}>
        <mesh rotation-z={-0.12} position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.36, 4, 8]} />
          <meshStandardMaterial color={outfit} roughness={0.86} />
        </mesh>
        <mesh position={[0, -0.43, 0.015]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color="#f1cfae" />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.34, 1.24, 0]}>
        <mesh rotation-z={0.12} position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.36, 4, 8]} />
          <meshStandardMaterial color={outfit} roughness={0.86} />
        </mesh>
        <mesh position={[0, -0.43, 0.015]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color="#f1cfae" />
        </mesh>
      </group>
      {/* Legs and feet */}
      <group ref={leftLeg} position={[-0.14, 0.56, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.105, 0.3, 4, 8]} />
          <meshStandardMaterial color={outfit} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.43, 0.07]} scale={[1, 0.55, 1.35]}>
          <sphereGeometry args={[0.105, 10, 8]} />
          <meshStandardMaterial color="#5b5149" />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.14, 0.56, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.105, 0.3, 4, 8]} />
          <meshStandardMaterial color={outfit} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.43, 0.07]} scale={[1, 0.55, 1.35]}>
          <sphereGeometry args={[0.105, 10, 8]} />
          <meshStandardMaterial color="#5b5149" />
        </mesh>
      </group>
      <Html position={[0, 2.2, 0]} center distanceFactor={13} zIndexRange={[20, 5]}>
        <div
          ref={label}
          className="name-tag"
          style={{ cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 180ms ease" }}
          onClick={(event) => {
            event.stopPropagation();
            setSelected((value) => !value);
          }}
        >
          {player.name}
          {selected && (
            <div className="mt-2 rounded-lg border border-white/30 bg-stone-950/90 px-3 py-2 text-left text-xs text-white shadow-xl">
              <div className="font-semibold">{player.name}</div>
              <div className="mt-1 text-white/75">{OUTFIT_LABEL[player.outfit ?? "lam"]}</div>
              <div className="text-white/75">{HAIR_LABEL[player.hair ?? "ngan"]}</div>
              <div className="mt-1 text-[10px] text-white/55">Phật tử đang hiện diện</div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

export function RemotePlayers() {
  const { players } = useMultiplayer();
  return (
    <group>
      {players.map((player) => <RemoteAvatar key={player.id} player={player} />)}
    </group>
  );
}
