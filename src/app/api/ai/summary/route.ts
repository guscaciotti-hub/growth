import { NextResponse } from "next/server";
import { summarizeRun } from "@/lib/ai/simulate";
import { Body, costEntry, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.summary);
  if (!b.ok) return b.res;
  try {
    const { summary, usage } = await summarizeRun(b.data.input, b.data.analysis, b.data.personas, b.data.results, b.data.scenario);
    return NextResponse.json({ summary, cost: costEntry("summary", `${b.data.scenario.label}: síntese`, usage), mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
