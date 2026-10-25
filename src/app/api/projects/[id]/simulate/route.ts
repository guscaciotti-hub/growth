import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getOwnerToken } from "@/lib/owner";
import { ndjsonResponse } from "@/lib/stream";
import { runSimulation, summarizeRun } from "@/lib/ai/simulate";
import { ScenarioConfigSchema, defaultScenario, type SimResult } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  const store = getStore();
  const bundle = await store.getProject(token!, id);
  if (!bundle) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  if (!bundle.analysis) return NextResponse.json({ error: "Rode a análise primeiro" }, { status: 400 });
  if (bundle.personas.length === 0) return NextResponse.json({ error: "Gere os clientes antes de simular" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = ScenarioConfigSchema.safeParse({ ...defaultScenario(), ...(body?.scenario ?? {}) });
  const scenario = parsed.success ? parsed.data : defaultScenario();
  if (!scenario.label.trim()) scenario.label = `Cenário ${bundle.runs.length + 1}`;

  const runId = await store.createRun(token!, id, scenario);
  const input = bundle.project.input;
  const analysis = bundle.analysis.data;
  const personas = bundle.personas;

  return ndjsonResponse(async (emit) => {
    emit({ type: "run", id: runId, label: scenario.label, config: scenario });
    emit({ type: "status", message: `Apresentando a oferta para ${personas.length} clientes…`, progress: 0.05 });
    let done = 0;
    let results: SimResult[] = [];
    try {
      results = await runSimulation(input, analysis, personas, scenario, async (batch) => {
        done += batch.length;
        emit({ type: "results", batch, total: personas.length });
        emit({ type: "status", message: `${done}/${personas.length} clientes decidiram`, progress: 0.05 + 0.75 * (done / personas.length) });
        await store.saveResults(token!, runId, batch);
      });
      emit({ type: "status", message: "Sintetizando objeções, preço e veredito…", progress: 0.85 });
      const summary = await summarizeRun(input, analysis, personas, results, scenario);
      await store.finishRun(token!, runId, summary, "done");
      emit({ type: "summary", data: summary, runId });
    } catch (err) {
      await store.finishRun(token!, runId, null, "error").catch(() => undefined);
      throw err;
    }
  });
}
