"use client";
import { useMemo } from "react";
import { Play, MessageSquareWarning, Target } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import { useProject, useActiveRun } from "@/store/useProject";
import { Badge, Button, Empty, Stat, cx } from "@/components/ui";
import { brl, pct } from "@/lib/format";
import { computeMetrics } from "@/lib/metrics";
import { defaultScenario } from "@/lib/types";
import { Block } from "./Overview";

export function SimulationPanel() {
  const bundle = useProject((s) => s.bundle)!;
  const phase = useProject((s) => s.phase);
  const simulate = useProject((s) => s.simulate);
  const setActiveRun = useProject((s) => s.setActiveRun);
  const setPanel = useProject((s) => s.setPanel);
  const run = useActiveRun();
  const a = bundle.analysis?.data ?? null;
  const price = run?.config.price_override ?? bundle.project.input.price;

  const metrics = useMemo(() => {
    if (!run || !run.results.length) return null;
    return run.summary?.metrics ?? computeMetrics(run.results, bundle.personas, bundle.project.input, a, price);
  }, [run, bundle.personas, bundle.project.input, a, price]);

  if (!a || bundle.personas.length < 100) {
    return <Empty icon={<Play className="size-8" />} title="Antes de abrir as portas">Rode a análise e gere os 100 clientes. Depois, cada um deles ouve sua oferta e decide.</Empty>;
  }

  if (!run) {
    return (
      <div className="space-y-3">
        <Empty icon={<Play className="size-8" />} title="Pronto para inaugurar">
          100 clientes do seu ICP vão conhecer a oferta pelo canal mais provável, levantar objeções e decidir: compram, adiam ou recusam.
        </Empty>
        <Button className="w-full" onClick={() => simulate({ ...defaultScenario(), label: "Cenário base" })} disabled={phase !== "idle"} loading={phase === "simulating"}>
          <Play className="size-4" /> Rodar simulação com 100 clientes
        </Button>
      </div>
    );
  }

  const m = metrics;
  const breakeven = a.unit_economics.breakeven_customers_per_month;
  const leadsNeeded = m && m.conversion_rate > 0 ? Math.ceil(breakeven / m.conversion_rate) : null;
  const goal = bundle.project.input.goal_monthly_revenue;
  const leadsForGoal = m && m.buy > 0 && goal ? Math.ceil(goal / (m.projected_monthly_revenue / 100)) : null;

  return (
    <div className="space-y-4">
      {bundle.runs.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {bundle.runs.map((r) => (
            <button key={r.id} onClick={() => setActiveRun(r.id)} className={cx("rounded-full border px-2.5 py-1 text-[11px] transition", r.id === run.id ? "border-accent/60 bg-accent/15 text-accent" : "border-white/10 text-muted hover:bg-white/6")}>
              {r.label} {r.summary ? <span className="num opacity-80">· {pct(r.summary.metrics?.conversion_rate ?? 0)}</span> : r.status === "running" ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {m && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Compram" value={m.buy} sub={pct(m.conversion_rate)} tone="buy" />
            <Stat label="Pensando" value={m.later} sub={pct(m.total ? m.later / m.total : 0)} tone="later" />
            <Stat label="Recusam" value={m.reject} sub={pct(m.total ? m.reject / m.total : 0)} tone="reject" />
          </div>
          <div className="h-2.5 flex overflow-hidden rounded-full bg-white/6">
            <div className="bg-buy transition-all duration-700" style={{ width: `${(m.buy / Math.max(1, m.total)) * 100}%` }} />
            <div className="bg-later transition-all duration-700" style={{ width: `${(m.later / Math.max(1, m.total)) * 100}%` }} />
            <div className="bg-reject transition-all duration-700" style={{ width: `${(m.reject / Math.max(1, m.total)) * 100}%` }} />
          </div>
          {run.status === "running" && <div className="text-center text-[11px] text-muted">{m.total}/100 decidiram…</div>}

          <div className="grid grid-cols-2 gap-2">
            <Stat label="Receita / 100 leads" value={brl(m.projected_monthly_revenue, true)} sub={`ticket médio pago ${brl(m.avg_wtp)}`} />
            <Stat label="Teto de preço mediano" value={brl(m.median_max_price)} sub={`ofertado ${brl(price)}`} tone={m.median_max_price >= price ? "buy" : "later"} />
            <Stat label="Leads p/ break-even" value={leadsNeeded ? `${leadsNeeded}/mês` : "—"} sub={`${breakeven} clientes/mês`} />
            <Stat label="Leads p/ meta" value={leadsForGoal ? `${leadsForGoal}/mês` : "—"} sub={goal ? brl(goal) : "sem meta"} />
          </div>
        </>
      )}

      {run.summary && (
        <div className="rounded-xl border border-gold/30 bg-gold/8 p-3">
          <div className="text-[10px] uppercase tracking-wider text-gold">Veredito pós-simulação · {run.summary.success_score_after}/100</div>
          <div className="mt-0.5 text-[14px] font-semibold">{run.summary.headline}</div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg/85">{run.summary.verdict}</p>
          {run.summary.pivot_warning && <p className="mt-2 rounded-lg bg-reject/15 p-2 text-[12px] text-reject">⚠ {run.summary.pivot_warning}</p>}
        </div>
      )}

      {m && m.price_curve.length > 0 && (
        <Block icon={<Target className="size-3.5 text-accent" />} title="Curva de preço · % que aceitaria pagar">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.price_curve.map((p) => ({ ...p, pct: Math.round(p.buyers_pct * 100) }))} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="pc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} /></linearGradient>
                </defs>
                <XAxis dataKey="price" tickFormatter={(v) => `R$${v}`} tick={{ fill: "#8b9bb4", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b9bb4", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: "#0b1222", border: "1px solid rgba(148,163,184,.2)", borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v}%`, "aceitariam"]} labelFormatter={(l) => `Preço ${brl(Number(l))}`} />
                <ReferenceLine x={m.price_curve.reduce((b, p) => (Math.abs(p.price - price) < Math.abs(b.price - price) ? p : b)).price} stroke="#f5c451" strokeDasharray="4 3" />
                <Area type="monotone" dataKey="pct" stroke="#38bdf8" strokeWidth={2} fill="url(#pc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {run.summary && <p className="mt-1 text-muted">{run.summary.pricing_insight}</p>}
        </Block>
      )}

      {m && m.segments.length > 0 && (
        <Block title="Conversão por segmento">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.segments.map((s) => ({ name: s.segment, conv: Math.round((s.buy / Math.max(1, s.total)) * 100), later: Math.round((s.later / Math.max(1, s.total)) * 100) }))} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fill: "#c7d2e3", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0b1222", border: "1px solid rgba(148,163,184,.2)", borderRadius: 10, fontSize: 12 }} formatter={(v, n) => [`${v}%`, n === "conv" ? "compram" : "pensando"]} />
                <Bar dataKey="conv" stackId="a" radius={[0, 0, 0, 0]}>{m.segments.map((s) => <Cell key={s.segment} fill="#34d399" />)}</Bar>
                <Bar dataKey="later" stackId="a" radius={[0, 6, 6, 0]}>{m.segments.map((s) => <Cell key={s.segment} fill="#fbbf24" />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {run.summary && <ul className="mt-1 space-y-1">{run.summary.segment_insights.map((s) => <li key={s.segment}><span className="font-medium">{s.segment}:</span> <span className="text-muted">{s.insight}</span></li>)}</ul>}
        </Block>
      )}

      {m && m.objections.length > 0 && (
        <Block icon={<MessageSquareWarning className="size-3.5 text-reject" />} title="Objeções mais ouvidas">
          <ul className="space-y-1.5">
            {(run.summary?.top_objections ?? m.objections.slice(0, 6).map((o) => ({ ...o, how_to_handle: "" }))).map((o) => (
              <li key={o.objection} className="rounded-lg bg-white/4 p-2.5">
                <div className="flex items-start justify-between gap-2"><span className="font-medium">“{o.objection}”</span><Badge tone="reject">{o.count}x</Badge></div>
                {o.how_to_handle && <p className="mt-0.5 text-buy">→ {o.how_to_handle}</p>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {run.summary && (
        <>
          <Block title="Canais">{run.summary.channel_insight}<div className="mt-1.5 flex flex-wrap gap-1">{m?.channels.slice(0, 6).map((c) => <Badge key={c.channel}>{c.channel} · {c.count}</Badge>)}</div></Block>
          <Block title="Insights"><ul className="space-y-1">{run.summary.insights.map((i) => <li key={i}>• {i}</li>)}</ul></Block>
          <div className="flex gap-2">
            <Button variant="gold" className="flex-1" onClick={() => setPanel("adjust")} disabled={phase !== "idle"}>Ajustar oferta e re-simular</Button>
            <Button variant="ghost" onClick={() => simulate({ ...defaultScenario(), label: `Cenário ${bundle.runs.length + 1}` })} disabled={phase !== "idle"}>Repetir</Button>
          </div>
        </>
      )}
    </div>
  );
}
