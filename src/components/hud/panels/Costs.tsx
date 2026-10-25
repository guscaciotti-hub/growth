"use client";
import { useMemo } from "react";
import { Wallet, Info } from "lucide-react";
import { useProject } from "@/store/useProject";
import { Badge, Empty, Stat } from "@/components/ui";
import { STEP_LABEL, type CostEntry } from "@/lib/pricing";
import { num } from "@/lib/format";

export const usd = (v: number) => `US$ ${v.toFixed(v < 1 ? 3 : 2)}`;
export const brlFx = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export function CostsPanel() {
  const bundle = useProject((s) => s.bundle)!;
  const fx = useProject((s) => s.usdBrl);
  const costs = bundle.costs ?? [];
  const agg = useMemo(() => summarize(costs), [costs]);

  if (!costs.length) {
    return <Empty icon={<Wallet className="size-8" />} title="Nenhum gasto ainda">Cada etapa de IA (pesquisa, análise, clientes, simulação) registra aqui os tokens usados e o custo em reais.</Empty>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-gold/8 p-3">
        <div className="text-[10px] uppercase tracking-wider text-gold">Gasto total deste projeto</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="num text-2xl font-bold">{brlFx(agg.usd * fx.rate)}</span>
          <span className="num text-sm text-muted">{usd(agg.usd)}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted">
          {agg.calls} chamadas · {num(agg.input)} tokens de entrada · {num(agg.output)} de saída{agg.search ? ` · ${agg.search} buscas na web` : ""}
          {agg.demo ? " · parte em modo demonstração (custo zero)" : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {agg.bySteps.map((s) => (
          <Stat key={s.step} label={STEP_LABEL[s.step]} value={brlFx(s.usd * fx.rate)} sub={`${s.calls} chamada${s.calls > 1 ? "s" : ""} · ${usd(s.usd)}`} />
        ))}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Histórico</div>
        <ul className="divide-y divide-slate-900/6 rounded-xl border border-slate-900/8">
          {[...costs].reverse().map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-[12px]">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.label}</div>
                <div className="text-[11px] text-muted">
                  {new Date(c.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {shortModel(c.model)} · {num(c.input_tokens)} in / {num(c.output_tokens)} out
                </div>
              </div>
              <div className="text-right">
                <div className="num font-semibold">{c.demo ? "R$ 0,00" : brlFx(c.usd * fx.rate)}</div>
                {c.demo ? <Badge tone="later">demo</Badge> : <div className="num text-[10px] text-muted">{usd(c.usd)}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Estimativa pela tabela pública da Anthropic (tokens de entrada, saída, cache e US$ 0,01 por busca na web). Cotação usada: R$ {fx.rate.toFixed(2)} por dólar ({fx.source}
          {fx.at ? `, ${new Date(fx.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}). O valor cobrado na sua conta pode variar com impostos e câmbio do cartão.
        </span>
      </p>
    </div>
  );
}

export function shortModel(m: string) {
  return m === "demo" ? "demonstração" : m.replace("claude-", "").replace(/-(\d)-(\d)$/, " $1.$2").replace(/-(\d)$/, " $1");
}

export function summarize(costs: CostEntry[]) {
  const by = new Map<CostEntry["step"], { step: CostEntry["step"]; usd: number; calls: number }>();
  let usd = 0, input = 0, output = 0, search = 0, calls = 0, demo = false;
  for (const c of costs) {
    usd += c.usd; input += c.input_tokens; output += c.output_tokens; search += c.web_search_requests; calls += c.calls; demo ||= c.demo;
    const e = by.get(c.step) ?? { step: c.step, usd: 0, calls: 0 };
    e.usd += c.usd; e.calls += c.calls;
    by.set(c.step, e);
  }
  const order: CostEntry["step"][] = ["research", "analysis", "personas", "simulate", "summary"];
  return { usd, input, output, search, calls, demo, bySteps: order.filter((s) => by.has(s)).map((s) => by.get(s)!) };
}
