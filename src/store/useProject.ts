"use client";
import { create } from "zustand";
import type { Persona, ProjectBundle, Run, ScenarioConfig, SimResult, StreamEvent } from "@/lib/types";
import { readNdjson } from "@/lib/stream";

export type Phase = "idle" | "analyzing" | "personas" | "simulating";
export type PanelKey = "overview" | "market" | "customers" | "simulation" | "adjust";

export type LogEntry = { id: number; t: number; kind: "buy" | "later" | "reject" | "info"; text: string; personaIdx?: number };

type State = {
  bundle: ProjectBundle | null;
  mode: "demo" | "live";
  loading: boolean;
  error: string | null;
  phase: Phase;
  statusMessage: string;
  progress: number;
  research: string | null;
  log: LogEntry[];
  selectedPersonaIdx: number | null;
  activeRunId: string | null;
  panel: PanelKey;
  cameraFocus: "hq" | "overview" | number;
  load: (id: string) => Promise<void>;
  analyze: (opts?: { skipResearch?: boolean }) => Promise<void>;
  generatePersonas: () => Promise<void>;
  simulate: (scenario: ScenarioConfig) => Promise<void>;
  selectPersona: (idx: number | null) => void;
  setPanel: (p: PanelKey) => void;
  setActiveRun: (id: string | null) => void;
  setCameraFocus: (f: "hq" | "overview" | number) => void;
  clearError: () => void;
};

let logId = 0;

export const useProject = create<State>((set, get) => ({
  bundle: null,
  mode: "demo",
  loading: false,
  error: null,
  phase: "idle",
  statusMessage: "",
  progress: 0,
  research: null,
  log: [],
  selectedPersonaIdx: null,
  activeRunId: null,
  panel: "overview",
  cameraFocus: "overview",

  async load(id) {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 404 ? "Projeto não encontrado neste navegador." : `Erro ${res.status}`);
      const data = await res.json();
      const bundle: ProjectBundle = { project: data.project, analysis: data.analysis, personas: data.personas ?? [], runs: data.runs ?? [] };
      const lastDone = [...bundle.runs].reverse().find((r) => r.status === "done") ?? bundle.runs.at(-1) ?? null;
      set({
        bundle,
        mode: data.mode?.ai === "live" ? "live" : "demo",
        research: bundle.analysis?.research ?? null,
        activeRunId: lastDone?.id ?? null,
        loading: false,
        panel: lastDone ? "simulation" : bundle.analysis ? "overview" : "overview",
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  async analyze(opts) {
    const b = get().bundle;
    if (!b || get().phase !== "idle") return;
    set({ phase: "analyzing", progress: 0.02, statusMessage: "Preparando análise…", error: null, panel: "overview" });
    pushLog(set, { kind: "info", text: "Análise de viabilidade iniciada." });
    try {
      const res = await fetch(`/api/projects/${b.project.id}/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skipResearch: opts?.skipResearch ?? false }) });
      await readNdjson(res, (e) => handleEvent(e, set, get));
      set({ cameraFocus: "hq" });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ phase: "idle", progress: 0 });
    }
  },

  async generatePersonas() {
    const b = get().bundle;
    if (!b || get().phase !== "idle") return;
    set({ phase: "personas", progress: 0.02, statusMessage: "Gerando clientes…", error: null, panel: "customers" });
    set((s) => ({ bundle: s.bundle ? { ...s.bundle, personas: [] } : s.bundle }));
    pushLog(set, { kind: "info", text: "Gerando 100 clientes dentro do ICP." });
    try {
      const res = await fetch(`/api/projects/${b.project.id}/personas`, { method: "POST" });
      await readNdjson(res, (e) => handleEvent(e, set, get));
      set({ cameraFocus: "overview" });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ phase: "idle", progress: 0 });
    }
  },

  async simulate(scenario) {
    const b = get().bundle;
    if (!b || get().phase !== "idle") return;
    set({ phase: "simulating", progress: 0.02, statusMessage: "Abrindo as portas…", error: null, panel: "simulation", selectedPersonaIdx: null });
    pushLog(set, { kind: "info", text: `Simulação "${scenario.label}" iniciada.` });
    try {
      const res = await fetch(`/api/projects/${b.project.id}/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario }) });
      await readNdjson(res, (e) => handleEvent(e, set, get));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ phase: "idle", progress: 0 });
    }
  },

  selectPersona: (idx) => set({ selectedPersonaIdx: idx, cameraFocus: idx === null ? get().cameraFocus : idx }),
  setPanel: (panel) => set({ panel }),
  setActiveRun: (id) => set({ activeRunId: id }),
  setCameraFocus: (cameraFocus) => set({ cameraFocus }),
  clearError: () => set({ error: null }),
}));

