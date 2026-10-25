import type { Analysis, Persona } from "@/lib/types";

/* Geometria da cidade: tudo em "unidades de mundo" ao redor da sede (origem). */
export const CITY = {
  hqSize: 6,
  competitorRadius: 15,
  districtRadius: 24,
  edgeRadius: 30,
  buyRadius: [4.8, 6.8] as const,
  laterRadius: [9.5, 12] as const,
};

export const DISTRICT_COLORS = ["#2dd4bf", "#a78bfa", "#f472b6", "#fb923c", "#60a5fa", "#facc15"];

export type District = { name: string; index: number; cx: number; cz: number; radius: number; color: string; share: number };

export function districtsFor(analysis: Analysis | null, personas: Persona[]): District[] {
  const names = analysis?.icp.segments.map((s) => s.name) ?? [...new Set(personas.map((p) => p.segment))];
  const list = names.length ? names : ["Clientes"];
  const n = list.length;
  return list.map((name, index) => {
    const a = (index / n) * Math.PI * 2 + Math.PI / 6;
    const share = analysis?.icp.segments[index]?.share_pct ?? 100 / n;
    return {
      name,
      index,
      cx: Math.cos(a) * CITY.districtRadius,
      cz: Math.sin(a) * CITY.districtRadius,
      radius: 4 + Math.sqrt(share) * 0.55,
      color: DISTRICT_COLORS[index % DISTRICT_COLORS.length],
      share,
    };
  });
}

export function hash(n: number, salt = 0): number {
  let x = (n + 1) * 374761393 + salt * 668265263;
  x = (x ^ (x >>> 13)) * 1274126177;
  x = x ^ (x >>> 16);
  return ((x >>> 0) % 100000) / 100000;
}

export function homeFor(p: Persona, districts: District[]): [number, number] {
  const d = districts.find((x) => x.name === p.segment) ?? districts[p.idx % districts.length];
  const ang = hash(p.idx, 1) * Math.PI * 2;
  const rad = Math.sqrt(hash(p.idx, 2)) * d.radius * 0.9;
  return [d.cx + Math.cos(ang) * rad, d.cz + Math.sin(ang) * rad];
}

export function competitorPos(i: number, n: number): [number, number] {
  const a = (i / Math.max(1, n)) * Math.PI * 2 + Math.PI / 4 + 0.3;
  const r = CITY.competitorRadius + (i % 2) * 2.5;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
