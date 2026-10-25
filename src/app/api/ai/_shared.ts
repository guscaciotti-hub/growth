import { NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisSchema, BusinessInputSchema, PersonaSchema, ScenarioConfigSchema, SimResultSchema } from "@/lib/types";
import { isMockMode } from "@/lib/ai/client";

export const Body = {
  research: z.object({ input: BusinessInputSchema }),
  analyze: z.object({ input: BusinessInputSchema, research: z.string().nullable() }),
  personas: z.object({
    input: BusinessInputSchema,
    analysis: AnalysisSchema,
    batch: z.object({ start: z.number(), count: z.number(), plan: z.array(z.object({ segment: z.string(), count: z.number() })) }),
  }),
  simulate: z.object({ input: BusinessInputSchema, analysis: AnalysisSchema, personas: z.array(PersonaSchema), scenario: ScenarioConfigSchema }),
  summary: z.object({ input: BusinessInputSchema, analysis: AnalysisSchema, personas: z.array(PersonaSchema), results: z.array(SimResultSchema), scenario: ScenarioConfigSchema }),
};

export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: NextResponse }> {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, res: NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 }) };
  return { ok: true, data: parsed.data };
}

export function fail(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[ai]", message);
  return NextResponse.json({ error: message }, { status: 500 });
}

export const modeInfo = () => ({ ai: isMockMode() ? "demo" : "live" });
