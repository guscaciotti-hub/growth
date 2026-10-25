import { NextResponse } from "next/server";
import { researchBusiness } from "@/lib/ai/analyze";
import { Body, fail, modeInfo, parseBody } from "../_shared";

export const maxDuration = 300;

export async function POST(req: Request) {
  const b = await parseBody(req, Body.research);
  if (!b.ok) return b.res;
  try {
    const research = await researchBusiness(b.data.input);
    return NextResponse.json({ research, mode: modeInfo() });
  } catch (e) {
    return fail(e);
  }
}
