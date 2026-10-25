import type { Analysis, BusinessInput, Persona, RunMetrics, SimResult } from "./types";
import { median } from "./format";

/** Agrega os 100 resultados em métricas; roda no servidor e no cliente. */
export function computeMetrics(
  results: SimResult[],
  personas: Persona[],
  input: BusinessInput,
  _analysis: Analysis | null,
  price: number,
): RunMetrics {
  const total = results.length;
  const buy = results.filter((r) => r.decision === "compra").length;
  const later = results.filter((r) => r.decision === "depois").length;
  const reject = results.filter((r) => r.decision === "nao_compra").length;
  const conversion_rate = total ? buy / total : 0;
  const avg_interest = total ? results.reduce((a, r) => a + r.interest_level, 0) / total : 0;
  const buyers = results.filter((r) => r.decision === "compra");
  const avg_wtp = buyers.length ? buyers.reduce((a, r) => a + r.willingness_to_pay_brl, 0) / buyers.length : 0;
  const median_max_price = median(results.map((r) => r.max_price_brl).filter((v) => v > 0));

  const objMap = new Map<string, number>();
  for (const r of results) {
    for (const o of r.objections_raised) {
      const key = normalizeObjection(o);
      objMap.set(key, (objMap.get(key) ?? 0) + 1);
    }
  }
  const objections = [...objMap.entries()]
    .map(([objection, count]) => ({ objection, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const byIdx = new Map(personas.map((p) => [p.idx, p]));
  const segMap = new Map<string, { segment: string; total: number; buy: number; later: number; reject: number }>();
  for (const r of results) {
    const seg = byIdx.get(r.persona_idx)?.segment ?? "Outros";
    const s = segMap.get(seg) ?? { segment: seg, total: 0, buy: 0, later: 0, reject: 0 };
    s.total++;
    if (r.decision === "compra") s.buy++;
    else if (r.decision === "depois") s.later++;
    else s.reject++;
    segMap.set(seg, s);
  }
  const segments = [...segMap.values()].sort((a, b) => b.total - a.total);

  const steps = 13;
  const price_curve: { price: number; buyers_pct: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const p = Math.round(price * (0.4 + (1.2 * i) / (steps - 1)));
    const willing = results.filter((r) => r.max_price_brl >= p && r.decision !== "nao_compra").length;
    price_curve.push({ price: p, buyers_pct: total ? willing / total : 0 });
  }

  const chMap = new Map<string, number>();
  for (const r of results) chMap.set(r.awareness_channel, (chMap.get(r.awareness_channel) ?? 0) + 1);
  const channels = [...chMap.entries()].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count);

  // Receita por 100 leads do ICP expostos à oferta
  const projected_monthly_revenue = buyers.reduce((a, r) => a + r.willingness_to_pay_brl, 0);

  return {
    total,
    buy,
    later,
    reject,
    conversion_rate,
    avg_interest,
    avg_wtp,
    median_max_price,
    projected_monthly_revenue,
    objections,
    segments,
    price_curve,
    channels,
  };
}

function normalizeObjection(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > 70 ? t.slice(0, 67) + "…" : t;
}

export function metricsToText(m: RunMetrics, price: number): string {
  return `Total simulado: ${m.total}
Compram: ${m.buy} (${(m.conversion_rate * 100).toFixed(0)}%) | Adiam: ${m.later} | Recusam: ${m.reject}
Interesse médio: ${m.avg_interest.toFixed(1)}/10
Preço ofertado: R$ ${price.toFixed(0)} | Disposição média a pagar (compradores): R$ ${m.avg_wtp.toFixed(0)} | Teto mediano aceitável: R$ ${m.median_max_price.toFixed(0)}
Receita por 100 leads do ICP expostos: R$ ${m.projected_monthly_revenue.toFixed(0)}
Curva de preço (preço → % que aceitaria): ${m.price_curve.map((p) => `R$${p.price}:${(p.buyers_pct * 100).toFixed(0)}%`).join(", ")}
Objeções mais citadas: ${m.objections.slice(0, 8).map((o) => `"${o.objection}" (${o.count})`).join("; ")}
Por segmento: ${m.segments.map((s) => `${s.segment}: ${s.buy}/${s.total} compram, ${s.later} adiam, ${s.reject} recusam`).join(" | ")}
Canais de descoberta: ${m.channels.slice(0, 6).map((c) => `${c.channel} (${c.count})`).join(", ")}`;
}

/** Score final combinando a análise de mercado e o comportamento simulado. */
export function blendedScore(analysisScore: number, summaryScore: number | null | undefined): number {
  if (summaryScore === null || summaryScore === undefined) return analysisScore;
  return Math.round(analysisScore * 0.4 + summaryScore * 0.6);
}
