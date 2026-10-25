"use client";
/* Cotação USD→BRL para mostrar os gastos em reais. Busca uma vez por hora; sem rede usa a última conhecida. */
const KEY = "founder-city:usdbrl";
const FALLBACK = 5.5;

export function cachedUsdBrl(): { rate: number; at: string | null; source: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as { rate: number; at: string; source: string };
      if (j.rate > 0) return j;
    }
  } catch {
    /* ignora */
  }
  return { rate: FALLBACK, at: null, source: "padrão" };
}

export async function fetchUsdBrl(): Promise<{ rate: number; at: string | null; source: string }> {
  const cached = cachedUsdBrl();
  if (cached.at && Date.now() - new Date(cached.at).getTime() < 60 * 60 * 1000) return cached;
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { cache: "no-store" });
    const j = await res.json();
    const rate = Number(j?.USDBRL?.bid);
    if (rate > 0) {
      const v = { rate, at: new Date().toISOString(), source: "AwesomeAPI (comercial)" };
      localStorage.setItem(KEY, JSON.stringify(v));
      return v;
    }
  } catch {
    /* offline */
  }
  return cached;
}
