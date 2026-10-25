"use client";
import { X, Quote, Wallet, MapPin, Briefcase, Target, ShieldAlert, Lightbulb } from "lucide-react";
import { useProject, useActiveRun } from "@/store/useProject";
import { Badge, Meter, cx } from "@/components/ui";
import { brl } from "@/lib/format";

export function PersonaCard() {
  const idx = useProject((s) => s.selectedPersonaIdx);
  const personas = useProject((s) => s.bundle?.personas ?? []);
  const selectPersona = useProject((s) => s.selectPersona);
  const run = useActiveRun();
  const p = idx !== null ? personas.find((x) => x.idx === idx) : null;
  if (!p) return null;
  const r = run?.results.find((x) => x.persona_idx === p.idx);
  const tone = r?.decision === "compra" ? "buy" : r?.decision === "depois" ? "later" : r ? "reject" : "neutral";

  return (
    <aside className="pointer-events-auto glass rise absolute right-3 top-20 z-30 w-[min(360px,calc(100vw-24px))] rounded-2xl lg:top-24">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl" style={{ background: p.avatar.shirt }}>
          <div className="absolute left-1/2 top-2 size-6 -translate-x-1/2 rounded-full" style={{ background: p.avatar.skin }} />
          <div className="absolute left-1/2 top-1.5 h-3 w-6 -translate-x-1/2 rounded-t-full" style={{ background: p.avatar.hair }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{p.name}</h3>
            <span className="text-sm text-muted">{p.age}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <Briefcase className="size-3" /> {p.occupation}
            <span>·</span>
            <MapPin className="size-3" /> {p.location}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone="accent">{p.segment}</Badge>
            <Badge>{p.decision_style}</Badge>
            {r && <Badge tone={tone as "buy" | "later" | "reject"}>{r.decision === "compra" ? "Comprou" : r.decision === "depois" ? "Vai pensar" : "Não comprou"}</Badge>}
          </div>
        </div>
        <button onClick={() => selectPersona(null)} className="text-muted hover:text-fg" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      <div className="scroll-thin max-h-[60vh] space-y-3 overflow-y-auto px-4 pb-4 text-[12.5px]">
        <blockquote className="flex gap-2 rounded-xl bg-slate-900/4 p-3 italic text-fg/85">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span>{p.quote}</span>
        </blockquote>

        <div className="grid grid-cols-2 gap-2">
          <Info icon={<Wallet className="size-3" />} label="Renda" value={`${brl(p.income_monthly_brl)}/mês`} />
          <Info icon={<Target className="size-3" />} label="Canal" value={p.preferred_channel} />
        </div>
        <Meter label="Sens. a preço" value={p.price_sensitivity} tone="later" />
        <Meter label="Tech" value={p.tech_savviness} tone="accent" />

        <Section title="Dores">{p.pains.join(" · ")}</Section>
        <Section title="Usa hoje">{p.current_solution}</Section>
        <Section title="Objeções">
          <ul className="list-disc space-y-0.5 pl-4">
            {p.objections.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </Section>
        <Section title="Confia em">{p.trust_factors.join(", ")}</Section>

        {r && (
          <div className={cx("rounded-xl border p-3", tone === "buy" && "border-buy/30 bg-buy/8", tone === "later" && "border-later/30 bg-later/8", tone === "reject" && "border-reject/30 bg-reject/8")}>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">Na simulação</div>
            <p className="italic text-fg/90">“{r.reasoning}”</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-muted">Interesse</span> <span className="num font-medium">{r.interest_level}/10</span></div>
              <div><span className="text-muted">Pagaria até</span> <span className="num font-medium">{brl(r.max_price_brl)}</span></div>
              <div><span className="text-muted">Descobriu via</span> <span className="font-medium">{r.awareness_channel}</span></div>
              <div><span className="text-muted">Risco de churn</span> <span className="num font-medium">{r.churn_risk}/5</span></div>
            </div>
            {r.objections_raised.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-[11.5px]"><ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-reject" /><span>{r.objections_raised.join(" · ")}{r.deal_breaker ? ` — decisivo: ${r.deal_breaker}` : ""}</span></div>
            )}
            <div className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-buy"><Lightbulb className="mt-0.5 size-3.5 shrink-0" /><span>Convenceria: {r.what_would_convince}</span></div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-900/4 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">{icon}{label}</div>
      <div className="truncate text-[12px] font-medium">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted">{title}</div>
      <div className="text-fg/85">{children}</div>
    </div>
  );
}
