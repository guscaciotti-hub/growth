"use client";
import { useProject, useActiveRun } from "@/store/useProject";
import { blendedScore } from "@/lib/metrics";
import { brl } from "@/lib/format";

/** Cards brancos "AO VIVO" sobre a cidade, como num dashboard 3D. */
export function LiveCards() {
  const bundle = useProject((s) => s.bundle);
  const phase = useProject((s) => s.phase);
  const run = useActiveRun();
  const analysis = bundle?.analysis?.data ?? null;
  if (!bundle || !analysis) return null;
  const score = blendedScore(analysis.verdict.success_score, run?.summary?.success_score_after ?? null);
  const results = run?.results ?? [];
  const buy = results.filter((r) => r.decision === "compra").length;
  const later = results.filter((r) => r.decision === "depois").length;
  const reject = results.filter((r) => r.decision === "nao_compra").length;
  const m = run?.summary?.metrics;
  const ue = analysis.unit_economics;
  const direct = analysis.competitors.filter((c) => c.type === "direto").length;
  const live = phase !== "idle";
  const scoreColor = score < 35 ? "#e11d48" : score < 55 ? "#d97706" : score < 75 ? "#0284c7" : "#16a34a";

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 hidden items-end gap-3 lg:left-[448px] lg:right-[318px] lg:flex lg:gap-2">
      <Card icon="🏢" tint="#dbeafe" title="Sede" live={live && phase === "analyzing"} rows={[["Viabilidade", `${score}/100`, scoreColor], ["Break-even", `${ue.breakeven_customers_per_month}/mês`], ["Runway", `${ue.runway_months} meses`]]} />
      <Card icon="👥" tint="#ede9fe" title="Clientes" live={live && phase === "personas"} rows={[["Na cidade", `${bundle.personas.length}`], ["Segmentos", `${analysis.icp.segments.length}`], ["Ticket", `${brl(analysis.pricing.suggested_price_min)}–${brl(analysis.pricing.suggested_price_max)}`]]} />
      {run && (
        <Card icon="🛒" tint="#dcfce7" title={run.label} live={live && phase === "simulating"} rows={[["Compraram", `${buy}`, "#16a34a"], ["Pensando", `${later}`, "#d97706"], ["Recusaram", `${reject}`, "#e11d48"], ...(m ? ([["Receita/100", brl(m.projected_monthly_revenue, true)]] as [string, string][]) : [])]} />
      )}
      <Card icon="⚔️" tint="#ffedd5" title="Concorrência" live={false} rows={[["Diretos", `${direct}`], ["Intensidade", `${analysis.competitive_intensity}/5`], ["Ameaças", `${analysis.threats.length}`]]} />
    </div>
  );
}

function Card({ icon, tint, title, live, rows }: { icon: string; tint: string; title: string; live: boolean; rows: [string, string, string?][] }) {
  return (
    <div className="card-float rise w-[158px] p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-lg text-sm" style={{ background: tint }}>{icon}</div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold leading-tight text-fg">{title}</div>
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: live ? "#16a34a" : "#6b7280" }}>
            <span className={live ? "size-1.5 rounded-full bg-buy animate-pulse" : "size-1.5 rounded-full bg-slate-400"} /> {live ? "ao vivo" : "atualizado"}
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="truncate text-muted">{k}</span>
            <span className="num shrink-0 font-semibold" style={{ color: c ?? "#111827" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
