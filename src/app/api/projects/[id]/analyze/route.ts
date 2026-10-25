import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getOwnerToken } from "@/lib/owner";
import { ndjsonResponse } from "@/lib/stream";
import { analyzeBusiness, researchBusiness } from "@/lib/ai/analyze";
import { isMockMode, MODEL_ANALYSIS } from "@/lib/ai/client";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  const store = getStore();
  const bundle = await store.getProject(token!, id);
  if (!bundle) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const skipResearch = Boolean(body?.skipResearch);

  return ndjsonResponse(async (emit) => {
    const input = bundle.project.input;
    let research: string | null = null;
    if (!skipResearch) {
      emit({ type: "status", message: "Pesquisando mercado, concorrentes e região…", progress: 0.1 });
      try {
        research = await researchBusiness(input, (m) => emit({ type: "status", message: m, progress: 0.25 }));
        emit({ type: "research", text: research });
      } catch (err) {
        emit({ type: "status", message: `Pesquisa indisponível (${err instanceof Error ? err.message : "erro"}); seguindo com análise baseada em conhecimento.`, progress: 0.3 });
      }
    }
    emit({ type: "status", message: "Analisando mercado, preço, concorrência, ameaças e economia unitária…", progress: 0.45 });
    const analysis = await analyzeBusiness(input, research);
    emit({ type: "status", message: "Salvando análise…", progress: 0.9 });
    const analysisId = await store.saveAnalysis(token!, id, analysis, research, isMockMode() ? "demo" : MODEL_ANALYSIS);
    emit({ type: "analysis", data: analysis, id: analysisId });
  });
}
