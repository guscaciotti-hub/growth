"use client";
import type { ProjectBundle, ProjectListItem } from "./types";

/* Estado do projeto guardado no navegador: o servidor é só computação (IA).
   Funciona em qualquer hospedagem, mesmo sem banco. */

const KEY = "founder-city:project:";
const INDEX = "founder-city:index";

export function saveLocal(bundle: ProjectBundle) {
  try {
    localStorage.setItem(KEY + bundle.project.id, JSON.stringify(bundle));
    const idx = listLocalIds();
    if (!idx.includes(bundle.project.id)) localStorage.setItem(INDEX, JSON.stringify([bundle.project.id, ...idx]));
  } catch {
    /* quota ou modo privado */
  }
}

export function loadLocal(id: string): ProjectBundle | null {
  try {
    const raw = localStorage.getItem(KEY + id);
    return raw ? (JSON.parse(raw) as ProjectBundle) : null;
  } catch {
    return null;
  }
}

export function removeLocal(id: string) {
  try {
    localStorage.removeItem(KEY + id);
    localStorage.setItem(INDEX, JSON.stringify(listLocalIds().filter((x) => x !== id)));
  } catch {
    /* ignora */
  }
}

export function listLocalIds(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(INDEX) ?? "[]") as string[]) ?? [];
  } catch {
    return [];
  }
}

export function listLocal(): ProjectListItem[] {
  return listLocalIds()
    .map((id) => loadLocal(id))
    .filter((b): b is ProjectBundle => Boolean(b))
    .map((b) => ({ ...b.project, score: b.analysis?.data.verdict.success_score ?? null, runs: b.runs.length }));
}

/** Histórico de gastos de todos os projetos deste navegador. */
export function allCosts(): { projectId: string; projectName: string; entry: import("./pricing").CostEntry }[] {
  const out: { projectId: string; projectName: string; entry: import("./pricing").CostEntry }[] = [];
  for (const id of listLocalIds()) {
    const b = loadLocal(id);
    if (!b) continue;
    for (const entry of b.costs ?? []) out.push({ projectId: id, projectName: b.project.name, entry });
  }
  return out.sort((a, b) => b.entry.at.localeCompare(a.entry.at));
}

/** Quanto progresso um bundle tem (para escolher entre cópia local e do servidor). */
export function progressOf(b: ProjectBundle | null): number {
  if (!b) return -1;
  return (b.analysis ? 1 : 0) + (b.personas.length >= 100 ? 1 : 0) + b.runs.filter((r) => r.status === "done").length * 2 + b.runs.length;
}
