"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Analysis, Project } from "@/lib/types";
import { CITY, competitorPos } from "./layout";

const dummy = new THREE.Object3D();

export function scoreColor(s: number) {
  return s < 35 ? "#e11d48" : s < 55 ? "#d97706" : s < 75 ? "#0284c7" : "#16a34a";
}

/** Sede: prédio pastel que cresce com o score, com painéis solares no telhado e janelas que acendem. */
export function Headquarters({ project, analysis, score, pulse }: { project: Project; analysis: Analysis | null; score: number | null; pulse: boolean }) {
  const group = useRef<THREE.Group>(null);
  const roof = useRef<THREE.Group>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const targetH = analysis ? 4 + ((score ?? 40) / 100) * 12 : 0.5;
  const cur = useRef(0.5);
  const s = CITY.hqSize;

  const winData = useMemo(() => {
    const items: { pos: [number, number, number]; rot: number; lit: number }[] = [];
    const rows = 16, cols = 5;
    for (let f = 0; f < 4; f++) {
      const rot = (f * Math.PI) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c - (cols - 1) / 2) * (s / cols) * 0.86;
          const y = 0.9 + r * 0.95;
          const px = f % 2 === 0 ? x : (f === 1 ? 1 : -1) * (s / 2 + 0.01);
          const pz = f % 2 === 0 ? (f === 0 ? 1 : -1) * (s / 2 + 0.01) : x;
          items.push({ pos: [px, y, pz], rot, lit: (r * 7 + c * 13 + f * 3) % 10 });
        }
      }
    }
    return items;
  }, [s]);

  useFrame((state, dt) => {
    cur.current += (targetH - cur.current) * Math.min(1, dt * 2.2);
    const h = cur.current;
    if (group.current) group.current.scale.set(1, h / 10, 1);
    if (roof.current) roof.current.position.y = 0.4 + h + 0.05;
    const t = state.clock.elapsedTime;
    if (windows.current) {
      const litRatio = analysis ? 0.2 + ((score ?? 40) / 100) * 0.6 : 0;
      const flicker = pulse ? (Math.sin(t * 6) + 1) * 0.08 : 0;
      winData.forEach((w, i) => {
        const visible = w.pos[1] < h - 0.4;
        const lit = visible && w.lit / 10 < litRatio + flicker;
        dummy.position.set(w.pos[0], visible ? w.pos[1] : -5, w.pos[2]);
        dummy.rotation.set(0, w.rot, 0);
        dummy.scale.setScalar(visible ? 1 : 0.0001);
        dummy.updateMatrix();
        windows.current!.setMatrixAt(i, dummy.matrix);
        windows.current!.setColorAt(i, colorTmp.set(lit ? "#fde68a" : "#9fb4d8"));
      });
      windows.current.instanceMatrix.needsUpdate = true;
      if (windows.current.instanceColor) windows.current.instanceColor.needsUpdate = true;
    }
  });

  const body = score === null ? "#c9d2e3" : score < 35 ? "#f3a3b5" : score < 55 ? "#f6c98b" : score < 75 ? "#8db9f2" : "#8fd3a9";

  return (
    <group>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[s + 1.8, 0.4, s + 1.8]} />
        <meshStandardMaterial color="#f4f3ee" roughness={0.9} />
      </mesh>
      <group ref={group} position={[0, 0.4, 0]}>
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[s, 10, s]} />
          <meshStandardMaterial color={body} roughness={0.85} />
        </mesh>
      </group>
      <instancedMesh ref={windows} args={[undefined, undefined, winData.length]}>
        <planeGeometry args={[0.4, 0.46]} />
        <meshStandardMaterial roughness={0.5} side={THREE.DoubleSide} />
      </instancedMesh>
      {/* telhado com painéis solares e caixa d'água */}
      <group ref={roof} position={[0, targetH + 0.45, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[s + 0.3, 0.2, s + 0.3]} />
          <meshStandardMaterial color="#e8e6df" roughness={0.9} />
        </mesh>
        {analysis &&
          [-1, 0, 1].flatMap((i) =>
            [-1, 1].map((j) => (
              <mesh key={`${i}${j}`} position={[i * 1.6, 0.42, j * 1.3]} rotation={[-0.35, 0, 0]} castShadow>
                <boxGeometry args={[1.35, 0.08, 1.0]} />
                <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.4} />
              </mesh>
            )),
          )}
        <mesh position={[-2.2, 0.55, 2.2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.8, 12]} />
          <meshStandardMaterial color="#f9fafb" roughness={0.8} />
        </mesh>
      </group>

      {!analysis && <ConstructionSite />}

      <Html position={[0, targetH + 2.6, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-1">
          <div className="card-float px-3 py-1.5 text-center">
            <div className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "#111827" }}>{project.name}</div>
            <div className="text-[9px] uppercase tracking-widest" style={{ color: "#6b7280" }}>{analysis ? "Sede inaugurada" : "Terreno em análise"}</div>
          </div>
          {score !== null && (
            <div className="rounded-full px-2.5 py-0.5 text-[11px] font-bold num text-white" style={{ background: scoreColor(score) }}>
              {score}/100
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

const colorTmp = new THREE.Color();

function ConstructionSite() {
  const crane = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (crane.current) crane.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.4) * 0.8;
  });
  return (
    <group>
      {[-2.4, 2.4].map((x) =>
        [-2.4, 2.4].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 2.2, z]}>
            <boxGeometry args={[0.18, 4.4, 0.18]} />
            <meshStandardMaterial color="#f59e0b" wireframe />
          </mesh>
        )),
      )}
      <group ref={crane} position={[4.6, 0, 4.6]}>
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 8, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[-2.2, 8, 0]} castShadow>
          <boxGeometry args={[6, 0.18, 0.18]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[-4.5, 6.4, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 3.2]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
        <mesh position={[-4.5, 4.6, 0]} castShadow>
          <boxGeometry args={[0.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      </group>
    </group>
  );
}

const PASTEL = ["#f6a28a", "#b7a3f0", "#8fd3a9", "#f7c76b", "#8db9f2", "#f3a3b5"];

/** Concorrentes: prédios pastel ao redor, altura = força, selo colorido = ameaça. */
export function Competitors({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) return null;
  const n = analysis.competitors.length;
  return (
    <group>
      {analysis.competitors.map((c, i) => {
        const [x, z] = competitorPos(i, n);
        const h = 1.4 + c.strength * 1.5;
        const w = 2.2 + (c.type === "direto" ? 1 : 0.4);
        const col = PASTEL[i % PASTEL.length];
        const threat = c.threat_level >= 4 ? "#e11d48" : c.threat_level === 3 ? "#d97706" : "#6b7280";
        return (
          <group key={`${c.name}-${i}`} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, h, w]} />
              <meshStandardMaterial color={col} roughness={0.85} />
            </mesh>
            <mesh position={[0, h + 0.1, 0]} castShadow>
              <boxGeometry args={[w + 0.25, 0.2, w + 0.25]} />
              <meshStandardMaterial color="#f4f3ee" roughness={0.9} />
            </mesh>
            {c.type === "direto" && (
              <mesh position={[0, h + 0.55, 0]} castShadow>
                <boxGeometry args={[w * 0.5, 0.7, w * 0.5]} />
                <meshStandardMaterial color="#e8e6df" roughness={0.9} />
              </mesh>
            )}
            <Html position={[0, h + 1.5, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
              <div className="city-tag" style={{ color: "#1f2937", borderColor: threat }}>
                <span className="dot" style={{ background: threat }} /> {c.name} <span style={{ color: "#6b7280" }}>· {c.type}</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
