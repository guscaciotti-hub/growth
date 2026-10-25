import { NextResponse } from "next/server";
import { analyzeBusiness } from "@/lib/ai/analyze";
import { Body, costEntry, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.analyze);
  if (!b.ok) return b.res;
  try {
    const { analysis, usage } = await analyzeBusiness(b.data.input, b.data.research);
    return NextResponse.json({ analysis, cost: costEntry("analysis", "Análise estruturada", usage), mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
