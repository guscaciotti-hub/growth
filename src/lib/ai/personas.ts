import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PersonaBatchSchema, type Analysis, type BusinessInput, type Persona } from "../types";
import { anthropic, FALLBACK_BETA, MODEL_SIM, RefusalError, isMockMode } from "./client";
import { ANALYST_SYSTEM, personaBatchPrompt } from "./prompts";
import { mockPersonas } from "./mock";

export const PERSONA_COUNT = 100;
const BATCH = 25;

/** Gera 100 personas do ICP em lotes paralelos; chama onBatch a cada lote. */
export async function generatePersonas(
  input: BusinessInput,
  analysis: Analysis,
  onBatch: (batch: Persona[]) => Promise<void> | void,
): Promise<Persona[]> {
  const plan = allocateSegments(analysis, PERSONA_COUNT);
  const batches: { start: number; count: number; plan: { segment: string; count: number }[] }[] = [];
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
    // distribui sobras
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

  const all: Persona[] = [];
  await Promise.all(
    batches.map(async (b) => {
      const personas = isMockMode()
        ? await mockBatch(input, analysis, b.start, b.count, b.plan)
        : await realBatch(input, analysis, b.start, b.count, b.plan);
      all.push(...personas);
      await onBatch(personas);
    }),
  );
  return all.sort((a, b) => a.idx - b.idx);
}

function allocateSegments(analysis: Analysis, total: number) {
  const segs = analysis.icp.segments.length ? analysis.icp.segments : [{ name: "Cliente ideal", share_pct: 100 }];
  const sum = segs.reduce((s, x) => s + x.share_pct, 0) || 1;
  const alloc = segs.map((s) => ({ segment: s.name, count: Math.floor((s.share_pct / sum) * total) }));
  let diff = total - alloc.reduce((s, x) => s + x.count, 0);
  for (let i = 0; diff > 0; i = (i + 1) % alloc.length, diff--) alloc[i].count++;
  return alloc;
}

async function mockBatch(input: BusinessInput, analysis: Analysis, start: number, count: number, plan: { segment: string; count: number }[]) {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 900));
  return mockPersonas(input, analysis, start, count, plan);
}

async function realBatch(
  input: BusinessInput,
  analysis: Analysis,
  start: number,
  count: number,
  plan: { segment: string; count: number }[],
): Promise<Persona[]> {
  const client = anthropic();
  const res = await client.beta.messages.parse({
    model: MODEL_SIM,
    max_tokens: 32000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "medium", format: zodOutputFormat(PersonaBatchSchema) },
    system: ANALYST_SYSTEM,
    messages: [{ role: "user", content: personaBatchPrompt(input, analysis, start, count, plan) }],
  });
  if (res.stop_reason === "refusal") {
    throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
  }
  if (!res.parsed_output) throw new Error("Lote de personas inválido.");
  // garante idx únicos e dentro do intervalo
  return res.parsed_output.personas.slice(0, count).map((p, i) => ({ ...p, idx: start + i }));
}
