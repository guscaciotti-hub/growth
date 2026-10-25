"use client";
import { create } from "zustand";
import type { Analysis, Persona, ProjectBundle, Run, RunMetrics, RunSummary, ScenarioConfig, SimResult } from "@/lib/types";
import { planPersonaBatches, PERSONA_COUNT } from "@/lib/plan";
import { loadLocal, progressOf, saveLocal } from "@/lib/local";

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
const SIM_BATCH = 10;
const SIM_CONCURRENCY = 5;

async function postJSON<T>(url: string, body: unknown): Promise<T & { mode?: { ai: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let j: { error?: string } & T;
  try {
    j = await res.json();
  } catch {
    throw new Error(res.ok ? "Resposta inválida do servidor." : `Erro ${res.status} no servidor (${res.statusText || "sem resposta"}).`);
  }
  if (!res.ok) throw new Error(j.error ?? `Erro ${res.status}`);
  return j;
}

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
    const local = loadLocal(id);
    let server: ProjectBundle | null = null;
    let mode: "demo" | "live" = get().mode;
    try {
      const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        server = { project: d.project, analysis: d.analysis, personas: d.personas ?? [], runs: d.runs ?? [] };
        mode = d.mode?.ai === "live" ? "live" : "demo";
      } else {
        const m = await fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        if (m?.mode?.ai) mode = m.mode.ai === "live" ? "live" : "demo";
      }
    } catch {
      /* offline ou servidor indisponível: usa a cópia local */
    }
    const bundle = progressOf(local) >= progressOf(server) ? local : server;
    if (!bundle) {
      set({ loading: false, error: "Projeto não encontrado neste navegador." });
      return;
    }
    saveLocal(bundle);
    const lastDone = [...bundle.runs].reverse().find((r) => r.status === "done") ?? bundle.runs.at(-1) ?? null;
    set({
      bundle,
      mode,
      research: bundle.analysis?.research ?? null,
      activeRunId: lastDone?.id ?? null,
      loading: false,
      panel: lastDone ? "simulation" : "overview",
    });
  },

  async analyze(opts) {
    const b = get().bundle;
    if (!b || get().phase !== "idle") return;
    set({ phase: "analyzing", progress: 0.03, statusMessage: "Preparando análise…", error: null, panel: "overview" });
    pushLog(set, { kind: "info", text: "Análise de viabilidade iniciada." });
    try {
      const input = b.project.input;
      let research: string | null = null;
      if (!opts?.skipResearch) {
        set({ statusMessage: "Pesquisando mercado, concorrentes e região…", progress: 0.12 });
        try {
          const r = await postJSON<{ research: string }>("/api/ai/research", { input });
          research = r.research;
          set({ research, ...(r.mode ? { mode: r.mode.ai === "live" ? "live" : "demo" } : {}) });
          pushLog(set, { kind: "info", text: "Pesquisa de mercado concluída." });
        } catch (e) {
          pushLog(set, { kind: "info", text: `Pesquisa indisponível (${e instanceof Error ? e.message : "erro"}); seguindo sem ela.` });
        }
      }
      set({ statusMessage: "Analisando mercado, preço, concorrência, ameaças e economia unitária…", progress: 0.45 });
      const a = await postJSON<{ analysis: Analysis }>("/api/ai/analyze", { input, research });
      const analysis = a.analysis;
      update(set, (bundle) => ({
        ...bundle,
        analysis: { id: crypto.randomUUID(), data: analysis, research, model: null, created_at: new Date().toISOString() },
        project: { ...bundle.project, status: "analyzed", updated_at: new Date().toISOString() },
      }));
      if (a.mode) set({ mode: a.mode.ai === "live" ? "live" : "demo" });
      pushLog(set, { kind: "info", text: `Veredito do analista: ${analysis.verdict.headline} (${analysis.verdict.success_score}/100)` });
      set({ cameraFocus: "hq", progress: 1 });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ phase: "idle", progress: 0 });
    }
  },

  async generatePersonas() {
    const b = get().bundle;
    if (!b || !b.analysis || get().phase !== "idle") return;
    const analysis = b.analysis.data;
    const input = b.project.input;
    set({ phase: "personas", progress: 0.03, statusMessage: `Gerando ${PERSONA_COUNT} clientes dentro do ICP "${analysis.icp.name}"…`, error: null, panel: "customers" });
    update(set, (bundle) => ({ ...bundle, personas: [] }));
    pushLog(set, { kind: "info", text: "Gerando 100 clientes dentro do ICP." });
    try {
      const batches = planPersonaBatches(analysis);
      let done = 0;
      await Promise.all(
        batches.map(async (batch) => {
          const r = await postJSON<{ personas: Persona[] }>("/api/ai/personas", { input, analysis, batch });
          done += r.personas.length;
          update(set, (bundle) => ({
            ...bundle,
            personas: [...bundle.personas, ...r.personas].sort((x, y) => x.idx - y.idx),
            project: { ...bundle.project, status: "personas", updated_at: new Date().toISOString() },
          }));
          set({ statusMessage: `${Math.min(done, PERSONA_COUNT)}/${PERSONA_COUNT} clientes criados`, progress: 0.05 + 0.9 * (done / PERSONA_COUNT) });
        }),
      );
      set({ cameraFocus: "overview" });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ phase: "idle", progress: 0 });
    }
  },

  async simulate(scenario) {
    const b = get().bundle;
    if (!b || !b.analysis || b.personas.length === 0 || get().phase !== "idle") return;
    const input = b.project.input;
    const analysis = b.analysis.data;
    const personas = b.personas;
    const runId = crypto.randomUUID();
    const run: Run = { id: runId, label: scenario.label || `Cenário ${b.runs.length + 1}`, config: scenario, status: "running", summary: null, results: [], created_at: new Date().toISOString(), finished_at: null };
    set({ phase: "simulating", progress: 0.03, statusMessage: `Apresentando a oferta para ${personas.length} clientes…`, error: null, panel: "simulation", selectedPersonaIdx: null, activeRunId: runId });
    update(set, (bundle) => ({ ...bundle, runs: [...bundle.runs, run], project: { ...bundle.project, status: "simulating" } }));
    pushLog(set, { kind: "info", text: `Simulação "${run.label}" iniciada.` });
    const byIdx = new Map<number, Persona>(personas.map((p) => [p.idx, p]));
    try {
      const chunks: Persona[][] = [];
      for (let i = 0; i < personas.length; i += SIM_BATCH) chunks.push(personas.slice(i, i + SIM_BATCH));
      let next = 0;
      let done = 0;
      const all: SimResult[] = [];
      const workers = Array.from({ length: Math.min(SIM_CONCURRENCY, chunks.length) }, async () => {
        while (next < chunks.length) {
          const chunk = chunks[next++];
          const r = await postJSON<{ results: SimResult[] }>("/api/ai/simulate", { input, analysis, personas: chunk, scenario });
          all.push(...r.results);
          done += chunk.length;
          update(set, (bundle) => ({
            ...bundle,
            runs: bundle.runs.map((x) => (x.id === runId ? { ...x, results: mergeResults(x.results, r.results) } : x)),
          }));
          for (const res of r.results) {
            const p = byIdx.get(res.persona_idx);
            pushLog(set, {
              kind: res.decision === "compra" ? "buy" : res.decision === "depois" ? "later" : "reject",
              text: `${p?.name ?? "Cliente"}${p ? `, ${p.age}` : ""}: “${res.reasoning}”`,
              personaIdx: res.persona_idx,
            });
          }
          set({ statusMessage: `${done}/${personas.length} clientes decidiram`, progress: 0.05 + 0.75 * (done / personas.length) });
        }
      });
      await Promise.all(workers);
      set({ statusMessage: "Sintetizando objeções, preço e veredito…", progress: 0.85 });
      const s = await postJSON<{ summary: RunSummary & { metrics: RunMetrics } }>("/api/ai/summary", { input, analysis, personas, results: all.sort((x, y) => x.persona_idx - y.persona_idx), scenario });
      update(set, (bundle) => ({
        ...bundle,
        runs: bundle.runs.map((x) => (x.id === runId ? { ...x, summary: s.summary, status: "done" as const, finished_at: new Date().toISOString() } : x)),
        project: { ...bundle.project, status: "simulated", updated_at: new Date().toISOString() },
      }));
      pushLog(set, { kind: "info", text: s.summary.headline });
      set({ cameraFocus: "hq" });
    } catch (e) {
      update(set, (bundle) => ({ ...bundle, runs: bundle.runs.map((x) => (x.id === runId ? { ...x, status: "error" as const, finished_at: new Date().toISOString() } : x)) }));
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

/** Atualiza o bundle e persiste no navegador. */
function update(set: Set, fn: (b: ProjectBundle) => ProjectBundle) {
  set((s) => {
    if (!s.bundle) return {};
    const bundle = fn(s.bundle);
    saveLocal(bundle);
    return { bundle };
  });
}

function mergeResults(prev: SimResult[], batch: SimResult[]): SimResult[] {
  const m = new Map(prev.map((r) => [r.persona_idx, r]));
  for (const r of batch) m.set(r.persona_idx, r);
  return [...m.values()].sort((a, b) => a.persona_idx - b.persona_idx);
}

export const useActiveRun = () =>
  useProject((s) => {
    const runs = s.bundle?.runs ?? [];
    return runs.find((r) => r.id === s.activeRunId) ?? null;
  });
