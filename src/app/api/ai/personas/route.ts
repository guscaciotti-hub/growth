import { NextResponse } from "next/server";
import { generatePersonaBatch } from "@/lib/ai/personas";
import { Body, costEntry, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.personas);
  if (!b.ok) return b.res;
  try {
    const { personas, usage } = await generatePersonaBatch(b.data.input, b.data.analysis, b.data.batch);
    return NextResponse.json({ personas, cost: costEntry("personas", `Clientes ${b.data.batch.start + 1}–${b.data.batch.start + b.data.batch.count}`, usage), mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
