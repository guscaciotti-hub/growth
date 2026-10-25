"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Analysis } from "@/lib/types";
import { hash } from "./layout";

/** Ameaças viram nuvens cinzas pairando na borda da cidade. */
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
  const y = 19 + severity * 1.2;
  const scale = 0.55 + severity * 0.17;
  useFrame((st) => {
    if (!ref.current) return;
    const t = st.clock.elapsedTime;
    const a = a0 + t * 0.012;
    ref.current.position.set(Math.cos(a) * r, y + Math.sin(t * 0.5 + index) * 0.4, Math.sin(a) * r);
  });
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 1.6],
    [1.4, 0.3, 0.4, 1.2],
    [-1.3, 0.2, -0.3, 1.25],
    [0.5, 0.7, -0.9, 1.0],
    [-0.4, 0.6, 0.9, 1.05],
  ];
  const col = severity >= 4 ? "#aeb3bf" : "#cfd3dc";
  const tone = severity >= 4 ? "#e11d48" : "#6b7280";
  return (
    <group ref={ref} scale={scale}>
      {puffs.map(([x, yy, z, s], i) => (
        <mesh key={i} position={[x, yy, z]} castShadow>
          <icosahedronGeometry args={[s, 1]} />
          <meshStandardMaterial color={col} transparent opacity={0.55 + probability * 0.08} roughness={1} flatShading />
        </mesh>
      ))}
      <Html position={[0, -2.4, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <div className="city-tag" style={{ color: tone, borderColor: tone }}>⚠ {title} · {severity}/5</div>
      </Html>
    </group>
  );
}
