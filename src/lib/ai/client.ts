import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/** Modelo principal (análise, síntese). Troque via env AI_MODEL_ANALYSIS. */
export const MODEL_ANALYSIS = process.env.AI_MODEL_ANALYSIS ?? "claude-opus-5-5";
/** Modelo das personas e da simulação (100 clientes). Troque via env AI_MODEL_SIM. */
export const MODEL_SIM = process.env.AI_MODEL_SIM ?? "claude-opus-5-5";

export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Sem chave de API (ou AI_MOCK=1) o sistema roda em modo demonstração com dados sintéticos. */
export function isMockMode(): boolean {
  return process.env.AI_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ timeout: 10 * 60 * 1000, maxRetries: 3 });
  }
  return client;
}

export class RefusalError extends Error {
  constructor(public category: string | null, explanation?: string) {
    super(explanation ?? "O modelo recusou a solicitação.");
  }
}

export function textOf(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

/**
 * Chamada com saída estruturada. Se a API recusar o esquema por ser grande demais
 * ("compiled grammar is too large"), repete pedindo JSON livre e valida com o mesmo esquema.
 */
export async function structured<T extends z.ZodTypeAny>(opts: {
  model: string;
  system: string;
  prompt: string;
  schema: T;
  effort: "low" | "medium" | "high";
  maxTokens: number;
}): Promise<{ data: z.infer<T>; raw: Anthropic.Beta.BetaMessage }> {
  const client = anthropic();
  try {
    const res = await client.beta.messages.parse({
      model: opts.model,
      max_tokens: opts.maxTokens,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    if (res.stop_reason === "refusal") throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
    if (res.parsed_output) return { data: res.parsed_output as z.infer<T>, raw: res };
    // sem parsed_output: tenta extrair do texto
    const parsed = parseJsonText(textOf(res.content as Array<{ type: string; text?: string }>), opts.schema);
    if (parsed) return { data: parsed, raw: res };
    throw new Error("A resposta não veio no formato esperado. Tente novamente.");
  } catch (err) {
    if (!(err instanceof Anthropic.BadRequestError) || !/grammar is too large|too large/i.test(err.message)) throw err;
  }
  // Caminho alternativo: JSON livre guiado pelo JSON Schema
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const res = await client.beta.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: opts.effort },
    system: `${opts.system}\n\nFORMATO DE SAÍDA: responda somente com um objeto JSON válido (sem markdown, sem comentários, sem texto antes ou depois) que obedeça exatamente a este JSON Schema:\n${jsonSchema}`,
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (res.stop_reason === "refusal") throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
  const text = textOf(res.content as Array<{ type: string; text?: string }>);
  const parsed = parseJsonText(text, opts.schema);
  if (!parsed) throw new Error("O modelo devolveu JSON inválido para este esquema. Tente novamente.");
  return { data: parsed, raw: res };
}

function parseJsonText<T extends z.ZodTypeAny>(text: string, schema: T): z.infer<T> | null {
  const candidates: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1]);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  candidates.push(text);
  for (const c of candidates) {
    try {
      const r = schema.safeParse(JSON.parse(c));
      if (r.success) return r.data;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}
