import { NextResponse } from "next/server";
import { summarizeRun } from "@/lib/ai/simulate";
import { Body, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.summary);
  if (!b.ok) return b.res;
  try {
    const summary = await summarizeRun(b.data.input, b.data.analysis, b.data.personas, b.data.results, b.data.scenario);
    return NextResponse.json({ summary, mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
