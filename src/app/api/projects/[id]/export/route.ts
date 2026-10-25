import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getOwnerToken } from "@/lib/owner";
import { computeMetrics } from "@/lib/metrics";

/** Exporta o projeto completo para o vídeo HyperFrames (video/assets/data.js) ou como JSON. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  const bundle = await getStore().getProject(token!, id);
  if (!bundle) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "js";
  const runs = bundle.runs.map((r) => ({
    ...r,
    summary: r.summary ?? null,
    metrics: r.summary?.metrics ?? (r.results.length && bundle.analysis ? computeMetrics(r.results, bundle.personas, bundle.project.input, bundle.analysis.data, r.config.price_override ?? bundle.project.input.price) : null),
  }));
  const payload = { exported_at: new Date().toISOString(), ...bundle, runs };
  const slug = bundle.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "projeto";

  if (format === "json") {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}.json"` },
    });
  }
  const js = `/* Founder City — dados exportados em ${payload.exported_at}. Salve como video/assets/data.js */\nwindow.FOUNDER_DATA = ${JSON.stringify(payload)};\n`;
  return new NextResponse(js, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Content-Disposition": `attachment; filename="data.js"` },
  });
}
