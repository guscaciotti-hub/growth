"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const VANS = [
  { color: "#f6a28a", r: 10.6, speed: 0.22, phase: 0 },
  { color: "#8db9f2", r: 10.6, speed: 0.22, phase: 2.1 },
  { color: "#f7c76b", r: 10.6, speed: 0.22, phase: 4.2 },
];

/** Vans circulando no anel viário: vida na maquete. */
export function Vehicles({ active }: { active: boolean }) {
  return (
    <group>
      {VANS.map((v, i) => (
        <Van key={i} {...v} active={active} />
      ))}
      <Avenue active={active} />
    </group>
  );
}

function Van({ color, r, speed, phase, active }: { color: string; r: number; speed: number; phase: number; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!ref.current) return;
    const a = phase + st.clock.elapsedTime * speed * (active ? 1.6 : 1);
    ref.current.position.set(Math.cos(a) * r, 0.32, Math.sin(a) * r);
    ref.current.rotation.y = -a;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.6, 1.5]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.72, -0.1]} castShadow>
        <boxGeometry args={[0.72, 0.3, 0.9]} />
        <meshStandardMaterial color="#f9fafb" roughness={0.7} />
      </mesh>
      {[-0.42, 0.42].map((x) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 10]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Avenue({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!ref.current) return;
    const t = (st.clock.elapsedTime * (active ? 4 : 2.6)) % 70;
    ref.current.position.set(0.9, 0.32, 36 - t);
  });
  return (
    <group ref={ref} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.7, 0.5, 1.2]} />
        <meshStandardMaterial color="#b7a3f0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.6, 0.1]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.6]} />
        <meshStandardMaterial color="#f9fafb" roughness={0.7} />
      </mesh>
    </group>
  );
}
