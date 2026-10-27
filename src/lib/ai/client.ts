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
}): Promise<{ data: z.infer<T>; raw: Anthropic.Beta.BetaMessage; repairs?: Anthropic.Beta.BetaMessage[] }> {
  const client = anthropic();
  let firstText: string | null = null;
  let firstRaw: Anthropic.Beta.BetaMessage | null = null;
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
    firstText = textOf(res.content as Array<{ type: string; text?: string }>);
    firstRaw = res;
    const parsed = parseJsonText(firstText, opts.schema);
    if (parsed.data) return { data: parsed.data, raw: res };
    console.warn("[ai] saída estruturada sem parsed_output", { stop_reason: res.stop_reason, issues: parsed.issues?.slice(0, 5) });
  } catch (err) {
    if (err instanceof RefusalError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    const grammar = err instanceof Anthropic.BadRequestError && /grammar is too large|too large/i.test(msg);
    if (!grammar && !(err instanceof Error && /parse|JSON|format/i.test(msg) && !(err instanceof Anthropic.APIError))) throw err;
    console.warn("[ai] saída estruturada indisponível, usando JSON livre:", msg.slice(0, 200));
  }

  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const formatRule = `FORMATO DE SAÍDA: responda somente com um objeto JSON válido (sem markdown, sem comentários, sem texto antes ou depois) que obedeça exatamente a este JSON Schema:\n${jsonSchema}`;

  // Caminho alternativo: JSON livre guiado pelo JSON Schema (pulado se já temos um texto da 1ª tentativa)
  let text = firstText;
  let raw = firstRaw;
  if (text === null) {
    const res = await client.beta.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: opts.effort },
      system: `${opts.system}\n\n${formatRule}`,
      messages: [{ role: "user", content: opts.prompt }],
    });
    if (res.stop_reason === "refusal") throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
    text = textOf(res.content as Array<{ type: string; text?: string }>);
    raw = res;
    const parsed = parseJsonText(text, opts.schema);
    if (parsed.data) return { data: parsed.data, raw: res };
    console.warn("[ai] JSON livre inválido", { stop_reason: res.stop_reason, chars: text.length, issues: parsed.issues?.slice(0, 5), head: text.slice(0, 300) });
  }

  // Reparo: devolve ao modelo o JSON inválido + erros de validação e pede a versão corrigida (barato, sem pesquisa)
  const repairs: Anthropic.Beta.BetaMessage[] = [];
  let current = text ?? "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsedBefore = parseJsonText(current, opts.schema);
    const issues = parsedBefore.issues ?? ["JSON incompleto ou malformado (provavelmente cortado)"];
    const truncated = raw?.stop_reason === "max_tokens" || !/\}\s*$/.test(current.trim());
    const res = await client.beta.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: `${opts.system}\n\n${formatRule}`,
      messages: [
        { role: "user", content: opts.prompt },
        { role: "assistant", content: current.slice(0, 120_000) || "{}" },
        {
          role: "user",
          content: `Sua resposta anterior ${truncated ? "foi cortada antes do fim e/ou" : ""} não passou na validação do esquema. Erros encontrados:\n- ${issues.slice(0, 25).join("\n- ")}\n\nReescreva a resposta COMPLETA como um único objeto JSON válido que obedeça ao esquema (mantenha o conteúdo e corrija só o que está errado; preencha o que faltou). Sem texto fora do JSON.`,
        },
      ],
    });
    repairs.push(res);
    if (res.stop_reason === "refusal") throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
    current = textOf(res.content as Array<{ type: string; text?: string }>);
    raw = res;
    const parsed = parseJsonText(current, opts.schema);
    if (parsed.data) return { data: parsed.data, raw: raw!, repairs };
    console.warn("[ai] reparo falhou", { attempt, stop_reason: res.stop_reason, issues: parsed.issues?.slice(0, 5) });
  }
  throw new Error("O modelo não conseguiu devolver a análise no formato esperado, mesmo após correção automática. Clique em Analisar de novo: a pesquisa já feita será reaproveitada.");
}

function parseJsonText<T extends z.ZodTypeAny>(text: string, schema: T): { data: z.infer<T> | null; issues?: string[] } {
  const candidates: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1]);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  candidates.push(text);
  let issues: string[] | undefined;
  for (const c of candidates) {
    try {
      const r = schema.safeParse(JSON.parse(c));
      if (r.success) return { data: r.data };
      issues = r.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`);
    } catch (e) {
      issues ??= [`JSON malformado: ${e instanceof Error ? e.message : String(e)}`];
    }
  }
  return { data: null, issues };
}
