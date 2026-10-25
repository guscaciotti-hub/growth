"use client";
import { Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { CITY, hash, type District } from "./layout";

const dummy = new THREE.Object3D();

/** Plataforma flutuante estilo maquete: laje com grama, ruas claras e bairros pastel. */
export function Ground({ districts, showLabels }: { districts: District[]; showLabels: boolean }) {
  const SIZE = 84;
  return (
    <group>
      {/* laje */}
      <mesh position={[0, -1.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[SIZE, 2.6, SIZE]} />
        <meshStandardMaterial color="#e3e0d6" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.095, 0]} receiveShadow>
        <planeGeometry args={[SIZE - 0.4, SIZE - 0.4]} />
        <meshStandardMaterial color="#cfe4c3" roughness={1} />
      </mesh>
      {/* avenidas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[3.2, SIZE - 4]} />
        <meshStandardMaterial color="#dfdfd9" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[3.2, SIZE - 4]} />
        <meshStandardMaterial color="#dfdfd9" roughness={0.9} />
      </mesh>
      {/* faixas das avenidas */}
      {[0, Math.PI / 2].map((rot) => (
        <mesh key={rot} rotation={[-Math.PI / 2, 0, rot]} position={[0, -0.07, 0]}>
          <planeGeometry args={[0.12, SIZE - 4]} />
          <meshBasicMaterial color="#f7f7f2" />
        </mesh>
      ))}
      {/* anel viário */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
        <ringGeometry args={[9.4, 11.8, 96]} />
        <meshStandardMaterial color="#dfdfd9" roughness={0.9} />
      </mesh>
      {/* praça da sede */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
        <circleGeometry args={[7.8, 64]} />
        <meshStandardMaterial color="#efeee8" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <ringGeometry args={[7.55, 7.8, 64]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>

      {/* bairros por segmento */}
      {districts.map((d) => (
        <group key={d.name} position={[d.cx, 0, d.cz]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow>
            <circleGeometry args={[d.radius, 48]} />
            <meshStandardMaterial color={d.color} transparent opacity={0.28} roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
            <ringGeometry args={[d.radius - 0.14, d.radius, 64]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
          {showLabels && (
            <Html position={[(d.cx / Math.hypot(d.cx, d.cz)) * (d.radius + 1.2), 0.2, (d.cz / Math.hypot(d.cx, d.cz)) * (d.radius + 1.2)]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
              <div className="city-tag" style={{ color: "#1f2937", borderColor: d.color }}>
                <span className="dot" style={{ background: d.color }} /> {d.name} · {Math.round(d.share)}%
              </div>
            </Html>
          )}
        </group>
      ))}

      <Trees size={SIZE} districts={districts} />
    </group>
  );
}

/** Árvores low-poly instanciadas nas bordas e entre os bairros. */
function Trees({ size, districts }: { size: number; districts: District[] }) {
  const items = useMemo(() => {
    const out: { x: number; z: number; s: number; tone: number }[] = [];
    let i = 0;
    while (out.length < 90 && i < 2000) {
      i++;
      const x = (hash(i, 21) - 0.5) * (size - 6);
      const z = (hash(i, 22) - 0.5) * (size - 6);
      const r = Math.hypot(x, z);
      if (r < 13) continue; // praça e anel
      if (Math.abs(x) < 2.6 || Math.abs(z) < 2.6) continue; // avenidas
      if (districts.some((d) => Math.hypot(x - d.cx, z - d.cz) < d.radius + 0.8)) continue;
      if (r > CITY.competitorRadius - 3 && r < CITY.competitorRadius + 4.5 && hash(i, 23) < 0.7) continue; // concorrentes
      out.push({ x, z, s: 0.7 + hash(i, 24) * 0.7, tone: hash(i, 25) });
    }
    return out;
  }, [size, districts]);
  const trunkRef = (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    items.forEach((t, i) => {
      dummy.position.set(t.x, 0.45 * t.s, t.z);
      dummy.scale.set(t.s, t.s, t.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  const crownRef = (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    const c = new THREE.Color();
    items.forEach((t, i) => {
      dummy.position.set(t.x, 1.25 * t.s, t.z);
      dummy.scale.set(t.s, t.s * 1.1, t.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.set(t.tone < 0.5 ? "#7fbf7a" : t.tone < 0.8 ? "#6fb36b" : "#9ccc8f"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, Math.max(1, items.length)]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.9, 6]} />
        <meshStandardMaterial color="#8b5e3c" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, Math.max(1, items.length)]} castShadow>
        <icosahedronGeometry args={[0.75, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}
