export const brl = (v: number | null | undefined, compact = false): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(v);
};

export const pct = (v: number, digits = 0): string => `${(v * 100).toFixed(digits)}%`;

export const num = (v: number): string => new Intl.NumberFormat("pt-BR").format(v);

export const median = (arr: number[]): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const ratingLabel: Record<string, string> = {
  inviavel: "Inviável",
  arriscado: "Arriscado",
  promissor: "Promissor",
  forte: "Forte",
};

export function scoreToRating(score: number): "inviavel" | "arriscado" | "promissor" | "forte" {
  if (score < 35) return "inviavel";
  if (score < 55) return "arriscado";
  if (score < 75) return "promissor";
  return "forte";
}
