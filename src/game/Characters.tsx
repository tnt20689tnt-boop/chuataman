import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HAIR_COLORS, OUTFIT_COLORS, makeCrowd, walkerPos, type Npc, type Pose } from "./sim";
import { player, useUI } from "./store";

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
  const head = useRef<THREE.InstancedMesh>(null);
  const hair = useRef<THREE.InstancedMesh>(null);
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
    tmp.position.set(x, 0.55 * sy, z);
    tmp.rotation.set(0, rot, 0);
    tmp.scale.set(sxz, sy, sxz);
    tmp.updateMatrix();
    body.current!.setMatrixAt(n.id, tmp.matrix);
    const bob = n.pose === "walk" ? Math.abs(Math.sin(t * 6 + n.phase)) * 0.05 : 0;
    tmp.position.set(x + fx * bow, hy - bow * 0.6 + bob, z + fz * bow);
    tmp.scale.setScalar(1);
    tmp.updateMatrix();
    head.current!.setMatrixAt(n.id, tmp.matrix);
    if (n.hair === "troc") tmp.scale.setScalar(0);
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
      c.set(HAIR_COLORS[i % HAIR_COLORS.length]);
      hair.current!.setColorAt(i, c);
    });
    [body, head, hair].forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
      r.current!.computeBoundingSphere();
    });
    body.current!.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -11), 60);
    head.current!.boundingSphere = body.current!.boundingSphere;
    hair.current!.boundingSphere = body.current!.boundingSphere;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcs]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const n of walkers) {
      const p = walkerPos(n, t);
      n.x = p.x;
      n.z = p.z;
      place(n, p.x, p.z, p.rot, t);
    }
    for (const n of npcs) if (n.pose === "kneel") place(n, n.x, n.z, n.rot, t);
    body.current!.instanceMatrix.needsUpdate = true;
    head.current!.instanceMatrix.needsUpdate = true;
    hair.current!.instanceMatrix.needsUpdate = true;
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
        <cylinderGeometry args={[0.22, 0.42, 1.1, 10]} />
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
  const headRef = useRef<THREE.Group>(null);
  const [sy, sxz, hy] = layout(pose);
  const color = OUTFIT_COLORS[avatar?.outfit ?? "lam"];
  const hair = avatar?.hair ?? "ngan";
  const handsJoined = action === "chap" || action === "le" || action === "thien" || action === "kinh";

  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.position.set(player.x, 0, player.z);
    g.current.rotation.y = player.rot;
    if (headRef.current) {
      const t = clock.elapsedTime;
      const bow = action === "le" ? Math.max(0, Math.sin(t * 1.2)) * 0.4 : 0;
      headRef.current.position.set(0, hy - bow * 0.6, bow);
    }
  });

  return (
    <group ref={g}>
      <mesh position={[0, 0.55 * sy, 0]} scale={[sxz, sy, sxz]} castShadow>
        <cylinderGeometry args={[0.22, 0.42, 1.1, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* collar sash */}
      <mesh position={[0, 1.05 * sy, 0]} scale={[sxz, 1, sxz]}>
        <torusGeometry args={[0.2, 0.05, 8, 20]} />
        <meshStandardMaterial color="#e9dcc0" />
      </mesh>
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
          <mesh position={[0, 0.05, -0.01]} scale={hair === "dai" ? [1.05, 1.5, 1.08] : [1, 1, 1]}>
            <sphereGeometry args={[0.258, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} />
          </mesh>
        )}
        {hair === "bui" && (
          <mesh position={[0, 0.2, -0.18]}>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshStandardMaterial color={avatar?.hairColor ?? HAIR_COLORS[0]} />
          </mesh>
        )}
      </group>
      {/* hands */}
      {handsJoined ? (
        <mesh position={[0, hy - 0.42, 0.3]} rotation-x={-0.2}>
          <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      ) : (
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.36 * sxz, hy - 0.75, 0.05]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        ))
      )}
      <Html position={[0, hy + 0.6, 0]} center distanceFactor={14} zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div className="name-tag name-tag-self">{avatar?.name ?? "Phật tử"}</div>
      </Html>
    </group>
  );
}
