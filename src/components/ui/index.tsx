"use client";
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "gold"; size?: "sm" | "md" | "lg"; loading?: boolean };
export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" }[size];
  const variants = {
    primary: "bg-accent text-[#06111c] hover:brightness-110 shadow-[0_0_24px_rgba(56,189,248,.35)]",
    gold: "bg-gold text-[#1a1304] hover:brightness-110 shadow-[0_0_24px_rgba(245,196,81,.35)]",
    ghost: "bg-white/5 text-fg hover:bg-white/10 border border-white/10",
    danger: "bg-reject/15 text-reject hover:bg-reject/25 border border-reject/30",
  }[variant];
  return (
    <button className={cx(base, sizes, variants, className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin", className)} />;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "buy" | "later" | "reject" | "accent" | "gold"; className?: string }) {
  const tones = {
    neutral: "bg-white/8 text-muted border-white/10",
    buy: "bg-buy/15 text-buy border-buy/30",
    later: "bg-later/15 text-later border-later/30",
    reject: "bg-reject/15 text-reject border-reject/30",
    accent: "bg-accent/15 text-accent border-accent/30",
    gold: "bg-gold/15 text-gold border-gold/30",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", tones, className)}>{children}</span>;
}

export function Panel({ children, className, title, right }: { children: ReactNode; className?: string; title?: ReactNode; right?: ReactNode }) {
  return (
    <section className={cx("glass rounded-2xl", className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          <h3 className="text-[13px] font-semibold tracking-wide text-fg/90 uppercase">{title}</h3>
          {right}
        </header>
      )}
      <div className={cx(title ? "px-4 pb-4" : "p-4")}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg/90">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-reject">{error}</p>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/60 outline-none focus:border-accent/60 focus:bg-white/8 focus:ring-2 focus:ring-accent/20 transition";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-[96px] resize-y", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none", props.className)} />;
}

export function Meter({ value, max = 5, tone = "accent", label }: { value: number; max?: number; tone?: "accent" | "buy" | "later" | "reject" | "gold"; label?: string }) {
  const colors = { accent: "bg-accent", buy: "bg-buy", later: "bg-later", reject: "bg-reject", gold: "bg-gold" }[tone];
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-24 shrink-0 text-xs text-muted">{label}</span>}
      <div className="h-1.5 flex-1 rounded-full bg-white/8 overflow-hidden">
        <div className={cx("h-full rounded-full transition-all duration-700", colors)} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <span className="w-8 text-right text-xs num text-muted">{Number.isInteger(value) ? value : value.toFixed(1)}</span>
    </div>
  );
}

export function Gauge({ value, size = 140, label, sub }: { value: number; size?: number; label?: string; sub?: string }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pctv = Math.max(0, Math.min(100, value));
  const color = pctv < 35 ? "var(--reject)" : pctv < 55 ? "var(--later)" : pctv < 75 ? "var(--accent)" : "var(--buy)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={10} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pctv / 100)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1), stroke .6s", filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-bold num leading-none" style={{ color }}>{Math.round(pctv)}</div>
          {label && <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">{label}</div>}
          {sub && <div className="text-[11px] text-fg/80">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "buy" | "later" | "reject" | "accent" | "gold" }) {
  const color = tone ? { buy: "text-buy", later: "text-later", reject: "text-reject", accent: "text-accent", gold: "text-gold" }[tone] : "text-fg";
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={cx("mt-0.5 text-lg font-semibold num leading-tight", color)}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && <div className="text-muted/70">{icon}</div>}
      <div className="text-sm font-medium text-fg/90">{title}</div>
      {children && <div className="max-w-xs text-xs text-muted">{children}</div>}
    </div>
  );
}
