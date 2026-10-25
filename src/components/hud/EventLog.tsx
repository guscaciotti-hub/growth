"use client";
import { useEffect, useRef } from "react";
import { useProject } from "@/store/useProject";
import { cx } from "@/components/ui";

export function EventLog() {
  const log = useProject((s) => s.log);
  const selectPersona = useProject((s) => s.selectPersona);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);
  if (!log.length) return null;
  return (
    <div className="pointer-events-auto glass absolute bottom-3 right-3 z-20 hidden w-[300px] rounded-2xl lg:block">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Acontecendo na cidade</span>
        <span className="text-[10px] text-muted">{log.length}</span>
      </div>
      <div ref={ref} className="scroll-thin max-h-40 space-y-1 overflow-y-auto px-3 pb-3">
        {log.slice(-60).map((e) => (
          <button
            key={e.id}
            onClick={() => e.personaIdx !== undefined && selectPersona(e.personaIdx)}
            className={cx("flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left text-[11.5px] leading-snug transition", e.personaIdx !== undefined ? "hover:bg-slate-900/6" : "cursor-default")}
          >
            <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", e.kind === "buy" && "bg-buy", e.kind === "later" && "bg-later", e.kind === "reject" && "bg-reject", e.kind === "info" && "bg-accent")} />
            <span className={cx(e.kind === "info" ? "text-accent/90" : "text-fg/85")}>{e.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
