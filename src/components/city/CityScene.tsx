"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, SoftShadows } from "@react-three/drei";
import { Suspense, useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useProject, useActiveRun } from "@/store/useProject";
import { blendedScore } from "@/lib/metrics";
import { Ground } from "./Ground";
import { Headquarters, Competitors } from "./Buildings";
import { ThreatClouds } from "./Weather";
import { Citizens } from "./Citizens";
import { Vehicles } from "./Vehicles";
import { districtsFor } from "./layout";

export default function CityScene() {
  const bundle = useProject((s) => s.bundle);
  const phase = useProject((s) => s.phase);
  const run = useActiveRun();
  const posRef = useRef<(idx: number) => [number, number] | null>(() => null);
  const onPositions = useCallback((fn: (idx: number) => [number, number] | null) => {
    posRef.current = fn;
  }, []);

  const analysis = bundle?.analysis?.data ?? null;
  const personas = bundle?.personas ?? [];
  const districts = useMemo(() => districtsFor(analysis, personas), [analysis, personas]);
  const score = analysis ? blendedScore(analysis.verdict.success_score, run?.summary?.success_score_after ?? null) : null;

  if (!bundle) return null;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      camera={{ position: ISO.overview.pos, fov: 22, near: 1, far: 500 }}
      onPointerMissed={() => useProject.getState().selectPersona(null)}
    >
      <color attach="background" args={["#f1f0ea"]} />
      <fog attach="fog" args={["#f1f0ea", 140, 300]} />
      <SoftShadows size={18} samples={12} focus={0.6} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#cfe4c3", 0.6]} />
      <directionalLight position={[26, 40, 18]} intensity={1.6} color="#fff4e0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} shadow-bias={-0.0003} />
      <Suspense fallback={null}>
        <Ground districts={districts} showLabels={Boolean(analysis)} />
        <Headquarters project={bundle.project} analysis={analysis} score={score} pulse={phase === "simulating"} />
        <Competitors analysis={analysis} />
        <ThreatClouds analysis={analysis} />
        <Citizens personas={personas} results={run?.results ?? []} districts={districts} onPositions={onPositions} />
        <Vehicles active={phase === "simulating"} />
        <ContactShadows position={[0, -0.05, 0]} opacity={0.28} scale={90} blur={2.4} far={12} color="#1f2937" />
      </Suspense>
      <CameraRig getPos={(idx) => posRef.current(idx)} />
    </Canvas>
  );
}

/* Lente longa + ângulo alto = leitura isométrica low-poly, mantendo fog, sombras e bloom. */
const ISO = {
  overview: { pos: [64, 58, 64] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  hq: { pos: [54, 46, 54] as [number, number, number], target: [0, 4, 0] as [number, number, number] },
  personaDist: 40,
};

function CameraRig({ getPos }: { getPos: (idx: number) => [number, number] | null }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const focus = useProject((s) => s.cameraFocus);
  const { camera } = useThree();
  const goal = useRef<{ target: THREE.Vector3; pos: THREE.Vector3; t: number } | null>(null);
  const lastFocus = useRef<typeof focus | null>(null);

  useFrame((_, dt) => {
    if (focus !== lastFocus.current) {
      lastFocus.current = focus;
      const target = new THREE.Vector3();
      const pos = new THREE.Vector3();
      if (focus === "overview") {
        target.set(...ISO.overview.target);
        pos.set(...ISO.overview.pos);
      } else if (focus === "hq") {
        target.set(...ISO.hq.target);
        pos.set(...ISO.hq.pos);
      } else {
        const p = getPos(focus);
        if (!p) return;
        target.set(p[0], 1, p[1]);
        pos.set(p[0] + ISO.personaDist, ISO.personaDist * 0.85, p[1] + ISO.personaDist);
      }
      goal.current = { target, pos, t: 0 };
    }
    const g = goal.current;
    if (g && controls.current) {
      g.t += dt;
      const k = Math.min(1, dt * 2.6);
      if (typeof focus === "number") {
        const p = getPos(focus);
        if (p) {
          g.target.set(p[0], 1, p[1]);
          g.pos.set(p[0] + ISO.personaDist, ISO.personaDist * 0.85, p[1] + ISO.personaDist);
        }
      }
      controls.current.target.lerp(g.target, k);
      camera.position.lerp(g.pos, k);
      if (g.t > 2.2 && typeof focus !== "number") goal.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={30}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2.3}
      minPolarAngle={0.45}
      enablePan
      screenSpacePanning={false}
    />
  );
}
