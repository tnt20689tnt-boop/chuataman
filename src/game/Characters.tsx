import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HAIR_COLORS, OUTFIT_COLORS, makeCrowd, walkerPos, type Npc, type Pose } from "./sim";
import { player, useUI } from "./store";
import { moveVisitor } from "./collision";

const SKIN = "#f1cfae";

/** Body layout per pose: [bodyScaleY, bodyScaleXZ, headY] */
function layout(p: Pose): [number, number, number] {
  if (p === "sit") return [0.5, 1.35, 0.88];
  if (p === "kneel") return [0.62, 1.15, 1.0];
  return [1, 1, 1.38];
}

export function Crowd({ count = 1000 }: { count?: number }) {
  const npcs = useMemo(() => makeCrowd(count), [count]);
  const body = useRef<THREE.InstancedMesh>(null);
  const robeGeometry = useMemo(() => new THREE.LatheGeometry([
    new THREE.Vector2(0.29, 0), new THREE.Vector2(0.34, 0.08),
    new THREE.Vector2(0.28, 0.25), new THREE.Vector2(0.205, 0.48),
    new THREE.Vector2(0.22, 0.70), new THREE.Vector2(0.30, 0.88),
    new THREE.Vector2(0.255, 1.10),
  ], 12), []);
  const head = useRef<THREE.InstancedMesh>(null);
  const hair = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const hands = useRef<THREE.InstancedMesh>(null);
  const feet = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const [near, setNear] = useState<Npc[]>([]);
  const walkers = useMemo(() => npcs.filter((n) => n.pose === "walk"), [npcs]);
  const lastNear = useRef(0);

  const place = (n: Npc, x: number, z: number, rot: number, t: number) => {
    const [sy, sxz, hy] = layout(n.pose);
    let bow = 0;
    if (n.pose === "kneel") bow = Math.max(0, Math.sin(t * 0.8 + n.phase)) * 0.35;
    const fx = Math.sin(rot);
    const fz = Math.cos(rot);
    tmp.position.set(x, 0, z);
    tmp.rotation.set(0, rot, 0);
    const female = n.gender === "nu";
    tmp.scale.set(sxz * (female ? 0.88 : 1.08), sy, sxz * (female ? 0.94 : 1.04));
    tmp.updateMatrix();
    body.current!.setMatrixAt(n.id, tmp.matrix);
    // Separate articulated-looking limbs keep the crowd silhouette readable.
    const swing = n.pose === "walk" ? Math.sin(t * 6 + n.phase) * 0.32 : 0;
    for (const side of [-1, 1]) {
      tmp.position.set(x + side * (female ? 0.285 : 0.34) * sxz, 0.56 * sy, z);
      tmp.rotation.set(side * swing, rot, side * -0.10);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      arms.current!.setMatrixAt(n.id * 2 + (side === 1 ? 1 : 0), tmp.matrix);
      tmp.position.set(x + side * (female ? 0.15 : 0.17) * sxz, 0.20 * sy, z);
      tmp.rotation.set(-side * swing * 1.25, rot, 0);
      tmp.updateMatrix();
      legs.current!.setMatrixAt(n.id * 2 + (side === 1 ? 1 : 0), tmp.matrix);
      tmp.position.set(x + side * (female ? 0.285 : 0.34) * sxz, 0.20 * sy, z + 0.015);
      tmp.rotation.set(0, rot, 0);
      tmp.updateMatrix();
      hands.current!.setMatrixAt(n.id * 2 + (side === 1 ? 1 : 0), tmp.matrix);
      tmp.position.set(x + side * (female ? 0.15 : 0.17) * sxz, 0.045 * sy, z + 0.10);
      tmp.rotation.set(0, rot, 0);
      tmp.updateMatrix();
      feet.current!.setMatrixAt(n.id * 2 + (side === 1 ? 1 : 0), tmp.matrix);
    }
    const bob = n.pose === "walk" ? Math.abs(Math.sin(t * 6 + n.phase)) * 0.05 : 0;
    tmp.position.set(x + fx * bow, hy - bow * 0.6 + bob, z + fz * bow);
    // Small but consistent facial/head-shape differences make the crowd
    // easier to read at a distance without caricaturing either gender.
    tmp.scale.set(female ? 0.96 : 1.02, female ? 1.02 : 1.08, female ? 0.98 : 1.02);
    tmp.updateMatrix();
    head.current!.setMatrixAt(n.id, tmp.matrix);
    if (n.hair === "troc") tmp.scale.setScalar(0);
    else if (n.gender === "nu" && n.hair === "dai") tmp.scale.set(1.08, 1.32, 1.08);
    else if (n.gender === "nu" && n.hair === "bui") tmp.scale.set(1.12, 1.18, 1.08);
    else if (n.gender === "nam" && n.hair === "ngan") tmp.scale.set(1.05, 0.82, 1.05);
    else if (n.hair === "bui") tmp.scale.set(1, 1.25, 1);
    else if (n.hair === "dai") tmp.scale.set(1.05, 1.5, 1.05);
    tmp.position.y += 0.05;
    tmp.updateMatrix();
    hair.current!.setMatrixAt(n.id, tmp.matrix);
  };

  useLayoutEffect(() => {
    const c = new THREE.Color();
    npcs.forEach((n, i) => {
      place(n, n.x, n.z, n.rot, 0);
      c.set(OUTFIT_COLORS[n.outfit]).offsetHSL(0, 0, (Math.sin(i) * 0.04));
      body.current!.setColorAt(i, c);
      arms.current!.setColorAt(i * 2, c);
      arms.current!.setColorAt(i * 2 + 1, c);
      legs.current!.setColorAt(i * 2, c);
      legs.current!.setColorAt(i * 2 + 1, c);
      c.set(HAIR_COLORS[i % HAIR_COLORS.length] ?? "#1b1410");
      hair.current!.setColorAt(i, c);
    });
    [body, head, hair, arms, legs, hands, feet].forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
      r.current!.computeBoundingSphere();
    });
    body.current!.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -11), 60);
    head.current!.boundingSphere = body.current!.boundingSphere;
    hair.current!.boundingSphere = body.current!.boundingSphere;
    arms.current!.boundingSphere = body.current!.boundingSphere;
    legs.current!.boundingSphere = body.current!.boundingSphere;
    hands.current!.boundingSphere = body.current!.boundingSphere;
    feet.current!.boundingSphere = body.current!.boundingSphere;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcs]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    for (const n of walkers) {
      const target = walkerPos(n, t);
      // Crowd walkers use the same swept collision solver as the player.
      // This prevents their circular routes from passing through halls,
      // altars, ponds, columns, Buddha statues or the campus buildings.
      const motion = { x: n.x, z: n.z, y: 0 };
      moveVisitor(motion, target.x - n.x, target.z - n.z);
      const dx = motion.x - n.x;
      const dz = motion.z - n.z;
      n.x = motion.x;
      n.z = motion.z;
      const rot = Math.hypot(dx, dz) > 0.0001 ? Math.atan2(dx, dz) : n.rot;
      n.rot = rot;
      place(n, n.x, n.z, rot, t);
    }
    for (const n of npcs) if (n.pose === "kneel") place(n, n.x, n.z, n.rot, t);
    body.current!.instanceMatrix.needsUpdate = true;
    head.current!.instanceMatrix.needsUpdate = true;
    hair.current!.instanceMatrix.needsUpdate = true;
    arms.current!.instanceMatrix.needsUpdate = true;
    legs.current!.instanceMatrix.needsUpdate = true;
    hands.current!.instanceMatrix.needsUpdate = true;
    feet.current!.instanceMatrix.needsUpdate = true;
    // refresh nearest name tags twice a second
    if (t - lastNear.current > 0.5) {
      lastNear.current = t;
      const sorted = npcs
        .map((n) => [n, (n.x - player.x) ** 2 + (n.z - player.z) ** 2] as const)
        .filter(([, d]) => d < 400)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 14)
        .map(([n]) => n);
      setNear((prev) => (prev.length === sorted.length && prev.every((p, i) => p === sorted[i]) ? prev : sorted));
    }
  });

  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, npcs.length]} castShadow frustumCulled>
        <primitive object={robeGeometry} attach="geometry" />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, npcs.length]} castShadow>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={hair} args={[undefined, undefined, npcs.length]}>
        <sphereGeometry args={[0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, npcs.length * 2]} castShadow>
        <capsuleGeometry args={[0.075, 0.38, 4, 7]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, npcs.length * 2]} castShadow>
        <capsuleGeometry args={[0.09, 0.34, 4, 7]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={hands} args={[undefined, undefined, npcs.length * 2]}>
        <sphereGeometry args={[0.065, 7, 6]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={feet} args={[undefined, undefined, npcs.length * 2]} castShadow>
        <capsuleGeometry args={[0.075, 0.12, 3, 6]} />
        <meshStandardMaterial color="#51463e" roughness={0.95} />
      </instancedMesh>
      {near.map((n) => (
        <NameTag key={n.id} n={n} />
      ))}
    </group>
  );
}

