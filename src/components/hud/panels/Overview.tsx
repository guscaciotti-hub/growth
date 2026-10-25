"use client";
import { AlertTriangle, TrendingUp, Wrench, ListChecks, Search, Clapperboard, Download } from "lucide-react";
import { useState } from "react";
import { useProject, useActiveRun } from "@/store/useProject";
import { Badge, Button, Empty, Gauge, Stat, cx } from "@/components/ui";
import { brl, ratingLabel, scoreToRating } from "@/lib/format";
import { blendedScore } from "@/lib/metrics";

export function OverviewPanel() {
  const bundle = useProject((s) => s.bundle)!;
  const phase = useProject((s) => s.phase);
  const analyze = useProject((s) => s.analyze);
  const research = useProject((s) => s.research);
  const run = useActiveRun();
  const a = bundle.analysis?.data;
  const [showResearch, setShowResearch] = useState(false);
  const input = bundle.project.input;

  if (!a) {
    return (
      <div className="space-y-4">
        <Empty icon={<Search className="size-8" />} title="Seu terreno está pronto">
          Rode a análise para pesquisar mercado, concorrência, região, preço e ameaças. A sede sobe conforme o veredito.
        </Empty>
        <div className="rounded-xl bg-white/4 p-3 text-[12.5px] text-fg/85">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">Ideia</div>
          {input.pitch}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Ticket" value={brl(input.price)} />
          <Stat label="Custos fixos" value={`${brl(input.monthly_fixed_costs)}/mês`} />
          <Stat label="Investimento" value={brl(input.initial_investment)} />
          <Stat label="Meta" value={input.goal_monthly_revenue ? `${brl(input.goal_monthly_revenue)}/mês` : "—"} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => analyze()} loading={phase === "analyzing"} disabled={phase !== "idle"}>Analisar com pesquisa web</Button>
          <Button variant="ghost" onClick={() => analyze({ skipResearch: true })} disabled={phase !== "idle"} title="Mais rápido, sem buscar dados na web">Rápida</Button>
        </div>
      </div>
    );
  }

  const score = blendedScore(a.verdict.success_score, run?.summary?.success_score_after ?? null);
  const rating = scoreToRating(score);
  const ue = a.unit_economics;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Gauge value={score} label="Viabilidade" sub={ratingLabel[rating]} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-snug">{run?.summary?.headline ?? a.verdict.headline}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="accent">analista: {a.verdict.success_score}</Badge>
            {run?.summary && <Badge tone="gold">simulação: {run.summary.success_score_after}</Badge>}
            <Badge>confiança {a.verdict.confidence}</Badge>
          </div>
        </div>
      </div>

      <p className="text-[12.5px] leading-relaxed text-fg/85">{a.executive_summary}</p>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Break-even" value={`${ue.breakeven_customers_per_month} clientes/mês`} sub={`~${ue.months_to_breakeven} meses`} />
        <Stat label="Runway" value={`${ue.runway_months} meses`} sub="investimento ÷ custos fixos" tone={ue.runway_months < 6 ? "reject" : ue.runway_months < 12 ? "later" : "buy"} />
        <Stat label="CAC → LTV" value={`${brl(ue.estimated_cac_brl)} → ${brl(ue.estimated_ltv_brl)}`} sub={`LTV/CAC ${(ue.estimated_ltv_brl / Math.max(1, ue.estimated_cac_brl)).toFixed(1)}x`} tone={ue.estimated_ltv_brl / Math.max(1, ue.estimated_cac_brl) >= 3 ? "buy" : "later"} />
        <Stat label="Receita realista 12m" value={`${brl(ue.realistic_monthly_revenue_12m, true)}/mês`} sub={`margem bruta ${ue.gross_margin_pct}%`} />
      </div>

      <Block icon={<AlertTriangle className="size-3.5 text-reject" />} title="Riscos-chave">
        <ul className="space-y-1">{a.verdict.key_risks.map((r) => <li key={r} className="flex gap-2"><span className="text-reject">•</span>{r}</li>)}</ul>
      </Block>

      <Block icon={<Wrench className="size-3.5 text-gold" />} title="Ajustes recomendados">
        <ul className="space-y-1.5">
          {(run?.summary?.adjustments ?? a.verdict.adjustments).map((adj) => (
            <li key={adj.title} className="rounded-lg bg-white/4 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{adj.title}</span>
                <span className={cx("num text-[11px] font-semibold", adj.expected_score_delta >= 0 ? "text-buy" : "text-reject")}>{adj.expected_score_delta >= 0 ? "+" : ""}{adj.expected_score_delta} pts</span>
              </div>
              <div className="mt-0.5 text-muted">{adj.description}</div>
              <div className="mt-1 flex gap-1"><Badge tone={adj.impact === "alto" ? "buy" : adj.impact === "medio" ? "later" : "neutral"}>impacto {adj.impact}</Badge><Badge>esforço {adj.effort}</Badge></div>
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={<TrendingUp className="size-3.5 text-accent" />} title="Por que esse score">
        <p>{a.verdict.reasoning}</p>
      </Block>

      <Block icon={<ListChecks className="size-3.5 text-buy" />} title="Próximos passos">
        <ol className="list-decimal space-y-1 pl-4">{a.verdict.next_steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Block>

      {research && (
        <div>
          <button onClick={() => setShowResearch((v) => !v)} className="text-[11px] text-accent hover:underline">{showResearch ? "Ocultar" : "Ver"} briefing da pesquisa de mercado</button>
          {showResearch && <pre className="scroll-thin mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-[11px] leading-relaxed text-fg/80">{research}</pre>}
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-white/4 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><Clapperboard className="size-3.5 text-accent-2" /> Vídeo do resultado</div>
        <p className="text-[12px] text-muted">Exporte os dados e renderize um filme 3D de 26s com HyperFrames (pasta <code className="text-fg/80">video/</code>): salve como <code className="text-fg/80">video/assets/data.js</code> e rode <code className="text-fg/80">npm run render</code>.</p>
        <div className="mt-2 flex gap-2">
          <a href={`/api/projects/${bundle.project.id}/export?format=js`} download className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"><Download className="size-3.5" /> data.js</a>
          <a href={`/api/projects/${bundle.project.id}/export?format=json`} download className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"><Download className="size-3.5" /> JSON</a>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="w-full" onClick={() => analyze()} disabled={phase !== "idle"}>Refazer análise</Button>
    </div>
  );
}

export function Block({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{icon}{title}</div>
      <div className="text-[12.5px] leading-relaxed text-fg/85">{children}</div>
    </div>
  );
}
