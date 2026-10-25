import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AnalysisSchema, type Analysis, type BusinessInput } from "../types";
import { anthropic, FALLBACK_BETA, MODEL_ANALYSIS, RefusalError, textOf, isMockMode } from "./client";
import { addUsage, emptyUsage, usageOf, type Usage } from "../pricing";
import { ANALYST_SYSTEM, analysisPrompt, researchPrompt } from "./prompts";
import { mockAnalysis, mockResearch } from "./mock";

/** Etapa 1: pesquisa na web (concorrentes, demografia, preços, regulação). */
export async function researchBusiness(input: BusinessInput, onStatus?: (m: string) => void): Promise<{ research: string; usage: Usage }> {
  if (isMockMode()) {
    await sleep(800);
    return { research: mockResearch(input), usage: emptyUsage("demo") };
  }
  let usage = emptyUsage(MODEL_ANALYSIS);
  const client = anthropic();
  const physical = input.model !== "online" && input.location.city;
  const tool: Anthropic.Beta.BetaWebSearchTool20260209 = {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 10,
    ...(physical
      ? {
          user_location: {
            type: "approximate",
            country: "BR",
            city: input.location.city,
            region: input.location.state || undefined,
          },
        }
      : {}),
  };

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: researchPrompt(input) }];
  let out = "";
  for (let turn = 0; turn < 4; turn++) {
    onStatus?.(turn === 0 ? "Pesquisando mercado, concorrentes e região…" : "Aprofundando a pesquisa…");
    const res = await client.beta.messages.create({
      model: MODEL_ANALYSIS,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: ANALYST_SYSTEM,
      tools: [tool],
      messages,
    });
    if (res.stop_reason === "refusal") {
      throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
    }
    usage = addUsage(usage, usageOf(res, MODEL_ANALYSIS));
    out += textOf(res.content as Array<{ type: string; text?: string }>);
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      messages.push({ role: "user", content: "Continue a pesquisa e finalize o briefing." });
      continue;
    }
    break;
  }
  return { research: out.trim(), usage };
}

/** Etapa 2: análise estruturada completa. */
export async function analyzeBusiness(input: BusinessInput, research: string | null): Promise<{ analysis: Analysis; usage: Usage }> {
  if (isMockMode()) {
    await sleep(1200);
    return { analysis: mockAnalysis(input), usage: emptyUsage("demo") };
  }
  const client = anthropic();
  const res = await client.beta.messages.parse({
    model: MODEL_ANALYSIS,
    max_tokens: 32000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "high", format: zodOutputFormat(AnalysisSchema) },
    system: ANALYST_SYSTEM,
    messages: [{ role: "user", content: analysisPrompt(input, research) }],
  });
  if (res.stop_reason === "refusal") {
    throw new RefusalError(res.stop_details?.category ?? null, res.stop_details?.explanation ?? undefined);
  }
  if (!res.parsed_output) throw new Error("A análise voltou sem JSON válido. Tente novamente.");
  return { analysis: normalizeAnalysis(res.parsed_output), usage: usageOf(res, MODEL_ANALYSIS) };
}

function normalizeAnalysis(a: Analysis): Analysis {
  const total = a.icp.segments.reduce((s, x) => s + x.share_pct, 0) || 1;
  a.icp.segments = a.icp.segments.map((s) => ({ ...s, share_pct: Math.round((s.share_pct / total) * 100) }));
  a.verdict.success_score = Math.max(0, Math.min(100, Math.round(a.verdict.success_score)));
  return a;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
