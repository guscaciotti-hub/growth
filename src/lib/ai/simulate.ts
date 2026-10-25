import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  RunSummarySchema,
  SimBatchSchema,
  type Analysis,
  type BusinessInput,
  type Persona,
  type RunMetrics,
  type RunSummary,
  type ScenarioConfig,
  type SimResult,
} from "../types";
import { anthropic, FALLBACK_BETA, MODEL_ANALYSIS, MODEL_SIM, RefusalError, isMockMode } from "./client";
import { SIM_SYSTEM, ANALYST_SYSTEM, simulateBatchPrompt, summaryPrompt } from "./prompts";
import { computeMetrics, metricsToText } from "../metrics";
import { mockSimulateBatch, mockSummary } from "./mock";

const BATCH = 10;
const CONCURRENCY = 5;

/** Simula um único lote de personas (chamada curta, boa para serverless). */
export async function simulateBatch(input: BusinessInput, analysis: Analysis, personas: Persona[], scenario: ScenarioConfig): Promise<SimResult[]> {
  return isMockMode() ? mockBatchDelay(() => mockSimulateBatch(input, analysis, personas, scenario)) : realBatch(input, analysis, personas, scenario);
}

export async function runSimulation(
  input: BusinessInput,
  analysis: Analysis,
  personas: Persona[],
  scenario: ScenarioConfig,
  onBatch: (batch: SimResult[]) => Promise<void> | void,
): Promise<SimResult[]> {
  const batches: Persona[][] = [];
  for (let i = 0; i < personas.length; i += BATCH) batches.push(personas.slice(i, i + BATCH));

  const results: SimResult[] = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
    while (next < batches.length) {
      const b = batches[next++];
      const out = isMockMode()
        ? await mockBatchDelay(() => mockSimulateBatch(input, analysis, b, scenario))
        : await realBatch(input, analysis, b, scenario);
      results.push(...out);
      await onBatch(out);
    }
  });
  await Promise.all(workers);
  return results.sort((a, b) => a.persona_idx - b.persona_idx);
}

async function mockBatchDelay<T>(fn: () => T): Promise<T> {
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 1200));
  return fn();
}

async function realBatch(input: BusinessInput, analysis: Analysis, personas: Persona[], scenario: ScenarioConfig): Promise<SimResult[]> {
  const client = anthropic();
  const res = await client.beta.messages.parse({
    model: MODEL_SIM,
    max_tokens: 24000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "medium", format: zodOutputFormat(SimBatchSchema) },
    system: SIM_SYSTEM,
    messages: [{ role: "user", content: simulateBatchPrompt(input, analysis, personas, scenario) }],
  });
  if (res.stop_reason === "refusal") {
    throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
  }
  if (!res.parsed_output) throw new Error("Lote de simulação inválido.");
  const valid = new Set(personas.map((p) => p.idx));
  const seen = new Set<number>();
  const out: SimResult[] = [];
  for (const r of res.parsed_output.results) {
    if (valid.has(r.persona_idx) && !seen.has(r.persona_idx)) {
      seen.add(r.persona_idx);
      out.push(r);
    }
  }
  // personas que o modelo esqueceu entram como "depois" neutro para não quebrar a contagem
  for (const p of personas) {
    if (!seen.has(p.idx)) {
      out.push({
        persona_idx: p.idx,
        awareness_channel: p.preferred_channel,
        interest_level: 4,
        objections_raised: p.objections.slice(0, 1),
        objections_overcome: false,
        decision: "depois",
        willingness_to_pay_brl: 0,
        max_price_brl: Math.round((scenario.price_override ?? input.price) * 0.8),
        reasoning: "Preciso pensar melhor antes de decidir.",
        deal_breaker: null,
        what_would_convince: "Mais informações e prova social.",
        would_recommend: false,
        churn_risk: 3,
      });
    }
  }
  return out;
}

export async function summarizeRun(
  input: BusinessInput,
  analysis: Analysis,
  personas: Persona[],
  results: SimResult[],
  scenario: ScenarioConfig,
): Promise<RunSummary & { metrics: RunMetrics }> {
  const price = scenario.price_override ?? input.price;
  const metrics = computeMetrics(results, personas, input, analysis, price);
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 900));
    return { ...mockSummary(input, analysis, metrics, scenario), metrics };
  }
  const byIdx = new Map(personas.map((p) => [p.idx, p]));
  const sample = [...results]
    .sort(() => Math.random() - 0.5)
    .slice(0, 30)
    .map((r) => {
      const p = byIdx.get(r.persona_idx);
      return `- ${p?.name ?? r.persona_idx} (${p?.segment ?? "?"}, ${r.decision}): "${r.reasoning}"${r.deal_breaker ? ` [decisivo: ${r.deal_breaker}]` : ""} → convenceria: ${r.what_would_convince}`;
    })
    .join("\n");

  const client = anthropic();
  const res = await client.beta.messages.parse({
    model: MODEL_ANALYSIS,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "high", format: zodOutputFormat(RunSummarySchema) },
    system: ANALYST_SYSTEM,
    messages: [{ role: "user", content: summaryPrompt(input, analysis, scenario, metricsToText(metrics, price), sample) }],
  });
  if (res.stop_reason === "refusal") {
    throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
  }
  if (!res.parsed_output) throw new Error("Síntese inválida.");
  const s = res.parsed_output;
  s.success_score_after = Math.max(0, Math.min(100, Math.round(s.success_score_after)));
  return { ...s, metrics };
}
