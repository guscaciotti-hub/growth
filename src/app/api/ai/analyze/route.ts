import { NextResponse } from "next/server";
import { analyzeBusiness } from "@/lib/ai/analyze";
import { Body, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.analyze);
  if (!b.ok) return b.res;
  try {
    const analysis = await analyzeBusiness(b.data.input, b.data.research);
    return NextResponse.json({ analysis, mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