function NameTag({ n }: { n: Npc }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    ref.current?.position.set(n.x, layout(n.pose)[2] + 0.55, n.z);
  });
  return (
    <group ref={ref}>
      <Html center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="name-tag">{n.name}</div>
      </Html>
    </group>
  );
}

export function PlayerAvatar() {
  const avatar = useUI((s) => s.avatar);
  const pose = useUI((s) => s.pose);
  const action = useUI((s) => s.action);
  const g = useRef<THREE.Group>(null);
  const robeRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const [sy, sxz, hy] = layout(pose);
  const color = OUTFIT_COLORS[avatar?.outfit ?? "lam"];
  const female = avatar?.gender === "nu";
  const robeGeometry = useMemo(() => new THREE.LatheGeometry(
    female
      ? [new THREE.Vector2(0.31, 0), new THREE.Vector2(0.36, 0.08), new THREE.Vector2(0.30, 0.25), new THREE.Vector2(0.19, 0.50), new THREE.Vector2(0.205, 0.70), new THREE.Vector2(0.26, 0.88), new THREE.Vector2(0.23, 1.10)]
      : [new THREE.Vector2(0.29, 0), new THREE.Vector2(0.32, 0.08), new THREE.Vector2(0.27, 0.25), new THREE.Vector2(0.235, 0.50), new THREE.Vector2(0.25, 0.70), new THREE.Vector2(0.31, 0.88), new THREE.Vector2(0.29, 1.10)],
    16,
  ), [female]);
  const hair = avatar?.hair ?? "ngan";
  const handsJoined = action === "chap" || action === "le" || action === "thien" || action === "kinh";

  useFrame(({ clock }, delta) => {
    if (!g.current) return;
    g.current.position.set(player.x, player.y, player.z);
    g.current.rotation.y = player.rot;
    const t = clock.elapsedTime;
    const walking = pose === "walk";
    const gait = walking ? Math.sin(t * 8.5) * 0.58 : 0;
    const breath = Math.sin(t * 2.15);
    const smooth = 1 - Math.exp(-delta * 10);
    // Subtle breathing and weight shifts keep the character alive while standing.
    if (robeRef.current) {
      const stepBounce = walking ? Math.abs(Math.sin(t * 8.5)) * 0.035 : 0;
      robeRef.current.position.y = stepBounce + breath * 0.009;
      robeRef.current.rotation.z = Math.sin(t * 1.35) * (walking ? 0.035 : 0.012);
      robeRef.current.scale.y = sy * (1 + breath * 0.006);
    }
    g.current.position.y = player.y + (walking ? Math.abs(Math.sin(t * 8.5)) * 0.025 : Math.sin(t * 1.8) * 0.008);
    if (leftArmRef.current) leftArmRef.current.rotation.x += (gait - leftArmRef.current.rotation.x) * smooth;
    if (rightArmRef.current) rightArmRef.current.rotation.x += (-gait - rightArmRef.current.rotation.x) * smooth;
    if (leftArmRef.current) leftArmRef.current.rotation.z += ((walking ? -0.10 : Math.sin(t * 1.1) * 0.025) - leftArmRef.current.rotation.z) * smooth;
    if (rightArmRef.current) rightArmRef.current.rotation.z += ((walking ? 0.10 : -Math.sin(t * 1.1) * 0.025) - rightArmRef.current.rotation.z) * smooth;
    if (leftLegRef.current) leftLegRef.current.rotation.x += (-gait * 0.8 - leftLegRef.current.rotation.x) * smooth;
    if (rightLegRef.current) rightLegRef.current.rotation.x += (gait * 0.8 - rightLegRef.current.rotation.x) * smooth;
    if (headRef.current) {
      const bow = action === "le" ? Math.max(0, Math.sin(t * 1.2)) * 0.4 : 0;
      headRef.current.position.set(0, hy - bow * 0.6 + breath * 0.006, bow);
      headRef.current.rotation.y = Math.sin(t * 0.72) * 0.045;
      headRef.current.rotation.z = Math.sin(t * 1.05) * 0.012;
    }
  });

  return (
    <group ref={g}>
      <mesh ref={robeRef} position={[0, 0, 0]} scale={[sxz, sy, sxz]} castShadow>
        <primitive object={robeGeometry} attach="geometry" />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Waist sash and layered front panels give the robe a tailored, flowing silhouette. */}
      <mesh position={[0, 0.57 * sy, 0]} rotation-x={Math.PI / 2} scale={[sxz, sxz, 1]}>
        <torusGeometry args={[0.245, 0.035, 8, 28]} />
        <meshStandardMaterial color={female ? "#c9a56d" : "#b99a68"} metalness={0.18} roughness={0.62} />
      </mesh>
      <mesh position={[-0.085, 0.58 * sy, 0.255]} rotation-z={-0.10} scale={[0.09, 0.49, 0.025]}>
        <capsuleGeometry args={[0.5, 1, 5, 8]} />
        <meshStandardMaterial color={female ? "#ead8bd" : "#d9c7a8"} roughness={0.8} />
      </mesh>
      <mesh position={[0.085, 0.58 * sy, 0.255]} rotation-z={0.10} scale={[0.09, 0.49, 0.025]}>
        <capsuleGeometry args={[0.5, 1, 5, 8]} />
        <meshStandardMaterial color={female ? "#ead8bd" : "#d9c7a8"} roughness={0.8} />
      </mesh>
      {/* collar sash */}
      <mesh position={[0, 0.98 * sy, 0]} scale={[sxz, 1, sxz]}>
        <torusGeometry args={[0.2, 0.05, 8, 20]} />
        <meshStandardMaterial color="#e9dcc0" />
      </mesh>
      {/* arms: upper arm, forearm and visible hand */}
      <group ref={leftArmRef} position={[-(female ? 0.31 : 0.37) * sxz, 0.91 * sy, 0]}>
        <mesh position={[0, -0.16, 0]} rotation-z={-0.10} castShadow>
          <capsuleGeometry args={[0.082, 0.25, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.39, 0.025]} rotation-z={-0.04} castShadow>
          <capsuleGeometry args={[0.068, 0.20, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.53, 0.06]} castShadow>
          <sphereGeometry args={[0.075, 12, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.75} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[(female ? 0.31 : 0.37) * sxz, 0.91 * sy, 0]}>
        <mesh position={[0, -0.16, 0]} rotation-z={0.10} castShadow>
          <capsuleGeometry args={[0.082, 0.25, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.39, 0.025]} rotation-z={0.04} castShadow>
          <capsuleGeometry args={[0.068, 0.20, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.53, 0.06]} castShadow>
          <sphereGeometry args={[0.075, 12, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.75} />
        </mesh>
      </group>
      {/* separated legs with visible shoes */}
      <group ref={leftLegRef} position={[-(female ? 0.14 : 0.17), 0.43, 0]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.105, 0.25, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.37, 0.025]} castShadow>
          <capsuleGeometry args={[0.085, 0.16, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.49, 0.12]} rotation-x={Math.PI / 2} castShadow>
          <capsuleGeometry args={[0.075, 0.16, 4, 8]} />
          <meshStandardMaterial color="#51463e" roughness={0.95} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[(female ? 0.14 : 0.17), 0.43, 0]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.105, 0.25, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.37, 0.025]} castShadow>
          <capsuleGeometry args={[0.085, 0.16, 5, 10]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.49, 0.12]} rotation-x={Math.PI / 2} castShadow>
          <capsuleGeometry args={[0.075, 0.16, 4, 8]} />
          <meshStandardMaterial color="#51463e" roughness={0.95} />
        </mesh>
      </group>
      <group ref={headRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.24, 20, 16]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        {/* eyes (closed in meditation) */}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.22]} scale={[1, action === "thien" ? 0.25 : 1, 1]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#2a1a12" />
          </mesh>
        ))}
        {hair !== "troc" && (
          <mesh position={[0, 0.05, -0.01]} scale={hair === "dai" ? [1.04, 1.25, 1.08] : hair === "bui" ? [1, 1.18, 1] : [1, 1, 1]}>
            <sphereGeometry args={[0.258, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} roughness={0.88} />
          </mesh>
        )}
        {hair === "dai" && (
          <group>
            <mesh position={[0, -0.16, -0.12]} scale={[0.78, 1.75, 0.55]}>
              <sphereGeometry args={[0.19, 16, 12]} />
              <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} roughness={0.9} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.19, -0.08, 0.02]} rotation-z={side * -0.08}>
                <capsuleGeometry args={[0.055, 0.34, 5, 8]} />
                <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} roughness={0.9} />
              </mesh>
            ))}
          </group>
        )}
        {hair === "ngan" && !female && (
          <group>
            <mesh position={[0, 0.13, -0.015]} scale={[1.02, 0.6, 1.02]}>
              <sphereGeometry args={[0.245, 18, 12]} />
              <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} />
            </mesh>
            {/* A swept fringe and tapered side hair create a clearly masculine haircut. */}
            <mesh position={[0, 0.205, 0.155]} rotation-x={-0.24} scale={[0.76, 0.34, 0.48]}>
              <sphereGeometry args={[0.16, 16, 10]} />
              <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} roughness={0.82} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.215, -0.015, 0.015]} rotation-z={side * -0.08}>
                <capsuleGeometry args={[0.045, 0.12, 5, 8]} />
                <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} />
              </mesh>
            ))}
          </group>
        )}
        {/* Female styles get soft face-framing locks and a curved fringe, distinct from the men's cut. */}
        {female && hair !== "troc" && (
          <group>
            <mesh position={[0, 0.105, 0.19]} rotation-x={-0.18} scale={[0.92, 0.28, 0.42]}>
              <sphereGeometry args={[0.16, 18, 12]} />
              <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} roughness={0.9} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.205, -0.13, 0.115]} rotation-z={side * -0.12}>
                <capsuleGeometry args={[0.052, hair === "dai" ? 0.48 : 0.25, 6, 10]} />
                <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} roughness={0.9} />
              </mesh>
            ))}
          </group>
        )}
        {hair === "bui" && (
          <group>
          <mesh position={[0, 0.2, -0.18]}>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} />
          </mesh>
          <mesh position={[0, 0.29, -0.18]}>
            <torusGeometry args={[0.105, 0.018, 6, 18]} />
            <meshStandardMaterial color={female ? "#d7b36b" : "#8c7554"} metalness={0.35} roughness={0.45} />
          </mesh>
          </group>
        )}
        {/* Soft, balanced facial features for a more expressive human face. */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.085, 0.035, 0.213]} scale={[1, 0.72, 0.55]}>
              <sphereGeometry args={[0.035, 12, 10]} />
              <meshStandardMaterial color="#fff8ed" />
            </mesh>
            <mesh position={[side * 0.085, 0.035, 0.242]} scale={[0.72, 0.9, 0.5]}>
              <sphereGeometry args={[0.021, 10, 8]} />
              <meshStandardMaterial color="#302019" />
            </mesh>
            <mesh position={[side * 0.085, 0.092, 0.205]} rotation-z={side * -0.12} scale={[1, female ? 0.72 : 1.18, 1]}>
              <capsuleGeometry args={[0.012, 0.055, 3, 6]} />
              <meshStandardMaterial color="#39251d" />
            </mesh>
            {female && (
              <mesh position={[side * 0.09, -0.005, 0.205]} scale={[1.1, 0.48, 0.25]}>
                <sphereGeometry args={[0.035, 10, 8]} />
                <meshStandardMaterial color="#e9a6a0" transparent opacity={0.28} />
              </mesh>
            )}
          </group>
        ))}
        <mesh position={[0, -0.015, 0.238]} rotation-x={0.18}>
          <coneGeometry args={[0.035, 0.085, 8]} />
          <meshStandardMaterial color="#d8a98c" roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.105, 0.222]} scale={[1, 0.45, 0.45]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#a85f5b" roughness={0.8} />
        </mesh>
      </group>
      {/* Prayer hands are positioned clearly in front of the chest. */}
      {handsJoined && (
        <group position={[0, hy - 0.40, 0.30]} rotation-x={-0.18}>
          <mesh rotation-z={0.04}>
            <capsuleGeometry args={[0.055, 0.19, 5, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
          <mesh position={[0.075, -0.015, 0]}>
            <capsuleGeometry args={[0.045, 0.15, 5, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
        </group>
      )}
      <Html position={[0, hy + 0.6, 0]} center distanceFactor={14} zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div className="name-tag name-tag-self">{avatar?.name ?? "Phật tử"}</div>
      </Html>
    </group>
  );
}
