import type { Analysis, BusinessInput, Persona, ProjectBundle, ProjectListItem, ProjectStatus, Run, RunMetrics, RunSummary, ScenarioConfig, SimResult } from "../types";
import { hasSupabase, supabase } from "./supabase";

/* Toda persistência passa pelo owner token (cookie anônimo). No Supabase, as tabelas têm RLS
   sem políticas diretas e são acessadas só pelas funções sim_* (security definer) que validam o token. */

export interface Store {
  createProject(token: string, name: string, input: BusinessInput): Promise<string>;
  listProjects(token: string): Promise<ProjectListItem[]>;
  getProject(token: string, id: string): Promise<ProjectBundle | null>;
  updateProject(token: string, id: string, patch: { status?: ProjectStatus; input?: BusinessInput; name?: string }): Promise<void>;
  deleteProject(token: string, id: string): Promise<void>;
  saveAnalysis(token: string, projectId: string, data: Analysis, research: string | null, model: string): Promise<string>;
  savePersonas(token: string, projectId: string, personas: Persona[]): Promise<void>;
  createRun(token: string, projectId: string, config: ScenarioConfig): Promise<string>;
  saveResults(token: string, runId: string, results: SimResult[]): Promise<void>;
  finishRun(token: string, runId: string, summary: (RunSummary & { metrics: RunMetrics }) | null, status: Run["status"]): Promise<void>;
}

/** Esquema sim_* ausente no Supabase (migração não aplicada). */
export class SchemaMissingError extends Error {
  constructor(fn: string) {
    super(`Supabase sem o esquema do simulador (função ${fn} não encontrada). Aplique supabase/migrations/0001_sim_schema.sql.`);
  }
}

class SupabaseStore implements Store {
  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase().rpc(fn, args);
    if (error) {
      if (error.code === "P0002" || /not_found/.test(error.message)) throw new NotFoundError();
      if (error.code === "PGRST202" || /Could not find the function|schema cache/i.test(error.message)) throw new SchemaMissingError(fn);
      throw new Error(`${fn}: ${error.message}`);
    }
    return data as T;
  }
  createProject(token: string, name: string, input: BusinessInput) {
    return this.rpc<string>("sim_create_project", { p_token: token, p_name: name, p_input: input });
  }
  listProjects(token: string) {
    return this.rpc<ProjectListItem[]>("sim_list_projects", { p_token: token });
  }
  async getProject(token: string, id: string) {
    try {
      return await this.rpc<ProjectBundle | null>("sim_get_project", { p_token: token, p_id: id });
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }
  updateProject(token: string, id: string, patch: { status?: ProjectStatus; input?: BusinessInput; name?: string }) {
    return this.rpc<void>("sim_update_project", { p_token: token, p_id: id, p_status: patch.status ?? null, p_input: patch.input ?? null, p_name: patch.name ?? null });
  }
  deleteProject(token: string, id: string) {
    return this.rpc<void>("sim_delete_project", { p_token: token, p_id: id });
  }
  saveAnalysis(token: string, projectId: string, data: Analysis, research: string | null, model: string) {
    return this.rpc<string>("sim_save_analysis", { p_token: token, p_project_id: projectId, p_data: data, p_research: research, p_model: model });
  }
  async savePersonas(token: string, projectId: string, personas: Persona[]) {
    await this.rpc<number>("sim_save_personas", { p_token: token, p_project_id: projectId, p_personas: personas });
  }
  createRun(token: string, projectId: string, config: ScenarioConfig) {
    return this.rpc<string>("sim_create_run", { p_token: token, p_project_id: projectId, p_label: config.label, p_config: config });
  }
  async saveResults(token: string, runId: string, results: SimResult[]) {
    await this.rpc<number>("sim_save_results", { p_token: token, p_run_id: runId, p_results: results });
  }
  finishRun(token: string, runId: string, summary: (RunSummary & { metrics: RunMetrics }) | null, status: Run["status"]) {
    return this.rpc<void>("sim_finish_run", { p_token: token, p_run_id: runId, p_summary: summary, p_status: status });
  }
}

/* Fallback em memória para desenvolvimento sem Supabase (dados somem ao reiniciar). */
type Mem = { token: string; bundle: ProjectBundle };
const g = globalThis as unknown as { __simMem?: Map<string, Mem> };
const mem = (g.__simMem ??= new Map<string, Mem>());

