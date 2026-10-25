"use client";
import { useMemo, useState } from "react";
import { Users, Filter } from "lucide-react";
import { useProject, useActiveRun } from "@/store/useProject";
import { Badge, Button, Empty, cx } from "@/components/ui";
import { brl } from "@/lib/format";
import { DISTRICT_COLORS } from "@/components/city/layout";

export function CustomersPanel() {
  const bundle = useProject((s) => s.bundle)!;
  const phase = useProject((s) => s.phase);
  const gen = useProject((s) => s.generatePersonas);
  const selected = useProject((s) => s.selectedPersonaIdx);
  const select = useProject((s) => s.selectPersona);
  const run = useActiveRun();
  const [seg, setSeg] = useState<string | null>(null);
  const [dec, setDec] = useState<string | null>(null);
  const personas = bundle.personas;
  const a = bundle.analysis?.data;
  const results = useMemo(() => new Map(run?.results.map((r) => [r.persona_idx, r]) ?? []), [run?.results]);

  if (!a) return <Empty icon={<Users className="size-8" />} title="Primeiro, a análise">O ICP vem da análise. Depois geramos 100 clientes dentro dele.</Empty>;

  const list = personas.filter((p) => (!seg || p.segment === seg) && (!dec || results.get(p.idx)?.decision === dec));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/25 bg-accent/8 p-3">
        <div className="text-[10px] uppercase tracking-wider text-accent">Cliente ideal</div>
        <div className="text-[14px] font-semibold">{a.icp.name}</div>
        <p className="mt-1 text-[12px] text-fg/85">{a.icp.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">{a.icp.channels.map((c) => <Badge key={c} tone="accent">{c}</Badge>)}</div>
      </div>

      <div className="space-y-1.5">
        {a.icp.segments.map((s, i) => (
          <button key={s.name} onClick={() => setSeg(seg === s.name ? null : s.name)} className={cx("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition hover:bg-white/6", seg === s.name && "bg-white/8")}>
            <span className="size-2.5 rounded-full" style={{ background: DISTRICT_COLORS[i % DISTRICT_COLORS.length] }} />
            <span className="flex-1 font-medium">{s.name}</span>
            <span className="num text-muted">{s.share_pct}%</span>
          </button>
        ))}
      </div>

      {personas.length < 100 ? (
        <div className="space-y-3">
          <Empty icon={<Users className="size-8" />} title={personas.length ? `${personas.length}/100 clientes` : "Nenhum cliente ainda"}>
            Vamos criar 100 pessoas reais do seu ICP: renda, rotina, dores, o que usam hoje e as objeções que vão levantar.
          </Empty>
          <Button className="w-full" onClick={gen} loading={phase === "personas"} disabled={phase !== "idle"}>Gerar 100 clientes</Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Filter className="size-3" />
            {["compra", "depois", "nao_compra"].map((d) => (
              <button key={d} onClick={() => setDec(dec === d ? null : d)} className={cx("rounded-full border px-2 py-0.5 transition", dec === d ? "border-white/30 bg-white/10 text-fg" : "border-white/10 hover:bg-white/6")}>
                {d === "compra" ? "compraram" : d === "depois" ? "pensando" : "recusaram"}
              </button>
            ))}
            <span className="ml-auto num">{list.length}</span>
          </div>
          <ul className="grid grid-cols-1 gap-1.5">
            {list.map((p) => {
              const r = results.get(p.idx);
              return (
                <li key={p.idx}>
                  <button onClick={() => select(selected === p.idx ? null : p.idx)} className={cx("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/6", selected === p.idx && "bg-white/10 ring-1 ring-accent/50")}>
                    <span className="relative size-8 shrink-0 overflow-hidden rounded-lg" style={{ background: p.avatar.shirt }}>
                      <span className="absolute left-1/2 top-1.5 size-4 -translate-x-1/2 rounded-full" style={{ background: p.avatar.skin }} />
                      <span className="absolute left-1/2 top-1 h-2 w-4 -translate-x-1/2 rounded-t-full" style={{ background: p.avatar.hair }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[12.5px]"><span className="truncate font-medium">{p.name}</span><span className="text-muted">{p.age}</span></span>
                      <span className="block truncate text-[11px] text-muted">{p.occupation} · {brl(p.income_monthly_brl, true)}/mês</span>
                    </span>
                    {r && <span className={cx("size-2.5 shrink-0 rounded-full", r.decision === "compra" ? "bg-buy" : r.decision === "depois" ? "bg-later" : "bg-reject")} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" size="sm" className="w-full" onClick={gen} disabled={phase !== "idle"}>Gerar outros 100 clientes</Button>
        </>
      )}
    </div>
  );
}
