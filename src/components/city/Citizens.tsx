"use client";
import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Decision, Persona, SimResult } from "@/lib/types";
import { useProject } from "@/store/useProject";
import { brl } from "@/lib/format";
import { CITY, hash, homeFor, type District } from "./layout";

type Agent = {
  idx: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  home: [number, number];
  speed: number;
  wanderT: number;
  decision: Decision | null;
  arrived: boolean;
  bob: number;
};

const dummy = new THREE.Object3D();
const colorTmp = new THREE.Color();
const DECISION_COLOR: Record<Decision, string> = { compra: "#34d399", depois: "#fbbf24", nao_compra: "#fb7185" };

export function Citizens({ personas, results, districts, onPositions }: { personas: Persona[]; results: SimResult[]; districts: District[]; onPositions: (get: (idx: number) => [number, number] | null) => void }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const hairs = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const agents = useRef<Agent[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [coins, setCoins] = useState<{ id: number; x: number; z: number; v: number; t: number }[]>([]);
  const coinId = useRef(0);
  const selected = useProject((s) => s.selectedPersonaIdx);
  const selectPersona = useProject((s) => s.selectPersona);
  const count = personas.length;

  const decisions = useMemo(() => {
    const m = new Map<number, SimResult>();
    for (const r of results) m.set(r.persona_idx, r);
    return m;
  }, [results]);

  // (re)inicializa agentes quando a lista de personas muda
  useEffect(() => {
    const prev = new Map(agents.current.map((a) => [a.idx, a]));
    agents.current = personas.map((p) => {
      const home = homeFor(p, districts);
      const old = prev.get(p.idx);
      return (
        old ?? {
          idx: p.idx,
          x: home[0] + (hash(p.idx, 5) - 0.5) * 2,
          z: home[1] + (hash(p.idx, 6) - 0.5) * 2,
          tx: home[0],
          tz: home[1],
          home,
          speed: 1.6 + hash(p.idx, 7) * 1.4,
          wanderT: hash(p.idx, 8) * 3,
          decision: null,
          arrived: false,
          bob: hash(p.idx, 9) * Math.PI * 2,
        }
      );
    });
    // cores
    if (bodies.current && heads.current && hairs.current) {
      personas.forEach((p, i) => {
        bodies.current!.setColorAt(i, colorTmp.set(safeColor(p.avatar.shirt, "#64748b")));
        heads.current!.setColorAt(i, colorTmp.set(safeColor(p.avatar.skin, "#e0ac69")));
        hairs.current!.setColorAt(i, colorTmp.set(safeColor(p.avatar.hair, "#1c1917")));
      });
      for (const m of [bodies, heads, hairs]) if (m.current?.instanceColor) m.current.instanceColor.needsUpdate = true;
    }
    onPositions((idx) => {
      const a = agents.current.find((x) => x.idx === idx);
      return a ? [a.x, a.z] : null;
    });
  }, [personas, districts, onPositions]);

  // aplica decisões novas → novos destinos
  useEffect(() => {
    for (const a of agents.current) {
      const r = decisions.get(a.idx);
      const d = r?.decision ?? null;
      if (d !== a.decision) {
        a.decision = d;
        a.arrived = false;
        const ang = hash(a.idx, 11) * Math.PI * 2;
        if (d === "compra") {
          const rr = CITY.buyRadius[0] + hash(a.idx, 12) * (CITY.buyRadius[1] - CITY.buyRadius[0]);
          a.tx = Math.cos(ang) * rr;
          a.tz = Math.sin(ang) * rr;
        } else if (d === "depois") {
          const rr = CITY.laterRadius[0] + hash(a.idx, 12) * (CITY.laterRadius[1] - CITY.laterRadius[0]);
          a.tx = Math.cos(ang) * rr;
          a.tz = Math.sin(ang) * rr;
        } else if (d === "nao_compra") {
          const dir = Math.atan2(a.home[1], a.home[0]) + (hash(a.idx, 13) - 0.5) * 0.8;
          const rr = CITY.edgeRadius - 2 + hash(a.idx, 14) * 5;
          a.tx = Math.cos(dir) * rr;
          a.tz = Math.sin(dir) * rr;
        } else {
          a.tx = a.home[0];
          a.tz = a.home[1];
        }
      }
    }
    if (rings.current) {
      agents.current.forEach((a, i) => {
        rings.current!.setColorAt(i, colorTmp.set(a.decision ? DECISION_COLOR[a.decision] : "#000000"));
      });
      if (rings.current.instanceColor) rings.current.instanceColor.needsUpdate = true;
    }
  }, [decisions, count]);

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    const list = agents.current;
    const arrivals: Agent[] = [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      // perambula pelo bairro quando não decidiu
      if (!a.decision) {
        a.wanderT -= dt;
        if (a.wanderT <= 0) {
          a.wanderT = 2 + Math.random() * 4;
          const d = districts.find((x) => x.name === personas[i]?.segment) ?? districts[0];
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.sqrt(Math.random()) * (d?.radius ?? 4) * 0.9;
          a.tx = (d?.cx ?? 0) + Math.cos(ang) * rad;
          a.tz = (d?.cz ?? 0) + Math.sin(ang) * rad;
        }
      } else if (a.decision === "depois" && a.arrived) {
        // orbita indeciso ao redor da sede
        const ang = Math.atan2(a.z, a.x) + dt * 0.08;
        const rr = Math.hypot(a.x, a.z);
        a.tx = Math.cos(ang) * rr;
        a.tz = Math.sin(ang) * rr;
      }
      const dx = a.tx - a.x;
      const dz = a.tz - a.z;
      const dist = Math.hypot(dx, dz);
      const moving = dist > 0.08;
      if (moving) {
        const step = Math.min(dist, a.speed * dt * (a.decision ? 1.6 : 0.7));
        a.x += (dx / dist) * step;
        a.z += (dz / dist) * step;
      } else if (a.decision && !a.arrived) {
        a.arrived = true;
        if (a.decision === "compra") arrivals.push(a);
      }
      const bob = moving ? Math.abs(Math.sin(t * 9 + a.bob)) * 0.12 : Math.sin(t * 2 + a.bob) * 0.02;
      const face = moving ? Math.atan2(dx, dz) : a.bob;
      const sel = selected === a.idx;
      const s = sel ? 1.25 : 1;
      // corpo
      dummy.position.set(a.x, 0.45 + bob, a.z);
      dummy.rotation.set(0, face, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      bodies.current?.setMatrixAt(i, dummy.matrix);
      // cabeça
      dummy.position.set(a.x, 1.05 * s + bob, a.z);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      heads.current?.setMatrixAt(i, dummy.matrix);
      // cabelo
      dummy.position.set(a.x, 1.18 * s + bob, a.z);
      dummy.scale.set(s, s * 0.6, s);
      dummy.updateMatrix();
      hairs.current?.setMatrixAt(i, dummy.matrix);
      // anel de decisão
      const rs = a.decision ? (sel ? 1.6 : 1) + Math.sin(t * 3 + a.bob) * 0.05 : 0.0001;
      dummy.position.set(a.x, 0.03, a.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(rs, rs, rs);
      dummy.updateMatrix();
      rings.current?.setMatrixAt(i, dummy.matrix);
    }
    for (const m of [bodies, heads, hairs, rings]) if (m.current) m.current.instanceMatrix.needsUpdate = true;
    if (arrivals.length) {
      setCoins((c) => [
        ...c.slice(-12),
        ...arrivals.map((a) => ({ id: ++coinId.current, x: a.x, z: a.z, v: decisions.get(a.idx)?.willingness_to_pay_brl ?? 0, t: performance.now() })),
      ]);
    }
  });

  // limpa moedas antigas
  useEffect(() => {
    if (!coins.length) return;
    const id = setTimeout(() => setCoins((c) => c.filter((x) => performance.now() - x.t < 2000)), 2100);
    return () => clearTimeout(id);
  }, [coins]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i === undefined) return;
    const p = personas[i];
    if (p) selectPersona(selected === p.idx ? null : p.idx);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) setHover(e.instanceId);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    setHover(null);
    document.body.style.cursor = "";
  };

  const hovered = hover !== null ? personas[hover] : null;
  const hoveredAgent = hover !== null ? agents.current[hover] : null;

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, Math.max(1, count)]} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} frustumCulled={false} castShadow>
        <capsuleGeometry args={[0.22, 0.45, 4, 10]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, Math.max(1, count)]} frustumCulled={false}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={hairs} args={[undefined, undefined, Math.max(1, count)]} frustumCulled={false}>
        <sphereGeometry args={[0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={rings} args={[undefined, undefined, Math.max(1, count)]} frustumCulled={false}>
        <ringGeometry args={[0.32, 0.46, 24]} />
        <meshBasicMaterial transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>

      {hovered && hoveredAgent && (
        <Html position={[hoveredAgent.x, 1.9, hoveredAgent.z]} center distanceFactor={18} zIndexRange={[40, 30]} style={{ pointerEvents: "none" }}>
          <div className="glass whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px]">
            <div className="font-semibold text-fg">{hovered.name}, {hovered.age}</div>
            <div className="text-muted">{hovered.occupation} · {hovered.segment}</div>
            {decisions.get(hovered.idx) && (
              <div className="mt-0.5 font-medium" style={{ color: DECISION_COLOR[decisions.get(hovered.idx)!.decision] }}>
                {labelFor(decisions.get(hovered.idx)!.decision)}
              </div>
            )}
          </div>
        </Html>
      )}

      {coins.map((c) => (
        <Html key={c.id} position={[c.x, 1.6, c.z]} center distanceFactor={20} zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
          <div className="coin-pop rounded-full bg-buy/90 px-2 py-0.5 text-[11px] font-bold text-[#06111c] num shadow-[0_0_14px_rgba(52,211,153,.8)]">+{brl(c.v)}</div>
        </Html>
      ))}
    </group>
  );
}

function labelFor(d: Decision) {
  return d === "compra" ? "Comprou" : d === "depois" ? "Vai pensar" : "Não comprou";
}

function safeColor(c: string | undefined, fallback: string) {
  return c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : fallback;
}
