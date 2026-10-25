import Anthropic from "@anthropic-ai/sdk";

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
