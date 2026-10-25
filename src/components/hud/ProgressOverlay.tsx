"use client";
import { useProject } from "@/store/useProject";
import { Spinner } from "@/components/ui";

export function ProgressOverlay() {
  const { phase, statusMessage, progress, error, clearError } = useProject();
  if (phase === "idle" && !error) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 lg:bottom-44">
      {error ? (
        <div className="pointer-events-auto glass rise flex max-w-xl items-start gap-3 rounded-2xl border-reject/40 px-4 py-3">
          <div className="mt-0.5 size-2 shrink-0 rounded-full bg-reject" />
          <div className="text-sm text-fg/90">{error}</div>
          <button onClick={clearError} className="ml-2 text-xs text-muted hover:text-fg">fechar</button>
        </div>
      ) : (
        <div className="glass rise w-full max-w-md rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Spinner className="text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{statusMessage || "Trabalhando…"}</div>
              <div className="text-[11px] text-muted">
                {phase === "analyzing" && "Pesquisa, concorrência, preço, demografia, ameaças e economia unitária"}
                {phase === "personas" && "Criando 100 pessoas reais do seu ICP, com renda, rotina e objeções"}
                {phase === "simulating" && "Cada cliente ouve a oferta, levanta objeções e decide"}
              </div>
            </div>
            <div className="text-xs num text-muted">{Math.round(progress * 100)}%</div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900/8">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(3, progress * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
