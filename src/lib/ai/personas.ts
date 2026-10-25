import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PersonaBatchSchema, type Analysis, type BusinessInput, type Persona } from "../types";
import { anthropic, FALLBACK_BETA, MODEL_SIM, RefusalError, isMockMode } from "./client";
import { ANALYST_SYSTEM, personaBatchPrompt } from "./prompts";
import { mockPersonas } from "./mock";
import { emptyUsage, usageOf, type Usage } from "../pricing";

import { planPersonaBatches, PERSONA_COUNT, type PersonaBatchPlan } from "../plan";
export { PERSONA_COUNT };

/** Gera um único lote de personas (chamada curta, boa para serverless). */
export async function generatePersonaBatch(input: BusinessInput, analysis: Analysis, b: PersonaBatchPlan): Promise<{ personas: Persona[]; usage: Usage }> {
  if (isMockMode()) return { personas: await mockBatch(input, analysis, b.start, b.count, b.plan), usage: emptyUsage("demo") };
  return realBatch(input, analysis, b.start, b.count, b.plan);
}

/** Gera 100 personas do ICP em lotes paralelos; chama onBatch a cada lote. */
export async function generatePersonas(
  input: BusinessInput,
  analysis: Analysis,
  onBatch: (batch: Persona[]) => Promise<void> | void,
): Promise<Persona[]> {
  const batches = planPersonaBatches(analysis);
  const all: Persona[] = [];
  await Promise.all(
    batches.map(async (b) => {
      const { personas } = await generatePersonaBatch(input, analysis, b);
      all.push(...personas);
      await onBatch(personas);
    }),
  );
  return all.sort((a, b) => a.idx - b.idx);
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
): Promise<{ personas: Persona[]; usage: Usage }> {
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
  return { personas: res.parsed_output.personas.slice(0, count).map((p, i) => ({ ...p, idx: start + i })), usage: usageOf(res, MODEL_SIM) };
}
