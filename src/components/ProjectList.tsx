"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";
import type { ProjectListItem } from "@/lib/types";
import { Badge, Spinner, cx } from "@/components/ui";
import { scoreToRating, ratingLabel } from "@/lib/format";

const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "later" | "buy" | "gold" }> = {
  draft: { label: "terreno", tone: "neutral" },
  analyzed: { label: "analisado", tone: "accent" },
  personas: { label: "clientes prontos", tone: "later" },
  simulating: { label: "simulando", tone: "later" },
  simulated: { label: "simulado", tone: "buy" },
};

export function ProjectList() {
  const [items, setItems] = useState<ProjectListItem[] | null>(null);
  const [mode, setMode] = useState<{ ai: string; storage: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao carregar");
      setItems(j.projects);
      setMode(j.mode);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Apagar este projeto e tudo que foi simulado?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Seus negócios</h2>
        {mode && (
          <div className="flex gap-1.5">
            <Badge tone={mode.ai === "live" ? "accent" : "later"}>{mode.ai === "live" ? "IA ao vivo" : "modo demonstração"}</Badge>
            <Badge tone={mode.storage === "memory" ? "neutral" : "buy"}>{mode.storage === "memory" ? "memória local" : "salvo na nuvem"}</Badge>
          </div>
        )}
      </div>
      {err && <p className="text-sm text-reject">{err}</p>}
      {!items && !err && <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Carregando…</div>}
      {items && items.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted">Nenhum negócio ainda. <Link href="/novo" className="text-accent hover:underline">Funde o primeiro</Link>.</div>
      )}
      {items && items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const st = STATUS[p.status] ?? STATUS.draft;
            const score = p.score === null ? null : Number(p.score);
            return (
              <li key={p.id} className="glass group relative rounded-2xl p-4 transition hover:border-accent/30">
                <Link href={`/projeto/${p.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{p.name}</h3>
                      <p className="truncate text-xs text-muted">{p.input?.category} · {p.input?.model}{p.input?.model !== "online" && p.input?.location?.city ? ` · ${p.input.location.city}` : ""}</p>
                    </div>
                    {score !== null && (
                      <div className={cx("shrink-0 rounded-lg px-2 py-1 text-center", score < 35 ? "bg-reject/15 text-reject" : score < 55 ? "bg-later/15 text-later" : score < 75 ? "bg-accent/15 text-accent" : "bg-buy/15 text-buy")}>
                        <div className="num text-lg font-bold leading-none">{Math.round(score)}</div>
                        <div className="text-[9px] uppercase tracking-wider">{ratingLabel[scoreToRating(score)]}</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {Number(p.runs) > 0 && <Badge>{p.runs} cenário{Number(p.runs) > 1 ? "s" : ""}</Badge>}
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-accent opacity-0 transition group-hover:opacity-100">abrir <ArrowRight className="size-3" /></span>
                  </div>
                </Link>
                <button onClick={() => remove(p.id)} className="absolute bottom-3 right-3 hidden rounded-md p-1 text-muted hover:bg-reject/15 hover:text-reject group-hover:block" aria-label="Apagar"><Trash2 className="size-3.5" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
