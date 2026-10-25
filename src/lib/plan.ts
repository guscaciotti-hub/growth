import type { Analysis } from "./types";

/* Planejamento puro (sem SDK) dos lotes de personas; usado no cliente e no servidor. */
export const PERSONA_COUNT = 100;
const BATCH = 25;

export type PersonaBatchPlan = { start: number; count: number; plan: { segment: string; count: number }[] };

export function allocateSegments(analysis: Analysis, total: number) {
  const segs = analysis.icp.segments.length ? analysis.icp.segments : [{ name: "Cliente ideal", share_pct: 100 }];
  const sum = segs.reduce((s, x) => s + x.share_pct, 0) || 1;
  const alloc = segs.map((s) => ({ segment: s.name, count: Math.floor((s.share_pct / sum) * total) }));
  let diff = total - alloc.reduce((s, x) => s + x.count, 0);
  for (let i = 0; diff > 0; i = (i + 1) % alloc.length, diff--) alloc[i].count++;
  return alloc;
}

export function planPersonaBatches(analysis: Analysis): PersonaBatchPlan[] {
  const plan = allocateSegments(analysis, PERSONA_COUNT);
  const batches: PersonaBatchPlan[] = [];
  let cursor = 0;
  const remaining = plan.map((p) => ({ ...p }));
  while (cursor < PERSONA_COUNT) {
    const count = Math.min(BATCH, PERSONA_COUNT - cursor);
    const bp: { segment: string; count: number }[] = [];
    let need = count;
    for (const r of remaining) {
      if (need === 0) break;
      const take = Math.min(r.count, Math.max(1, Math.round((r.count / (PERSONA_COUNT - cursor)) * count)), need);
      if (take > 0) {
        bp.push({ segment: r.segment, count: take });
        r.count -= take;
        need -= take;
      }
    }
    for (const r of remaining) {
      if (need === 0) break;
      if (r.count > 0) {
        const take = Math.min(r.count, need);
        const e = bp.find((x) => x.segment === r.segment);
        if (e) e.count += take;
        else bp.push({ segment: r.segment, count: take });
        r.count -= take;
        need -= take;
      }
    }
    batches.push({ start: cursor, count, plan: bp });
    cursor += count;
  }
  return batches;
}
