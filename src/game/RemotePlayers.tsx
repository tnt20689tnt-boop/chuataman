import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { OUTFIT_LABEL, HAIR_LABEL } from "./sim";
import { useMultiplayer, type RemotePlayer } from "./multiplayer";
import { surfaceHeight } from "./collision";
import { AnimatedAvatarAppearance } from "./AvatarAppearance";

function RemoteAvatar({ player, peers }: { player: RemotePlayer; peers: RemotePlayer[] }) {
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const [selected, setSelected] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const previous = useRef({ x: player.x, z: player.z });

  useFrame((_state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, player.x, 11, dt);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, player.z, 11, dt);
    const targetY = surfaceHeight(player.x, player.z);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 12, dt);
    const angleDelta = THREE.MathUtils.euclideanModulo(player.rot - group.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    group.current.rotation.y += angleDelta * (1 - Math.exp(-12 * dt));
    const dx = group.current.position.x - previous.current.x;
    const dz = group.current.position.z - previous.current.z;
    const moving = Math.hypot(dx, dz) > 0.002;
    if (moving !== isMoving) setIsMoving(moving);
    previous.current = { x: group.current.position.x, z: group.current.position.z };

    if (label.current) {
      const distance = camera.position.distanceTo(group.current.position);
      const opacity = THREE.MathUtils.clamp((58 - distance) / 18, 0, 1);
      label.current.style.opacity = String(opacity);
      const nearby = peers
        .filter((peer) => peer.id !== player.id && Math.hypot(peer.x - player.x, peer.z - player.z) < 3.5)
        .sort((a, b) => a.id.localeCompare(b.id));
      const stack = nearby.filter((peer) => peer.id < player.id).length;
      label.current.style.transform = `translateY(-${stack * 14}px) scale(${THREE.MathUtils.clamp(1.05 - distance / 100, 0.58, 1)})`;
      label.current.style.pointerEvents = distance < 42 ? "auto" : "none";
    }
  });

  return (
    <group
      ref={group}
      position={[player.x, surfaceHeight(player.x, player.z), player.z]}
      onClick={(event) => {
        event.stopPropagation();
        setSelected((value) => !value);
      }}
    >
      <AnimatedAvatarAppearance
        modelId={player.modelId ?? "male_animated"}
        outfit={player.outfit ?? "lam"}
        outfitColor={player.outfitColor}
        hairColor={player.hairColor ?? "#1b1410"}
        pose={player.action && player.action !== "none" ? (player.pose ?? "stand") : isMoving ? "walk" : "stand"}
        action={player.action ?? "none"}
      />
      <Html position={[0, 2.62, 0]} center distanceFactor={13} zIndexRange={[20, 5]}>
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
      {players.map((player) => <RemoteAvatar key={player.id} player={player} peers={players} />)}
    </group>
  );
}