type Set = (fn: Partial<State> | ((s: State) => Partial<State>)) => void;

function pushLog(set: Set, e: Omit<LogEntry, "id" | "t">) {
  set((s) => ({ log: [...s.log.slice(-199), { ...e, id: ++logId, t: Date.now() }] }));
}

function handleEvent(e: StreamEvent, set: Set, get: () => State) {
  switch (e.type) {
    case "status":
      set({ statusMessage: e.message, ...(e.progress !== undefined ? { progress: e.progress } : {}) });
      break;
    case "research":
      set({ research: e.text });
      pushLog(set, { kind: "info", text: "Pesquisa de mercado concluída." });
      break;
    case "analysis":
      set((s) => ({
        bundle: s.bundle
          ? { ...s.bundle, analysis: { id: e.id, data: e.data, research: s.research, model: null, created_at: new Date().toISOString() }, project: { ...s.bundle.project, status: "analyzed" } }
          : s.bundle,
      }));
      pushLog(set, { kind: "info", text: `Veredito do analista: ${e.data.verdict.headline} (${e.data.verdict.success_score}/100)` });
      break;
    case "personas":
      set((s) => {
        if (!s.bundle) return {};
        const merged = [...s.bundle.personas, ...e.batch].sort((a, b) => a.idx - b.idx);
        return { bundle: { ...s.bundle, personas: merged, project: { ...s.bundle.project, status: "personas" } } };
      });
      break;
    case "run": {
      const run: Run = { id: e.id, label: e.label, config: e.config, status: "running", summary: null, results: [], created_at: new Date().toISOString(), finished_at: null };
      set((s) => ({ bundle: s.bundle ? { ...s.bundle, runs: [...s.bundle.runs, run], project: { ...s.bundle.project, status: "simulating" } } : s.bundle, activeRunId: e.id }));
      break;
    }
    case "results": {
      const runId = get().activeRunId;
      const personas = get().bundle?.personas ?? [];
      const byIdx = new Map<number, Persona>(personas.map((p) => [p.idx, p]));
      set((s) => {
        if (!s.bundle) return {};
        const runs = s.bundle.runs.map((r) => (r.id === runId ? { ...r, results: mergeResults(r.results, e.batch) } : r));
        return { bundle: { ...s.bundle, runs } };
      });
      for (const r of e.batch) {
        const p = byIdx.get(r.persona_idx);
        pushLog(set, {
          kind: r.decision === "compra" ? "buy" : r.decision === "depois" ? "later" : "reject",
          text: `${p?.name ?? "Cliente"}${p ? `, ${p.age}` : ""}: “${r.reasoning}”`,
          personaIdx: r.persona_idx,
        });
      }
      break;
    }
    case "summary":
      set((s) => {
        if (!s.bundle) return {};
        const runs = s.bundle.runs.map((r) => (r.id === e.runId ? { ...r, summary: e.data, status: "done" as const, finished_at: new Date().toISOString() } : r));
        return { bundle: { ...s.bundle, runs, project: { ...s.bundle.project, status: "simulated" } }, cameraFocus: "hq" };
      });
      pushLog(set, { kind: "info", text: e.data.headline });
      break;
    case "error":
      set({ error: e.message });
      pushLog(set, { kind: "info", text: `Erro: ${e.message}` });
      break;
    case "done":
      break;
  }
}

function mergeResults(prev: SimResult[], batch: SimResult[]): SimResult[] {
  const m = new Map(prev.map((r) => [r.persona_idx, r]));
  for (const r of batch) m.set(r.persona_idx, r);
  return [...m.values()].sort((a, b) => a.persona_idx - b.persona_idx);
}

/* seletores */
export const useActiveRun = () =>
  useProject((s) => {
    const runs = s.bundle?.runs ?? [];
    return runs.find((r) => r.id === s.activeRunId) ?? null;
  });
