"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { useProject } from "@/store/useProject";
import { TopBar, MobileActions } from "@/components/hud/TopBar";
import { SidePanel } from "@/components/hud/SidePanel";
import { PersonaCard } from "@/components/hud/PersonaCard";
import { EventLog } from "@/components/hud/EventLog";
import { ProgressOverlay } from "@/components/hud/ProgressOverlay";
import { LiveCards } from "@/components/city/LiveCards";
import { Button, Spinner } from "@/components/ui";

const CityScene = dynamic(() => import("@/components/city/CityScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-bg text-muted">
      <div className="flex items-center gap-2 text-sm"><Spinner /> Construindo a cidade…</div>
    </div>
  ),
});

export function ProjectView({ id }: { id: string }) {
  const load = useProject((s) => s.load);
  const bundle = useProject((s) => s.bundle);
  const loading = useProject((s) => s.loading);
  const error = useProject((s) => s.error);

  useEffect(() => {
    load(id);
  }, [id, load]);

  if (!bundle) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted"><Spinner /> Carregando projeto…</div>
        ) : (
          <div className="glass max-w-md rounded-2xl p-6 text-center">
            <h1 className="text-lg font-semibold">Projeto não encontrado</h1>
            <p className="mt-2 text-sm text-muted">{error ?? "Os projetos ficam vinculados a este navegador."}</p>
            <Link href="/" className="mt-4 inline-block"><Button variant="ghost">Voltar ao início</Button></Link>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden lg:block">
      <div className="relative h-[38vh] w-full shrink-0 lg:absolute lg:inset-0 lg:h-full">
        <CityScene />
        <TopBar />
        <PersonaCard />
        <EventLog />
        <LiveCards />
        <ProgressOverlay />
        <div className="pointer-events-none absolute left-1/2 top-[76px] z-10 hidden -translate-x-1/2 items-center gap-3 rounded-full bg-white/80 px-3 py-1 text-[10.5px] text-muted xl:flex">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-buy" /> comprou</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-later" /> vai pensar</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-reject" /> recusou</span>
          <span className="opacity-70">· arraste para girar · clique numa pessoa</span>
        </div>
      </div>
      <MobileActions />
      <div className="relative z-20 flex min-h-0 flex-1 p-3 lg:absolute lg:bottom-4 lg:left-4 lg:top-[88px] lg:p-0">
        <SidePanel />
      </div>
    </main>
  );
}
