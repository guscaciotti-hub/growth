/* Tabela de preços da API Anthropic (US$ por milhão de tokens) e cálculo de custo por chamada. */

export type Usage = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  web_search_requests: number;
};

type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

const PRICES: Record<string, Price> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  "claude-fable-5": { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-7": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-6": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};
/** Busca na web: US$ 10 por 1.000 pesquisas. */
const WEB_SEARCH_PER_REQUEST = 0.01;

export function priceFor(model: string): Price {
  const key = Object.keys(PRICES).find((k) => model.startsWith(k));
  return key ? PRICES[key] : PRICES["claude-opus-5-5"];
}

export function emptyUsage(model: string): Usage {
  return { model, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, web_search_requests: 0 };
}

export function usageOf(res: { model?: string; usage?: object | null }, model: string): Usage {
  const u = (res.usage ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const stu = (u.server_tool_use ?? {}) as Record<string, unknown>;
  return {
    model: typeof res.model === "string" && res.model ? res.model : model,
    input_tokens: n(u.input_tokens),
    output_tokens: n(u.output_tokens),
    cache_read_input_tokens: n(u.cache_read_input_tokens),
    cache_creation_input_tokens: n(u.cache_creation_input_tokens),
    web_search_requests: n(stu.web_search_requests),
  };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    model: a.model || b.model,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
    web_search_requests: a.web_search_requests + b.web_search_requests,
  };
}

/** Custo em US$ de uma chamada. */
export function costUsd(u: Usage): number {
  const p = priceFor(u.model);
  const M = 1_000_000;
  return (
    (u.input_tokens * p.input + u.output_tokens * p.output + u.cache_read_input_tokens * p.cacheRead + u.cache_creation_input_tokens * p.cacheWrite) / M +
    u.web_search_requests * WEB_SEARCH_PER_REQUEST
  );
}

export type CostEntry = {
  id: string;
  at: string;
  step: "research" | "analysis" | "personas" | "simulate" | "summary";
  label: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  web_search_requests: number;
  usd: number;
  demo: boolean;
};

export const STEP_LABEL: Record<CostEntry["step"], string> = {
  research: "Pesquisa de mercado",
  analysis: "Análise de viabilidade",
  personas: "Geração de clientes",
  simulate: "Simulação",
  summary: "Síntese da simulação",
};
