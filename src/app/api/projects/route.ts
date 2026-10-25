import { NextResponse } from "next/server";
import { getStore, storageMode } from "@/lib/db/store";
import { getOwnerToken } from "@/lib/owner";
import { BusinessInputSchema } from "@/lib/types";
import { isMockMode } from "@/lib/ai/client";


export async function GET() {
  const token = await getOwnerToken();
  const projects = await getStore().listProjects(token!);
  return NextResponse.json({ projects, mode: { ai: isMockMode() ? "demo" : "live", storage: storageMode() } });
}

export async function POST(req: Request) {
  const token = await getOwnerToken();
  const body = await req.json().catch(() => null);
  const parsed = BusinessInputSchema.safeParse(body?.input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }
  const id = await getStore().createProject(token!, parsed.data.name, parsed.data);
  return NextResponse.json({ id });
}
