import { cookies } from "next/headers";

export const OWNER_COOKIE = "sim_owner";

/** Identidade anônima do dono dos projetos (cookie httpOnly com UUID). */
export async function getOwnerToken(create = true): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  if (!create) return null;
  const token = crypto.randomUUID();
  try {
    jar.set(OWNER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  } catch {
    /* cookies() só é gravável em route handlers/server actions */
  }
  return token;
}
