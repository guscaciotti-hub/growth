import Link from "next/link";
import { Building2, Users, Play, FlaskConical, Globe2, ArrowRight } from "lucide-react";
import { ProjectList } from "@/components/ProjectList";
import { SpendingCard } from "@/components/SpendingCard";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:pt-16">
      <section className="relative overflow-hidden rounded-3xl border border-slate-900/8 bg-gradient-to-br from-white via-[#f7f6f1] to-[#e9f3e4] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,24,39,.08)]">
        <div className="pointer-events-none absolute -right-20 -top-24 size-[420px] rounded-full bg-sky-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-[380px] rounded-full bg-violet-200/60 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Globe2 className="size-3.5" /> Founder City · simulador de viabilidade com IA
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Funde seu negócio numa cidade virtual <span className="text-accent">antes</span> de arriscar o dinheiro de verdade.
          </h1>
          <p className="mt-4 text-base text-fg/80 sm:text-lg">
            A IA analisa mercado, concorrência, região, preço e ameaças. Depois cria 100 clientes do seu público-alvo, cada um com renda, rotina e objeções, e eles decidem se compram. Você vê tudo acontecer na cidade e ajusta a oferta até funcionar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/novo" className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_30px_rgba(2,132,199,.3)] transition hover:brightness-110">
              Fundar novo negócio <ArrowRight className="size-4" />
            </Link>
            <span className="text-sm text-muted">Leva 3 minutos para preencher.</span>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Building2, t: "1. Análise completa", d: "Mercado (TAM/SAM/SOM), demografia da região, concorrentes reais, preço, SWOT, ameaças, barreiras, economia unitária e score de sucesso." },
          { icon: Users, t: "2. 100 clientes do ICP", d: "Pessoas com nome, renda, rotina, o que usam hoje e as objeções que vão levantar. Cada uma vira um morador da sua cidade." },
          { icon: Play, t: "3. Simulação", d: "Cada cliente ouve a oferta, levanta objeções e decide: compra, adia ou recusa. Taxa de conversão, curva de preço, objeções mais comuns." },
          { icon: FlaskConical, t: "4. Ajuste e repita", d: "Mude preço, garantia, posicionamento e canais. Rode de novo com os mesmos 100 clientes e compare cenários." },
        ].map((f) => (
          <div key={f.t} className="glass rounded-2xl p-5">
            <f.icon className="size-5 text-accent" />
            <h3 className="mt-3 text-sm font-semibold">{f.t}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <ProjectList />
      </section>
      <SpendingCard />
    </main>
  );
}
