"use client";
import { Grid, Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { CITY, type District } from "./layout";

export function Ground({ districts, showLabels }: { districts: District[]; showLabels: boolean }) {
  const ringPts = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const r = 10.5;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.03, Math.sin(a) * r));
    }
    return pts;
  }, []);
  const ringGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(ringPts), [ringPts]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#0b1324" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[140, 140]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#172243"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#233566"
        fadeDistance={80}
        fadeStrength={1.5}
        infiniteGrid
      />
      {/* avenidas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[2.6, 2 * CITY.edgeRadius + 8]} />
        <meshStandardMaterial color="#121c33" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[2.6, 2 * CITY.edgeRadius + 8]} />
        <meshStandardMaterial color="#121c33" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[9.4, 11.6, 96]} />
        <meshStandardMaterial color="#121c33" roughness={0.9} />
      </mesh>
      <lineLoop geometry={ringGeo}>
        <lineBasicMaterial color="#2b3f78" />
      </lineLoop>
      {/* praça da sede */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <circleGeometry args={[7.6, 64]} />
        <meshStandardMaterial color="#141f3a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[7.4, 7.65, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
      </mesh>

      {/* bairros por segmento */}
      {districts.map((d) => (
        <group key={d.name} position={[d.cx, 0, d.cz]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]} receiveShadow>
            <circleGeometry args={[d.radius, 48]} />
            <meshStandardMaterial color={d.color} transparent opacity={0.1} roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[d.radius - 0.12, d.radius, 64]} />
            <meshBasicMaterial color={d.color} transparent opacity={0.5} />
          </mesh>
          {showLabels && <Html position={[(d.cx / Math.hypot(d.cx, d.cz)) * (d.radius + 1.2), 0.2, (d.cz / Math.hypot(d.cx, d.cz)) * (d.radius + 1.2)]} center distanceFactor={28} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide" style={{ background: "rgba(6,10,19,.7)", color: d.color, border: `1px solid ${d.color}55` }}>
              {d.name} · {Math.round(d.share)}%
            </div>
          </Html>}
        </group>
      ))}
    </group>
  );
}
