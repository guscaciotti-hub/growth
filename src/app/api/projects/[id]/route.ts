import { NextResponse } from "next/server";
import { getStore, NotFoundError } from "@/lib/db/store";
import { getOwnerToken } from "@/lib/owner";
import { BusinessInputSchema, type BusinessInput } from "@/lib/types";
import { isMockMode } from "@/lib/ai/client";


type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  const bundle = await getStore().getProject(token!, id);
  if (!bundle) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  return NextResponse.json({ ...bundle, mode: { ai: isMockMode() ? "demo" : "live" } });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  const body = await req.json().catch(() => ({}));
  const patch: { input?: BusinessInput; name?: string } = {};
  if (body.input) {
    const parsed = BusinessInputSchema.safeParse(body.input);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
    patch.input = parsed.data;
    patch.name = parsed.data.name;
  }
  if (typeof body.name === "string") patch.name = body.name;
  try {
    await getStore().updateProject(token!, id, patch);
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const token = await getOwnerToken();
  try {
    await getStore().deleteProject(token!, id);
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