class MemoryStore implements Store {
  private own(token: string, id: string): Mem {
    const m = mem.get(id);
    if (!m || m.token !== token) throw new NotFoundError();
    return m;
  }
  async createProject(token: string, name: string, input: BusinessInput) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mem.set(id, { token, bundle: { project: { id, name, status: "draft", input, created_at: now, updated_at: now }, analysis: null, personas: [], runs: [] } });
    return id;
  }
  async listProjects(token: string) {
    return [...mem.values()]
      .filter((m) => m.token === token)
      .map((m) => ({ ...m.bundle.project, score: m.bundle.analysis?.data.verdict.success_score ?? null, runs: m.bundle.runs.length }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  async getProject(token: string, id: string) {
    const m = mem.get(id);
    return m && m.token === token ? structuredClone(m.bundle) : null;
  }
  async updateProject(token: string, id: string, patch: { status?: ProjectStatus; input?: BusinessInput; name?: string }) {
    const m = this.own(token, id);
    Object.assign(m.bundle.project, { ...patch, updated_at: new Date().toISOString() });
  }
  async deleteProject(token: string, id: string) {
    this.own(token, id);
    mem.delete(id);
  }
  async saveAnalysis(token: string, projectId: string, data: Analysis, research: string | null, model: string) {
    const m = this.own(token, projectId);
    const id = crypto.randomUUID();
    m.bundle.analysis = { id, data, research, model, created_at: new Date().toISOString() };
    m.bundle.project.status = "analyzed";
    return id;
  }
  async savePersonas(token: string, projectId: string, personas: Persona[]) {
    const m = this.own(token, projectId);
    m.bundle.personas = [...personas].sort((a, b) => a.idx - b.idx);
    m.bundle.project.status = "personas";
  }
  async createRun(token: string, projectId: string, config: ScenarioConfig) {
    const m = this.own(token, projectId);
    const id = crypto.randomUUID();
    m.bundle.runs.push({ id, label: config.label, config, status: "running", summary: null, results: [], created_at: new Date().toISOString(), finished_at: null });
    m.bundle.project.status = "simulating";
    return id;
  }
  async saveResults(token: string, runId: string, results: SimResult[]) {
    for (const m of mem.values()) {
      if (m.token !== token) continue;
      const run = m.bundle.runs.find((r) => r.id === runId);
      if (run) {
        const byIdx = new Map(run.results.map((r) => [r.persona_idx, r]));
        for (const r of results) byIdx.set(r.persona_idx, r);
        run.results = [...byIdx.values()].sort((a, b) => a.persona_idx - b.persona_idx);
        return;
      }
    }
    throw new NotFoundError();
  }
  async finishRun(token: string, runId: string, summary: (RunSummary & { metrics: RunMetrics }) | null, status: Run["status"]) {
    for (const m of mem.values()) {
      if (m.token !== token) continue;
      const run = m.bundle.runs.find((r) => r.id === runId);
      if (run) {
        run.summary = summary ?? run.summary;
        run.status = status;
        run.finished_at = new Date().toISOString();
        if (status === "done") m.bundle.project.status = "simulated";
        return;
      }
    }
    throw new NotFoundError();
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("not_found");
  }
}

/* Se o Supabase está configurado mas o esquema não foi migrado, cai para memória
   (com aviso) em vez de derrubar o app. */
class ResilientStore implements Store {
  private primary: Store = new SupabaseStore();
  private fallback: Store = new MemoryStore();
  degraded = false;
  private async run<T>(fn: (s: Store) => Promise<T>): Promise<T> {
    if (this.degraded) return fn(this.fallback);
    try {
      return await fn(this.primary);
    } catch (e) {
      if (e instanceof SchemaMissingError) {
        console.warn(`[store] ${e.message} Usando memória até a migração ser aplicada.`);
        this.degraded = true;
        return fn(this.fallback);
      }
      throw e;
    }
  }
  createProject(t: string, n: string, i: BusinessInput) { return this.run((s) => s.createProject(t, n, i)); }
  listProjects(t: string) { return this.run((s) => s.listProjects(t)); }
  getProject(t: string, id: string) { return this.run((s) => s.getProject(t, id)); }
  updateProject(t: string, id: string, p: { status?: ProjectStatus; input?: BusinessInput; name?: string }) { return this.run((s) => s.updateProject(t, id, p)); }
  deleteProject(t: string, id: string) { return this.run((s) => s.deleteProject(t, id)); }
  saveAnalysis(t: string, p: string, d: Analysis, r: string | null, m: string) { return this.run((s) => s.saveAnalysis(t, p, d, r, m)); }
  savePersonas(t: string, p: string, ps: Persona[]) { return this.run((s) => s.savePersonas(t, p, ps)); }
  createRun(t: string, p: string, c: ScenarioConfig) { return this.run((s) => s.createRun(t, p, c)); }
  saveResults(t: string, r: string, res: SimResult[]) { return this.run((s) => s.saveResults(t, r, res)); }
  finishRun(t: string, r: string, sum: (RunSummary & { metrics: RunMetrics }) | null, st: Run["status"]) { return this.run((s) => s.finishRun(t, r, sum, st)); }
}

const g2 = globalThis as unknown as { __simStore?: Store };
export function getStore(): Store {
  if (!g2.__simStore) {
    g2.__simStore = hasSupabase() ? new ResilientStore() : new MemoryStore();
    if (!hasSupabase()) console.warn("[store] Supabase não configurado: usando memória (dados não persistem).");
  }
  return g2.__simStore;
}
export const storageMode = (): "supabase" | "memory" => {
  if (!hasSupabase()) return "memory";
  const s = g2.__simStore;
  return s instanceof ResilientStore && s.degraded ? "memory" : "supabase";
};
