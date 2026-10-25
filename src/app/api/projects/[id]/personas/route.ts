import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getOwnerToken } from "@/lib/owner";
import { ndjsonResponse } from "@/lib/stream";
import { generatePersonas, PERSONA_COUNT } from "@/lib/ai/personas";
import type { Persona } from "@/lib/types";

export const maxDuration = 300;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  const store = getStore();
  const bundle = await store.getProject(token!, id);
  if (!bundle) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  if (!bundle.analysis) return NextResponse.json({ error: "Rode a análise antes de gerar clientes" }, { status: 400 });

  return ndjsonResponse(async (emit) => {
    emit({ type: "status", message: `Gerando ${PERSONA_COUNT} clientes dentro do ICP "${bundle.analysis!.data.icp.name}"…`, progress: 0.05 });
    let done = 0;
    const all: Persona[] = [];
    await generatePersonas(bundle.project.input, bundle.analysis!.data, (batch) => {
      done += batch.length;
      all.push(...batch);
      emit({ type: "personas", batch, total: PERSONA_COUNT });
      emit({ type: "status", message: `${done}/${PERSONA_COUNT} clientes criados`, progress: 0.05 + 0.85 * (done / PERSONA_COUNT) });
    });
    emit({ type: "status", message: "Salvando clientes…", progress: 0.95 });
    await store.savePersonas(token!, id, all.sort((a, b) => a.idx - b.idx));
  });
}
