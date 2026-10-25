"use client";
import { useState } from "react";
import { FlaskConical, Play } from "lucide-react";
import { useProject, useActiveRun } from "@/store/useProject";
import { Button, Empty, Field, Input, Textarea, Badge, cx } from "@/components/ui";
import { brl } from "@/lib/format";
import { defaultScenario, type ScenarioConfig } from "@/lib/types";

const CHANNELS = ["Instagram", "TikTok", "Google", "Indicação", "WhatsApp", "Facebook Ads", "Parcerias locais", "Ponto físico / rua", "Marketplace", "LinkedIn", "YouTube", "Eventos"];

export function AdjustPanel() {
  const bundle = useProject((s) => s.bundle)!;
  const phase = useProject((s) => s.phase);
  const simulate = useProject((s) => s.simulate);
  const run = useActiveRun();
  const input = bundle.project.input;
  const a = bundle.analysis?.data;
  const [cfg, setCfg] = useState<ScenarioConfig>(() => ({ ...defaultScenario(), label: `Cenário ${bundle.runs.length + 1}`, price_override: run?.config.price_override ?? null }));
  const price = cfg.price_override ?? input.price;

  if (!a || bundle.personas.length < 100) return <Empty icon={<FlaskConical className="size-8" />} title="Laboratório fechado">Depois da análise e dos clientes você pode testar preço, garantia, posicionamento e canais, e re-simular com os mesmos 100 clientes.</Empty>;

  const suggestions = run?.summary?.adjustments ?? a.verdict.adjustments;
  const apply = (title: string, desc: string) => setCfg((c) => ({ ...c, offer_changes: [c.offer_changes, `${title}: ${desc}`].filter(Boolean).join("\n") }));

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-fg/85">Mude a oferta e rode de novo com os <span className="font-medium">mesmos 100 clientes</span>. Compare cenários lado a lado na aba Simulação.</p>

      <Field label="Nome do cenário">
        <Input value={cfg.label} onChange={(e) => setCfg({ ...cfg, label: e.target.value })} placeholder="Ex.: Preço -15% + garantia" />
      </Field>

      <Field label="Preço" hint={`faixa sugerida ${brl(a.pricing.suggested_price_min)} – ${brl(a.pricing.suggested_price_max)}`}>
        <div className="flex items-center gap-3">
          <input type="range" min={Math.round(input.price * 0.4)} max={Math.round(input.price * 1.8)} step={1} value={price} onChange={(e) => setCfg({ ...cfg, price_override: Number(e.target.value) === input.price ? null : Number(e.target.value) })} className="flex-1" />
          <div className="w-28 text-right">
            <div className="num text-base font-semibold">{brl(price)}</div>
            <div className={cx("text-[11px] num", price < input.price ? "text-buy" : price > input.price ? "text-later" : "text-muted")}>{price === input.price ? "preço original" : `${price > input.price ? "+" : ""}${Math.round(((price - input.price) / input.price) * 100)}%`}</div>
          </div>
        </div>
      </Field>

      <Field label="Mudanças na oferta" hint="o que o cliente vai ver de diferente">
        <Textarea value={cfg.offer_changes} onChange={(e) => setCfg({ ...cfg, offer_changes: e.target.value })} placeholder="Ex.: plano de entrada mensal, brinde na primeira compra, entrega em 24h…" />
      </Field>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button key={s.title} onClick={() => apply(s.title, s.description)} className="rounded-full border border-gold/30 bg-gold/8 px-2.5 py-1 text-[11px] text-gold transition hover:bg-gold/15" title={s.description}>+ {s.title}</button>
          ))}
        </div>
      )}

      <Field label="Posicionamento / mensagem principal">
        <Input value={cfg.positioning} onChange={(e) => setCfg({ ...cfg, positioning: e.target.value })} placeholder="Ex.: 'o mais rápido do bairro, ou seu dinheiro de volta'" />
      </Field>
      <Field label="Garantia / redução de risco">
        <Input value={cfg.guarantee} onChange={(e) => setCfg({ ...cfg, guarantee: e.target.value })} placeholder="Ex.: 30 dias de garantia incondicional, primeira sessão grátis" />
      </Field>

      <Field label="Foco de canais" hint="vazio = canais originais">
        <div className="flex flex-wrap gap-1">
          {CHANNELS.map((c) => {
            const on = cfg.channel_focus.includes(c);
            return (
              <button key={c} type="button" onClick={() => setCfg({ ...cfg, channel_focus: on ? cfg.channel_focus.filter((x) => x !== c) : [...cfg.channel_focus, c] })} className={cx("rounded-full border px-2.5 py-1 text-[11px] transition", on ? "border-accent/60 bg-accent/15 text-accent" : "border-slate-900/10 text-muted hover:bg-slate-900/6")}>{c}</button>
            );
          })}
        </div>
      </Field>

      <div className="rounded-xl bg-slate-900/4 p-3 text-[11.5px] text-muted">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider"><Badge tone="gold">prévia</Badge> o que os clientes vão ouvir</div>
        <div className="text-fg/85">{input.name} por <span className="num font-medium">{brl(price)}</span>{cfg.guarantee ? `, com ${cfg.guarantee.toLowerCase()}` : ""}{cfg.positioning ? ` — “${cfg.positioning}”` : ""}{cfg.offer_changes ? `. Mudanças: ${cfg.offer_changes.replace(/\n/g, "; ")}` : ""}</div>
      </div>

      <Button variant="gold" size="lg" className="w-full" onClick={() => simulate(cfg)} disabled={phase !== "idle"} loading={phase === "simulating"}>
        <Play className="size-4" /> Re-simular com 100 clientes
      </Button>
    </div>
  );
}
