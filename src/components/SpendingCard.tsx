"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { allCosts } from "@/lib/local";
import { cachedUsdBrl, fetchUsdBrl } from "@/lib/fx";
import { STEP_LABEL } from "@/lib/pricing";
import { brlFx, shortModel, usd } from "@/components/hud/panels/Costs";
import { num } from "@/lib/format";

export function SpendingCard() {
  const [rows, setRows] = useState<ReturnType<typeof allCosts>>([]);
  const [fx, setFx] = useState(cachedUsdBrl());
  useEffect(() => {
    setRows(allCosts());
    fetchUsdBrl().then(setFx).catch(() => undefined);
  }, []);
  if (!rows.length) return null;
  const totalUsd = rows.reduce((a, r) => a + r.entry.usd, 0);
  const byProject = new Map<string, { name: string; usd: number; calls: number }>();
  for (const r of rows) {
    const e = byProject.get(r.projectId) ?? { name: r.projectName, usd: 0, calls: 0 };
    e.usd += r.entry.usd; e.calls += r.entry.calls;
    byProject.set(r.projectId, e);
  }
  const month = rows.filter((r) => new Date(r.entry.at).getMonth() === new Date().getMonth() && new Date(r.entry.at).getFullYear() === new Date().getFullYear()).reduce((a, r) => a + r.entry.usd, 0);
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Wallet className="size-5 text-gold" /> Gastos com IA</h2>
        <span className="text-xs text-muted">cotação R$ {fx.rate.toFixed(2)} · {fx.source}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">Total neste navegador</div>
          <div className="num mt-1 text-3xl font-bold">{brlFx(totalUsd * fx.rate)}</div>
          <div className="num text-sm text-muted">{usd(totalUsd)} · {rows.length} chamadas</div>
          <div className="mt-3 text-[11px] uppercase tracking-wider text-muted">Este mês</div>
          <div className="num text-xl font-semibold">{brlFx(month * fx.rate)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">Por negócio</div>
          <ul className="space-y-1.5 text-sm">
            {[...byProject.entries()].sort((a, b) => b[1].usd - a[1].usd).slice(0, 6).map(([id, p]) => (
              <li key={id} className="flex items-center justify-between gap-2">
                <Link href={`/projeto/${id}`} className="truncate hover:text-accent">{p.name}</Link>
                <span className="num shrink-0 font-semibold">{brlFx(p.usd * fx.rate)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">Últimas chamadas</div>
          <ul className="scroll-thin max-h-44 space-y-1.5 overflow-y-auto text-[12px]">
            {rows.slice(0, 12).map((r) => (
              <li key={r.entry.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate"><span className="text-muted">{STEP_LABEL[r.entry.step]}</span> · {r.entry.label} <span className="text-muted">· {shortModel(r.entry.model)} · {num(r.entry.input_tokens + r.entry.output_tokens)} tok</span></span>
                <span className="num shrink-0 font-semibold">{r.entry.demo ? "R$ 0,00" : brlFx(r.entry.usd * fx.rate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
