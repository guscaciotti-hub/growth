import { NextResponse } from "next/server";
import { simulateBatch } from "@/lib/ai/simulate";
import { Body, costEntry, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.simulate);
  if (!b.ok) return b.res;
  try {
    const { results, usage } = await simulateBatch(b.data.input, b.data.analysis, b.data.personas, b.data.scenario);
    const first = b.data.personas[0]?.idx ?? 0;
    return NextResponse.json({ results, cost: costEntry("simulate", `${b.data.scenario.label}: clientes ${first + 1}–${first + b.data.personas.length}`, usage), mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
