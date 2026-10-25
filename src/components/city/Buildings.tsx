"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Analysis, Project } from "@/lib/types";
import { CITY, competitorPos } from "./layout";

const dummy = new THREE.Object3D();

/** Sede do negócio: cresce com o score, janelas acendem conforme a viabilidade. */
export function Headquarters({ project, analysis, score, pulse }: { project: Project; analysis: Analysis | null; score: number | null; pulse: boolean }) {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const targetH = analysis ? 5 + ((score ?? 40) / 100) * 13 : 0.6;
  const cur = useRef(0.6);
  const s = CITY.hqSize;

  const winData = useMemo(() => {
    const items: { pos: [number, number, number]; rot: number; lit: number }[] = [];
    const rows = 18;
    const cols = 6;
    for (let f = 0; f < 4; f++) {
      const rot = (f * Math.PI) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c - (cols - 1) / 2) * (s / cols) * 0.9;
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
    const t = state.clock.elapsedTime;
    if (glow.current) {
      const base = analysis ? 2 + ((score ?? 40) / 100) * 6 : 0.4;
      glow.current.intensity = base + (pulse ? Math.sin(t * 6) * 1.2 + 1.2 : Math.sin(t * 1.5) * 0.3);
    }
    if (windows.current) {
      const litRatio = analysis ? 0.15 + ((score ?? 40) / 100) * 0.55 : 0;
      winData.forEach((w, i) => {
        const visible = w.pos[1] < h - 0.4;
        const lit = visible && w.lit / 10 < litRatio;
        dummy.position.set(w.pos[0], visible ? w.pos[1] : -5, w.pos[2]);
        dummy.rotation.set(0, w.rot, 0);
        dummy.scale.setScalar(lit ? 1 : 0.0001);
        dummy.updateMatrix();
        windows.current!.setMatrixAt(i, dummy.matrix);
      });
      windows.current.instanceMatrix.needsUpdate = true;
    }
  });

  const color = score === null ? "#334155" : score < 35 ? "#7f1d1d" : score < 55 ? "#78350f" : score < 75 ? "#1e3a5f" : "#064e3b";

  return (
    <group>
      {/* base */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[s + 1.6, 0.4, s + 1.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* torre (escala Y animada) */}
      <group ref={group} position={[0, 0.4, 0]}>
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[s, 10, s]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.25} />
        </mesh>
        <mesh position={[0, 10.05, 0]}>
          <boxGeometry args={[s + 0.3, 0.1, s + 0.3]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={analysis ? 1.6 : 0.2} toneMapped={false} />
        </mesh>
      </group>
      <instancedMesh ref={windows} args={[undefined, undefined, winData.length]}>
        <planeGeometry args={[0.34, 0.42]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.15} toneMapped={false} side={THREE.DoubleSide} />
      </instancedMesh>
      <pointLight ref={glow} position={[0, targetH + 2, 0]} color={analysis ? "#7dd3fc" : "#94a3b8"} distance={30} decay={1.6} />

      {!analysis && <ConstructionSite />}

      <Html position={[0, targetH + 2.4, 0]} center distanceFactor={22} zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-1">
          <div className="glass rounded-xl px-3 py-1.5 text-center">
            <div className="text-[13px] font-semibold text-fg whitespace-nowrap">{project.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted">{analysis ? "Sede inaugurada" : "Terreno em análise"}</div>
          </div>
          {score !== null && (
            <div className="rounded-full px-2.5 py-0.5 text-[11px] font-bold num" style={{ background: scoreColor(score), color: "#06111c" }}>
              {score}/100
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function scoreColor(s: number) {
  return s < 35 ? "#fb7185" : s < 55 ? "#fbbf24" : s < 75 ? "#38bdf8" : "#34d399";
}

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
        <mesh position={[0, 4, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[-2.2, 8, 0]}>
          <boxGeometry args={[6, 0.18, 0.18]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[-4.5, 6.4, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 3.2]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[-4.5, 4.6, 0]}>
          <boxGeometry args={[0.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>
    </group>
  );
}

/** Concorrentes: prédios ao redor, altura = força, cor = nível de ameaça. */
export function Competitors({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) return null;
  const n = analysis.competitors.length;
  return (
    <group>
      {analysis.competitors.map((c, i) => {
        const [x, z] = competitorPos(i, n);
        const h = 1.6 + c.strength * 1.7;
        const w = 2.2 + (c.type === "direto" ? 1 : 0.4);
        const col = c.threat_level >= 4 ? "#7f1d1d" : c.threat_level === 3 ? "#5b2a86" : "#1f2a44";
        const edge = c.threat_level >= 4 ? "#fb7185" : c.threat_level === 3 ? "#c084fc" : "#64748b";
        return (
          <group key={`${c.name}-${i}`} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, h, w]} />
              <meshStandardMaterial color={col} roughness={0.7} metalness={0.15} />
            </mesh>
            <mesh position={[0, h + 0.04, 0]}>
              <boxGeometry args={[w + 0.15, 0.08, w + 0.15]} />
              <meshStandardMaterial color={edge} emissive={edge} emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
            <Html position={[0, h + 1.1, 0]} center distanceFactor={26} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap rounded-md px-2 py-0.5 text-[10px]" style={{ background: "rgba(6,10,19,.75)", color: edge, border: `1px solid ${edge}66` }}>
                {c.name} <span className="opacity-70">· {c.type}</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
