"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useProject, useActiveRun } from "@/store/useProject";
import { blendedScore } from "@/lib/metrics";
import { Ground } from "./Ground";
import { Headquarters, Competitors } from "./Buildings";
import { ThreatClouds } from "./Weather";
import { Citizens } from "./Citizens";
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
      camera={{ position: ISO.overview.pos, fov: 22, near: 1, far: 500 }}
      onPointerMissed={() => useProject.getState().selectPersona(null)}
    >
      <color attach="background" args={["#060a13"]} />
      <fog attach="fog" args={["#060a13", 120, 260]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#3b4f8a", "#0b1020", 0.55]} />
      <directionalLight position={[22, 34, 14]} intensity={1.35} color="#ffd9a8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-bias={-0.0004} />
      <Stars radius={120} depth={40} count={1800} factor={3} fade speed={0.4} />
      <Suspense fallback={null}>
        <Ground districts={districts} showLabels={Boolean(analysis)} />
        <Headquarters project={bundle.project} analysis={analysis} score={score} pulse={phase === "simulating"} />
        <Competitors analysis={analysis} />
        <ThreatClouds analysis={analysis} />
        <Citizens personas={personas} results={run?.results ?? []} districts={districts} onPositions={onPositions} />
        {analysis && score !== null && score >= 55 && <Sparkles count={40} scale={[10, 8, 10]} position={[0, 10, 0]} size={3} speed={0.4} color="#fde68a" />}
        <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={70} blur={2.2} far={10} />
      </Suspense>
      <CameraRig getPos={(idx) => posRef.current(idx)} />
      <EffectComposer>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={0.9} radius={0.6} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}

/* Lente longa + ângulo alto = leitura isométrica low-poly, mantendo fog, sombras e bloom. */
const ISO = {
  overview: { pos: [64, 58, 64] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  hq: { pos: [40, 36, 40] as [number, number, number], target: [0, 5, 0] as [number, number, number] },
  personaDist: 16,
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
        pos.set(p[0] + ISO.personaDist, ISO.personaDist * 0.9, p[1] + ISO.personaDist);
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
          g.pos.set(p[0] + ISO.personaDist, ISO.personaDist * 0.9, p[1] + ISO.personaDist);
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
      minDistance={14}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2.3}
      minPolarAngle={0.45}
      enablePan
      screenSpacePanning={false}
    />
  );
}
