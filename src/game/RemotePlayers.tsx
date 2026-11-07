import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { HAIR_COLORS, OUTFIT_COLORS, OUTFIT_LABEL, HAIR_LABEL } from "./sim";
import { useMultiplayer, type RemotePlayer } from "./multiplayer";
import { surfaceHeight } from "./collision";
import { animateAvatarRig, captureAvatarRig, type AvatarRig } from "./avatarAnimation";

function RemoteAvatar({ player, peers }: { player: RemotePlayer; peers: RemotePlayer[] }) {
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const externalMotionRef = useRef<THREE.Group>(null);
  const [externalModel, setExternalModel] = useState<THREE.Group | null>(null);
  const [externalClips, setExternalClips] = useState<THREE.AnimationClip[]>([]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeClipRef = useRef<THREE.AnimationAction | null>(null);
  const rigRef = useRef<AvatarRig | null>(null);
  // Only the approved first male/female models are allowed for remote visitors.
  const modelPath = player.modelId === "nu1" ? "/models/nhan-vat-nu-1.glb"
    : player.modelId === "nam1" ? "/models/nhan-vat-nam-1.glb" : null;

  useEffect(() => {
    if (!modelPath) { setExternalModel(null); setExternalClips([]); mixerRef.current = null; rigRef.current = null; return; }
    let alive = true;
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      if (!alive) return;
      const model = cloneSkinned(gltf.scene) as THREE.Group;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 2.35 / Math.max(size.y, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          (node as THREE.Mesh).castShadow = true;
          (node as THREE.Mesh).receiveShadow = true;
        }
      });
      mixerRef.current = new THREE.AnimationMixer(model);
      rigRef.current = captureAvatarRig(model);
      setExternalClips(gltf.animations ?? []);
      setExternalModel(model);
    }, undefined, () => { if (alive) setExternalModel(null); });
    return () => {
      alive = false;
      activeClipRef.current?.stop();
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      activeClipRef.current = null;
      rigRef.current = null;
    };
  }, [modelPath]);
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

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (bodyRef.current) bodyRef.current.visible = !externalModel;
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
    if (moving) phase.current += dt * 10;
    mixerRef.current?.update(dt);
    if (externalModel && externalClips.length) {
      const wanted = moving ? ["walk", "run"] : ["idle", "stand", "breath"];
      const clip = externalClips.find((item) => wanted.some((word) => item.name.toLowerCase().includes(word))) ?? externalClips[0];
      if (clip) {
        const next = mixerRef.current?.clipAction(clip) ?? null;
        if (next && activeClipRef.current !== next) { activeClipRef.current?.fadeOut(0.2); next.reset().fadeIn(0.2).play(); activeClipRef.current = next; }
      }
    } else if (externalModel) {
      animateAvatarRig(rigRef.current, clock.elapsedTime, moving);
    }
    // Static GLBs have no bones to swing their limbs, so animate the model
    // root smoothly while it follows the remote player's network position.
    if (externalMotionRef.current && externalModel && externalClips.length === 0 && !rigRef.current?.size) {
      const t = clock.elapsedTime;
      const smooth = 1 - Math.exp(-dt * 8);
      const targetBob = moving ? Math.abs(Math.sin(t * 9.5)) * 0.045 : Math.sin(t * 2.1) * 0.009;
      const targetLean = moving ? Math.sin(t * 9.5) * 0.035 : 0;
      externalMotionRef.current.position.y = THREE.MathUtils.damp(externalMotionRef.current.position.y, targetBob, 8, dt);
      externalMotionRef.current.rotation.x += (targetLean - externalMotionRef.current.rotation.x) * smooth;
      externalMotionRef.current.rotation.z = Math.sin(t * 1.25) * (moving ? 0.025 : 0.008);
    }
    previous.current = { x: group.current.position.x, z: group.current.position.z };
    const swing = moving ? Math.sin(phase.current) * 0.48 : 0;
    if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.damp(leftArm.current.rotation.x, swing, 10, dt);
    if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.damp(rightArm.current.rotation.x, -swing, 10, dt);
    if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.damp(leftLeg.current.rotation.x, -swing * 0.8, 10, dt);
    if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.damp(rightLeg.current.rotation.x, swing * 0.8, 10, dt);

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
      {externalModel && <group ref={externalMotionRef}><primitive object={externalModel} /></group>}
      <group ref={bodyRef}>
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
      {players.map((player) => <RemoteAvatar key={player.id} player={player} peers={players} />)}
    </group>
  );
}
