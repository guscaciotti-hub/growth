"use client";
import { Building2, MapPin, Tag, ShieldAlert, Landmark, Scale } from "lucide-react";
import { useProject } from "@/store/useProject";
import { Badge, Empty, Meter, Stat, cx } from "@/components/ui";
import { brl } from "@/lib/format";
import { Block } from "./Overview";

export function MarketPanel() {
  const a = useProject((s) => s.bundle?.analysis?.data);
  const input = useProject((s) => s.bundle?.project.input);
  if (!a || !input) return <Empty title="Sem análise ainda">Rode a análise para ver mercado, concorrência, demografia e ameaças.</Empty>;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tamanho de mercado (R$/ano)</span>
          <Badge>{a.market.maturity}</Badge>
        </div>
        <div className="space-y-1.5">
          {([["TAM", a.market.tam_brl_year], ["SAM", a.market.sam_brl_year], ["SOM", a.market.som_brl_year]] as const).map(([k, v], i) => (
            <div key={k} className="flex items-center gap-2 text-[12px]">
              <span className="w-10 text-muted">{k}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-900/5">
                <div className={cx("h-full rounded-md", i === 0 ? "bg-accent/30" : i === 1 ? "bg-accent/55" : "bg-accent")} style={{ width: `${Math.max(4, (v / Math.max(1, a.market.tam_brl_year)) * 100)}%` }} />
              </div>
              <span className="w-20 text-right num font-medium">{brl(v, true)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted">{a.market.sizing_rationale}</p>
        <p className="mt-1 text-[12px] text-fg/85"><span className="text-muted">Tendência:</span> {a.market.growth_trend}</p>
        <div className="mt-2 flex flex-wrap gap-1">{a.market.demand_signals.map((s) => <Badge key={s} tone="buy">{s}</Badge>)}</div>
      </div>

      {a.demographics && (
        <Block icon={<MapPin className="size-3.5 text-accent" />} title={`Região · aderência ${a.demographics.fit_score}/100`}>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="População" value={<span className="text-sm">{a.demographics.population_estimate}</span>} />
            <Stat label="Renda" value={<span className="text-sm">{a.demographics.income_profile}</span>} />
          </div>
          <p className="mt-2"><span className="text-muted">Idade:</span> {a.demographics.age_profile}</p>
          <p className="mt-1"><span className="text-muted">Dinâmica local:</span> {a.demographics.local_dynamics}</p>
          <p className="mt-1 text-muted">{a.demographics.notes}</p>
        </Block>
      )}

      <Block icon={<Building2 className="size-3.5 text-accent-2" />} title={`Concorrência · intensidade ${a.competitive_intensity}/5`}>
        <ul className="space-y-2">
          {a.competitors.map((c, i) => (
            <li key={`${c.name}-${i}`} className="rounded-lg bg-slate-900/4 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <div className="flex gap-1"><Badge>{c.type}</Badge><Badge tone={c.price_position === "abaixo" ? "reject" : c.price_position === "acima" ? "buy" : "neutral"}>preço {c.price_position}</Badge></div>
              </div>
              <div className="mt-1.5 space-y-1"><Meter label="Força" value={c.strength} tone="accent" /><Meter label="Ameaça" value={c.threat_level} tone="reject" /></div>
              <p className="mt-1 text-muted">{c.differentiator}</p>
              <p className="mt-0.5 text-buy">Explorar: {c.weakness_to_exploit}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={<Tag className="size-3.5 text-gold" />} title="Preço">
        <div className="mb-2 grid grid-cols-2 gap-2 text-[12px]">
          <Stat label="Seu preço" value={brl(input.price)} />
          <Stat label="Faixa sugerida" value={<span className="text-sm">{brl(a.pricing.suggested_price_min)} – {brl(a.pricing.suggested_price_max)}</span>} sub={`elasticidade ${a.pricing.elasticity}`} />
        </div>
        <p>{a.pricing.assessment}</p>
        <p className="mt-1 text-muted">{a.pricing.rationale}</p>
      </Block>

      <Block icon={<Scale className="size-3.5 text-accent" />} title="SWOT">
        <div className="grid grid-cols-2 gap-2">
          {([["Forças", a.swot.strengths, "text-buy"], ["Fraquezas", a.swot.weaknesses, "text-reject"], ["Oportunidades", a.swot.opportunities, "text-accent"], ["Ameaças", a.swot.threats, "text-later"]] as const).map(([t, items, col]) => (
            <div key={t} className="rounded-lg bg-slate-900/4 p-2.5">
              <div className={cx("mb-1 text-[11px] font-semibold uppercase tracking-wider", col)}>{t}</div>
              <ul className="space-y-0.5 text-[11.5px]">{items.map((i) => <li key={i}>• {i}</li>)}</ul>
            </div>
          ))}
        </div>
      </Block>

      <Block icon={<ShieldAlert className="size-3.5 text-reject" />} title="Ameaças">
        <ul className="space-y-2">
          {a.threats.map((t) => (
            <li key={t.title} className="rounded-lg bg-slate-900/4 p-2.5">
              <div className="flex items-center justify-between"><span className="font-medium">{t.title}</span><span className="num text-[11px] text-muted">sev {t.severity} · prob {t.probability}</span></div>
              <p className="mt-0.5 text-muted">{t.description}</p>
              <p className="mt-0.5 text-buy">Mitigar: {t.mitigation}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={<Landmark className="size-3.5 text-accent-2" />} title="Barreiras e regulação">
        <ul className="space-y-1.5">
          {a.barriers.map((b) => (
            <li key={b.title} className="flex items-start gap-2"><Badge>{b.type}</Badge><span><span className="font-medium">{b.title}</span> ({b.difficulty}/5) — {b.how_to_overcome}</span></li>
          ))}
        </ul>
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted">{a.regulatory.map((r) => <li key={r}>{r}</li>)}</ul>
      </Block>
    </div>
  );
}
