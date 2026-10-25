"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Analysis } from "@/lib/types";
import { hash } from "./layout";

/** Ameaças viram nuvens de tempestade pairando sobre a cidade. */
export function ThreatClouds({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) return null;
  return (
    <group>
      {analysis.threats.slice(0, 7).map((t, i) => (
        <Cloud key={`${t.title}-${i}`} index={i} total={Math.min(7, analysis.threats.length)} severity={t.severity} probability={t.probability} title={t.title} />
      ))}
    </group>
  );
}

function Cloud({ index, total, severity, probability, title }: { index: number; total: number; severity: number; probability: number; title: string }) {
  const ref = useRef<THREE.Group>(null);
  const a0 = (index / total) * Math.PI * 2 + 0.9;
  const r = 27 + hash(index, 9) * 6;
  const y = 15 + severity * 1.1;
  const scale = 0.9 + severity * 0.35;
  const opacity = 0.25 + probability * 0.1;
  const flicker = useRef(0);
  useFrame((st) => {
    if (!ref.current) return;
    const t = st.clock.elapsedTime;
    const a = a0 + t * 0.012;
    ref.current.position.set(Math.cos(a) * r, y + Math.sin(t * 0.5 + index) * 0.4, Math.sin(a) * r);
    flicker.current = severity >= 4 && Math.sin(t * 9 + index * 3) > 0.97 ? 1 : 0;
    ref.current.children.forEach((c) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "emissiveIntensity" in m) m.emissiveIntensity = flicker.current ? 2 : 0;
    });
  });
  const puffs = [
    [0, 0, 0, 1.6],
    [1.4, 0.3, 0.4, 1.2],
    [-1.3, 0.2, -0.3, 1.25],
    [0.5, 0.7, -0.9, 1.0],
    [-0.4, 0.6, 0.9, 1.05],
  ];
  const col = severity >= 4 ? "#1f1530" : "#1c2438";
  return (
    <group ref={ref} scale={scale}>
      {puffs.map(([x, yy, z, s], i) => (
        <mesh key={i} position={[x, yy, z]}>
          <sphereGeometry args={[s, 14, 12]} />
          <meshStandardMaterial color={col} transparent opacity={opacity} roughness={1} emissive="#c4b5fd" emissiveIntensity={0} />
        </mesh>
      ))}
      <Html position={[0, -1.8, 0]} center distanceFactor={44} zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md px-2 py-0.5 text-[10px]" style={{ background: "rgba(6,10,19,.7)", color: severity >= 4 ? "#fb7185" : "#c4b5fd", border: "1px solid rgba(196,181,253,.3)" }}>
          ⚠ {title} · {severity}/5
        </div>
      </Html>
    </group>
  );
}
