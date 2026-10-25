"use client";
import Link from "next/link";
import { ArrowLeft, Building2, Users, Play, Sparkles, FlaskConical } from "lucide-react";
import { useProject } from "@/store/useProject";
import { Badge, Button, cx } from "@/components/ui";
import { brlFx } from "./panels/Costs";
import { defaultScenario } from "@/lib/types";

const STEPS = [
  { key: "analyze", label: "Analisar", icon: Building2 },
  { key: "personas", label: "Gerar clientes", icon: Users },
  { key: "simulate", label: "Simular", icon: Play },
] as const;

/** Botões das três etapas; usados na barra superior (desktop) e na barra do celular. */
export function StepButtons({ compact = false }: { compact?: boolean }) {
  const { bundle, phase, analyze, generatePersonas, simulate, setPanel } = useProject();
  if (!bundle) return null;
  const hasAnalysis = Boolean(bundle.analysis);
  const hasPersonas = bundle.personas.length >= 100;
  const hasRun = bundle.runs.some((r) => r.status === "done");
  const busy = phase !== "idle";
  const done = { analyze: hasAnalysis, personas: hasPersonas, simulate: hasRun };
  const next = !hasAnalysis ? "analyze" : !hasPersonas ? "personas" : "simulate";

  const act = (k: string) => {
    if (k === "analyze") analyze();
    else if (k === "personas") generatePersonas();
    else simulate({ ...defaultScenario(), label: bundle.runs.length ? `Cenário ${bundle.runs.length + 1}` : "Cenário base" });
  };

  return (
    <>
      {STEPS.map((s, i) => {
        const isDone = done[s.key];
        const isNext = s.key === next;
        const enabled = s.key === "analyze" || (s.key === "personas" && hasAnalysis) || (s.key === "simulate" && hasPersonas);
        const running = busy && ((phase === "analyzing" && s.key === "analyze") || (phase === "personas" && s.key === "personas") || (phase === "simulating" && s.key === "simulate"));
        return (
          <div key={s.key} className={cx("flex items-center", compact && "flex-1")}>
            <Button
              size="sm"
              variant={isNext && !isDone ? "primary" : "ghost"}
              className={cx("relative", compact && "w-full", isDone && "text-buy", running && "pulse-ring")}
              disabled={!enabled || busy}
              loading={running}
              onClick={() => act(s.key)}
              title={s.key === "simulate" && hasRun ? "Rodar novo cenário base" : undefined}
            >
              {!running && <s.icon className="size-3.5" />}
              {s.label}
              {isDone && <span className="ml-1 text-[10px] opacity-80">✓</span>}
            </Button>
            {!compact && i < STEPS.length - 1 && <span className={cx("mx-1 h-px w-5", isDone ? "bg-buy/60" : "bg-slate-900/10")} />}
          </div>
        );
      })}
      {hasRun && (
        <Button size="sm" variant="gold" className={cx(compact ? "w-full flex-1" : "ml-1")} disabled={busy} onClick={() => setPanel("adjust")}>
          <FlaskConical className="size-3.5" /> {compact ? "Ajustar" : "Ajustar & re-simular"}
        </Button>
      )}
    </>
  );
}

/** Barra de ações para telas pequenas. */
export function MobileActions() {
  const bundle = useProject((s) => s.bundle);
  if (!bundle) return null;
  return (
    <div className="flex gap-1.5 px-3 pt-2 md:hidden">
      <StepButtons compact />
    </div>
  );
}

export function TopBar() {
  const { bundle, mode, usdBrl, setPanel } = useProject();
  const spentUsd = (bundle?.costs ?? []).reduce((a, c) => a + c.usd, 0);
  if (!bundle) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 lg:p-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <Link href="/" className="glass grid size-10 place-items-center rounded-xl text-muted hover:text-fg transition" aria-label="Voltar">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="glass max-w-[calc(100vw-80px)] rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold leading-tight">{bundle.project.name}</span>
            {mode === "demo" ? <Badge tone="later">modo demonstração</Badge> : <Badge tone="accent"><Sparkles className="mr-1 size-3" />IA ao vivo</Badge>}
            {(bundle?.costs?.length ?? 0) > 0 && (
              <button onClick={() => setPanel("costs")} title="Ver gastos" className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold num text-gold hover:bg-gold/20">
                {brlFx(spentUsd * usdBrl.rate)}
              </button>
            )}
          </div>
          <div className="text-[11px] text-muted leading-tight">
            {bundle.project.input.category} · {bundle.project.input.model}{bundle.project.input.model !== "online" && bundle.project.input.location.city ? ` · ${bundle.project.input.location.city}` : ""}
          </div>
        </div>
      </div>

      <div className="pointer-events-auto glass hidden items-center gap-1 rounded-xl p-1.5 md:flex">
        <StepButtons />
      </div>
    </div>
  );
}
