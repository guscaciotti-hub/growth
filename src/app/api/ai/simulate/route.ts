import { NextResponse } from "next/server";
import { simulateBatch } from "@/lib/ai/simulate";
import { Body, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.simulate);
  if (!b.ok) return b.res;
  try {
    const results = await simulateBatch(b.data.input, b.data.analysis, b.data.personas, b.data.scenario);
    return NextResponse.json({ results, mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
