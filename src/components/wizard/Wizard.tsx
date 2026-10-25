"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lightbulb, MapPin, Tag, Wallet, Rocket, Wand2, Trash2, Activity, FileJson, FileText, Check } from "lucide-react";
import { Button, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { BusinessInputSchema, emptyBusinessInput, emptyExisting, type BusinessInput } from "@/lib/types";
import { brl } from "@/lib/format";
import { saveLocal } from "@/lib/local";

type StepKey = "idea" | "current" | "where" | "offer" | "money" | "review";
type StepDef = { key: StepKey; title: string; icon: typeof Lightbulb; desc: string };
const STEP_IDEA: StepDef = { key: "idea", title: "O negócio", icon: Lightbulb, desc: "O que é e para quem" };
const STEP_CURRENT: StepDef = { key: "current", title: "Situação atual", icon: Activity, desc: "Faturamento, clientes, o que trava" };
const STEP_WHERE: StepDef = { key: "where", title: "Onde e quem", icon: MapPin, desc: "Local, demografia e cliente ideal" };
const STEP_OFFER: StepDef = { key: "offer", title: "Oferta e preço", icon: Tag, desc: "Ticket, modelo, diferenciais e concorrência" };
const STEP_MONEY: StepDef = { key: "money", title: "Dinheiro", icon: Wallet, desc: "Investimento, custos e meta" };
const STEP_REVIEW_NEW: StepDef = { key: "review", title: "Fundar", icon: Rocket, desc: "Revise e crie a sua cidade" };
const STEP_REVIEW_EX: StepDef = { key: "review", title: "Entrar na cidade", icon: Rocket, desc: "Revise e rode o diagnóstico" };
const stepsFor = (stage: BusinessInput["stage"]): StepDef[] =>
  stage === "existente" ? [STEP_IDEA, STEP_CURRENT, STEP_WHERE, STEP_OFFER, STEP_MONEY, STEP_REVIEW_EX] : [STEP_IDEA, STEP_WHERE, STEP_OFFER, STEP_MONEY, STEP_REVIEW_NEW];
const STEPS = stepsFor("existente"); // comprimento máximo, usado só para limitar o rascunho

const CHANNELS = ["Instagram", "TikTok", "Google", "Indicação", "WhatsApp", "Facebook Ads", "Parcerias locais", "Ponto físico / rua", "Marketplace", "LinkedIn", "YouTube", "Eventos"];

const EXAMPLE: BusinessInput = {
  stage: "ideia",
  existing: null,
  name: "Café da Esquina Studio",
  pitch: "Cafeteria de especialidade com espaço de coworking no bairro: café de origem controlada, assinatura mensal com cafés ilimitados e mesa garantida para quem trabalha remoto. Eventos semanais de networking para freelancers e pequenos empresários da região.",
  category: "Cafeteria / coworking",
  model: "fisico",
  location: { city: "Curitiba", state: "PR", neighborhood: "Batel", country: "Brasil" },
  target_audience: "Profissionais de 25 a 45 anos que trabalham em home office ou híbrido, moram ou trabalham no Batel e arredores, valorizam café bom e querem sair de casa para produzir sem pagar um coworking formal.",
  price: 28,
  pricing_model: "unico",
  initial_investment: 180000,
  monthly_fixed_costs: 22000,
  variable_cost_pct: 35,
  team_size: 4,
  founder_experience: "alguma",
  differentiators: "Assinatura com cafés ilimitados + mesa garantida; eventos de networking; torra própria; atendimento que lembra o nome do cliente.",
  known_competitors: "Starbucks do shopping, The Coffee, cafeterias independentes do Batel, coworkings como Regus e Nex.",
  acquisition_channels: ["Instagram", "Ponto físico / rua", "Indicação", "Parcerias locais"],
  goal_monthly_revenue: 60000,
  launch_horizon_months: 4,
};

type Errors = Partial<Record<string, string>>;

const DRAFT_KEY = "founder-city:draft";

function loadDraft(): { step: number; data: BusinessInput } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as { step: number; data: BusinessInput };
    if (!j?.data || typeof j.step !== "number") return null;
    return { step: Math.min(STEPS.length - 1, Math.max(0, j.step)), data: { ...emptyBusinessInput(), ...j.data } };
  } catch {
    return null;
  }
}

export function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BusinessInput>(emptyBusinessInput);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);

  // restaura o rascunho (celular descarrega a aba ao trocar de app)
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setData(d.data);
      setStep(d.step);
      setRestored(Boolean(d.data.name || d.data.pitch));
    }
    hydrated.current = true;
  }, []);
  // salva a cada mudança
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data }));
    } catch {
      /* sem espaço */
    }
  }, [step, data]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignora */
    }
    setData(emptyBusinessInput());
    setStep(0);
    setRestored(false);
  };
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const physical = data.model !== "online";
  const existing = data.stage === "existente";
  const steps = useMemo(() => stepsFor(data.stage), [data.stage]);
  const cur = steps[Math.min(step, steps.length - 1)];
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const set = <K extends keyof BusinessInput>(k: K, v: BusinessInput[K]) => setData((d) => ({ ...d, [k]: v }));
  const setLoc = (k: keyof BusinessInput["location"], v: string) => setData((d) => ({ ...d, location: { ...d.location, [k]: v } }));
  const setEx = <K extends keyof NonNullable<BusinessInput["existing"]>>(k: K, v: NonNullable<BusinessInput["existing"]>[K]) =>
    setData((d) => ({ ...d, existing: { ...(d.existing ?? emptyExisting()), [k]: v } }));
  const setStage = (stage: BusinessInput["stage"]) => setData((d) => ({ ...d, stage, existing: stage === "existente" ? (d.existing ?? emptyExisting()) : null }));

  const stepFields: Record<StepKey, string[]> = useMemo(
    () => ({
      idea: ["name", "category", "pitch", "model"],
      current: ["existing.monthly_revenue", "existing.customers_per_month", "existing.months_operating"],
      where: physical ? ["location.city", "target_audience"] : ["target_audience"],
      offer: ["price", "pricing_model"],
      money: ["initial_investment", "monthly_fixed_costs", "variable_cost_pct", "team_size"],
      review: [],
    }),
    [physical],
  );

  const validateStep = (key: StepKey): boolean => {
    const res = BusinessInputSchema.safeParse(data);
    const errs: Errors = {};
    if (!res.success) {
      for (const issue of res.error.issues) {
        const path = issue.path.join(".");
        errs[path] = issue.message;
      }
    }
    if (physical && !data.location.city.trim()) errs["location.city"] = "Informe a cidade";
    if (existing && (data.existing?.monthly_revenue ?? 0) <= 0) errs["existing.monthly_revenue"] = "Informe o faturamento atual (aproximado serve)";
    const relevant: Errors = {};
    for (const f of stepFields[key]) if (errs[f]) relevant[f] = errs[f];
    setErrors(relevant);
    return Object.keys(relevant).length === 0;
  };

  const next = () => {
    if (!validateStep(cur.key)) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };

  const importJson = () => {
    try {
      const raw = importText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const j = JSON.parse(raw);
      const merged: BusinessInput = { ...emptyBusinessInput(), ...j, location: { ...emptyBusinessInput().location, ...(j.location ?? {}) }, existing: j.stage === "existente" ? { ...emptyExisting(), ...(j.existing ?? {}) } : null };
      const res = BusinessInputSchema.safeParse(merged);
      if (!res.success) {
        setImportMsg(`JSON lido, mas com campos inválidos: ${res.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} (${i.message})`).join("; ")}. Corrija e tente de novo.`);
        setData(merged);
        return;
      }
      setData(res.data);
      setImportMsg(null);
      setImportOpen(false);
      setStep(stepsFor(res.data.stage).length - 1);
    } catch {
      setImportMsg("Não consegui ler esse JSON. Cole exatamente o bloco que o Claude devolveu.");
    }
  };

  const submit = async () => {
    for (const st of steps) {
      if (st.key === "review") continue;
      if (!validateStep(st.key)) {
        setStep(steps.indexOf(st));
        return;
      }
    }
    setSaving(true);
    setServerError(null);
    try {
      let id: string | null = null;
      try {
        const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: data }) });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.id) id = j.id;
        else if (res.status === 400) throw new Error(j.error ?? "Dados inválidos");
      } catch (e) {
        if (e instanceof Error && e.message === "Dados inválidos") throw e;
        /* servidor sem persistência: segue só com a cópia local */
      }
      id ??= crypto.randomUUID();
      const now = new Date().toISOString();
      saveLocal({ project: { id, name: data.name, status: "draft", input: data, created_at: now, updated_at: now }, analysis: null, personas: [], runs: [] });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignora */
      }
      router.push(`/projeto/${id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const num = (v: string) => (v === "" ? 0 : Number(v.replace(/\./g, "").replace(",", ".")) || 0);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {restored && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/8 px-3 py-2 text-[12.5px]">
          <span>Rascunho recuperado: continue de onde parou.</span>
          <button type="button" onClick={clearDraft} className="inline-flex items-center gap-1 text-muted hover:text-reject"><Trash2 className="size-3.5" /> Começar do zero</button>
        </div>
      )}
      <ol className="mb-6 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s.key}>
            <button type="button" onClick={() => i < step && setStep(i)} className={cx("flex w-full flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition", i === step ? "border-accent/50 bg-accent/10" : i < step ? "border-buy/30 bg-buy/5 hover:bg-buy/10" : "border-slate-900/8 bg-slate-900/3 opacity-60")}>
              <s.icon className={cx("size-4", i === step ? "text-accent" : i < step ? "text-buy" : "text-muted")} />
              <span className="text-[11px] font-semibold leading-tight">{s.title}</span>
              <span className="hidden text-[10px] leading-tight text-muted sm:block">{s.desc}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="glass rise rounded-2xl p-5 sm:p-7" key={step}>
        {cur.key === "idea" && (
          <div className="space-y-4">
            <Header title={existing ? "Sobre o negócio" : "Qual é a ideia?"} sub={existing ? "Descreva o negócio como ele funciona hoje: o que vende, para quem, como atende." : "Descreva como se estivesse contando para um sócio. Quanto mais específico, melhor a análise."} />
            <div>
              <div className="mb-1.5 text-sm font-medium text-fg/90">Esse negócio…</div>
              <div className="grid grid-cols-2 gap-2">
                {([["ideia", "Vou abrir", "ideia ou pré-lançamento: a análise diz se vale abrir"], ["existente", "Já existe", "diagnóstico: onde trava e como crescer"]] as const).map(([v, l, d]) => (
                  <button key={v} type="button" onClick={() => setStage(v)} className={cx("rounded-xl border p-3 text-left transition", data.stage === v ? "border-accent/60 bg-accent/12" : "border-slate-900/10 bg-slate-900/3 hover:bg-slate-900/6")}>
                    <div className="text-sm font-semibold">{l}</div>
                    <div className="text-[11px] text-muted">{d}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do negócio" error={errors.name}><Input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Café da Esquina" /></Field>
              <Field label="Segmento" error={errors.category}><Input value={data.category} onChange={(e) => set("category", e.target.value)} placeholder="Ex.: cafeteria, clínica, SaaS, loja de roupas" /></Field>
            </div>
            <Field label={existing ? "O negócio em detalhes" : "A ideia em detalhes"} hint="o que vende, como funciona, por que alguém compraria" error={errors.pitch}>
              <Textarea value={data.pitch} onChange={(e) => set("pitch", e.target.value)} rows={5} placeholder={existing ? "Ex.: Clínica odontológica com 2 cadeiras, foco em estética e implantes, atende particular e 2 convênios..." : "Ex.: Cafeteria de especialidade com coworking, assinatura mensal..."} />
            </Field>
            <Field label="Modelo" error={errors.model}>
              <div className="grid grid-cols-3 gap-2">
                {([["fisico", "Físico", "ponto, loja, clínica"], ["online", "Online", "app, e-commerce, serviço remoto"], ["hibrido", "Híbrido", "físico + digital"]] as const).map(([v, l, d]) => (
                  <button key={v} type="button" onClick={() => set("model", v)} className={cx("rounded-xl border p-3 text-left transition", data.model === v ? "border-accent/60 bg-accent/12" : "border-slate-900/10 bg-slate-900/3 hover:bg-slate-900/6")}>
                    <div className="text-sm font-semibold">{l}</div>
                    <div className="text-[11px] text-muted">{d}</div>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {cur.key === "current" && data.existing && (
          <div className="space-y-4">
            <Header title="Como está hoje?" sub="Números aproximados servem. É daqui que sai o diagnóstico: onde o funil trava e qual o tamanho da oportunidade." />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tempo de operação (meses)" error={errors["existing.months_operating"]}><Input inputMode="numeric" value={data.existing.months_operating} onChange={(e) => setEx("months_operating", Math.max(0, Math.round(num(e.target.value))))} /></Field>
              <Field label="Faturamento mensal (R$)" error={errors["existing.monthly_revenue"]}><Input inputMode="numeric" value={data.existing.monthly_revenue || ""} onChange={(e) => setEx("monthly_revenue", num(e.target.value))} placeholder="45000" /></Field>
              <Field label="Clientes atendidos / mês" error={errors["existing.customers_per_month"]}><Input inputMode="numeric" value={data.existing.customers_per_month || ""} onChange={(e) => setEx("customers_per_month", num(e.target.value))} placeholder="120" /></Field>
            </div>
            <Field label="Meta de crescimento" hint="para onde quer chegar e em quanto tempo"><Input value={data.existing.growth_goal} onChange={(e) => setEx("growth_goal", e.target.value)} placeholder="Ex.: dobrar o faturamento em 12 meses; lotar a agenda; abrir 2ª unidade" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="O que já funciona bem"><Textarea value={data.existing.what_works} onChange={(e) => setEx("what_works", e.target.value)} rows={3} placeholder="Ex.: indicação de pacientes, atendimento, localização" /></Field>
              <Field label="O que não funciona / onde trava"><Textarea value={data.existing.what_fails} onChange={(e) => setEx("what_fails", e.target.value)} rows={3} placeholder="Ex.: Instagram não gera agendamento, muitos orçamentos sem fechar" /></Field>
            </div>
            <Field label="Principais desafios hoje"><Textarea value={data.existing.main_challenges} onChange={(e) => setEx("main_challenges", e.target.value)} rows={2} placeholder="Ex.: concorrência de rede com preço baixo, dependência do dono, agenda ociosa à tarde" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Presença online" hint="site, Instagram, Google, anúncios"><Input value={data.existing.online_presence} onChange={(e) => setEx("online_presence", e.target.value)} placeholder="Ex.: Instagram 3,2 mil seguidores, sem site, Google sem anúncios" /></Field>
              <Field label="Avaliações / reputação"><Input value={data.existing.reviews} onChange={(e) => setEx("reviews", e.target.value)} placeholder="Ex.: Google 4,8 (86 avaliações), reclamações sobre espera" /></Field>
            </div>
          </div>
        )}

        {cur.key === "where" && (
          <div className="space-y-4">
            <Header title={physical ? (existing ? "Onde fica e quem é o cliente?" : "Onde vai ficar e quem é o cliente?") : "Quem é o cliente?"} sub={physical ? "A região define renda, fluxo e concorrência num raio de poucos quilômetros." : "Negócio online: a geografia pesa menos, o perfil pesa tudo."} />
            {physical && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Cidade" error={errors["location.city"]}><Input value={data.location.city} onChange={(e) => setLoc("city", e.target.value)} placeholder="Curitiba" /></Field>
                <Field label="Estado"><Input value={data.location.state} onChange={(e) => setLoc("state", e.target.value)} placeholder="PR" /></Field>
                <Field label="Bairro / região" hint="opcional"><Input value={data.location.neighborhood} onChange={(e) => setLoc("neighborhood", e.target.value)} placeholder="Batel" /></Field>
              </div>
            )}
            <Field label="Cliente ideal (ICP)" hint="idade, renda, rotina, dor que sente" error={errors.target_audience}>
              <Textarea value={data.target_audience} onChange={(e) => set("target_audience", e.target.value)} rows={4} placeholder="Ex.: profissionais de 25 a 45 anos em home office que querem um lugar para trabalhar fora de casa..." />
            </Field>
            <Field label="Canais de aquisição" hint="como o cliente vai descobrir você">
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map((c) => {
                  const on = data.acquisition_channels.includes(c);
                  return <button key={c} type="button" onClick={() => set("acquisition_channels", on ? data.acquisition_channels.filter((x) => x !== c) : [...data.acquisition_channels, c])} className={cx("rounded-full border px-3 py-1 text-xs transition", on ? "border-accent/60 bg-accent/15 text-accent" : "border-slate-900/10 text-muted hover:bg-slate-900/6")}>{c}</button>;
                })}
              </div>
            </Field>
          </div>
        )}

        {cur.key === "offer" && (
          <div className="space-y-4">
            <Header title="Oferta e preço" sub="O preço é a variável que mais vamos testar com os 100 clientes." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preço / ticket médio (R$)" error={errors.price}><Input inputMode="decimal" value={data.price || ""} onChange={(e) => set("price", num(e.target.value))} placeholder="28" /></Field>
              <Field label="Modelo de cobrança" error={errors.pricing_model}>
                <Select value={data.pricing_model} onChange={(e) => set("pricing_model", e.target.value as BusinessInput["pricing_model"])}>
                  <option value="unico">Compra única / por visita</option>
                  <option value="assinatura">Assinatura mensal</option>
                  <option value="recorrente">Recorrente (pacotes, planos)</option>
                  <option value="pacote">Pacote / projeto fechado</option>
                  <option value="comissao">Comissão / take rate</option>
                  <option value="freemium">Freemium</option>
                </Select>
              </Field>
            </div>
            <Field label="Diferenciais" hint="por que escolher você e não o concorrente"><Textarea value={data.differentiators} onChange={(e) => set("differentiators", e.target.value)} rows={3} placeholder="Ex.: assinatura com mesa garantida, torra própria, atendimento personalizado" /></Field>
            <Field label="Concorrentes que você conhece" hint="nomes, redes, alternativas"><Textarea value={data.known_competitors} onChange={(e) => set("known_competitors", e.target.value)} rows={2} placeholder="Ex.: Starbucks do shopping, cafeterias do bairro, coworkings" /></Field>
          </div>
        )}

        {cur.key === "money" && (
          <div className="space-y-4">
            <Header title="Dinheiro" sub={existing ? "Custos atuais e quanto está disposto a investir para crescer." : "Com isso calculamos break-even, runway e quantos clientes por mês você precisa."} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={existing ? "Investimento disponível para crescer (R$)" : "Investimento inicial (R$)"} error={errors.initial_investment}><Input inputMode="numeric" value={data.initial_investment || ""} onChange={(e) => set("initial_investment", num(e.target.value))} placeholder="180000" /></Field>
              <Field label="Custos fixos mensais (R$)" hint="aluguel, equipe, software" error={errors.monthly_fixed_costs}><Input inputMode="numeric" value={data.monthly_fixed_costs || ""} onChange={(e) => set("monthly_fixed_costs", num(e.target.value))} placeholder="22000" /></Field>
              <Field label="Custo variável (% do preço)" hint="insumos, taxas, comissões" error={errors.variable_cost_pct}>
                <div className="flex items-center gap-3"><input type="range" min={0} max={95} value={data.variable_cost_pct} onChange={(e) => set("variable_cost_pct", Number(e.target.value))} className="flex-1" /><span className="w-12 text-right num text-sm">{data.variable_cost_pct}%</span></div>
              </Field>
              <Field label="Tamanho da equipe" error={errors.team_size}><Input inputMode="numeric" value={data.team_size} onChange={(e) => set("team_size", Math.max(1, Math.round(num(e.target.value))))} /></Field>
              <Field label="Experiência do fundador no segmento">
                <Select value={data.founder_experience} onChange={(e) => set("founder_experience", e.target.value as BusinessInput["founder_experience"])}>
                  <option value="nenhuma">Nenhuma</option><option value="alguma">Alguma</option><option value="veterano">Veterano</option>
                </Select>
              </Field>
              <Field label="Meta de faturamento mensal (R$)" hint="opcional"><Input inputMode="numeric" value={data.goal_monthly_revenue || ""} onChange={(e) => set("goal_monthly_revenue", num(e.target.value))} placeholder="60000" /></Field>
              {!existing && <Field label="Lançamento em (meses)"><Input inputMode="numeric" value={data.launch_horizon_months} onChange={(e) => set("launch_horizon_months", Math.max(0, Math.round(num(e.target.value))))} /></Field>}
            </div>
            {data.monthly_fixed_costs > 0 && data.price > 0 && (
              <div className="rounded-xl bg-slate-900/4 p-3 text-[12.5px] text-fg/85">
                Prévia: com margem de contribuição de <span className="num font-medium">{brl(data.price * (1 - data.variable_cost_pct / 100))}</span> por venda, o break-even é de <span className="num font-medium">{Math.ceil(data.monthly_fixed_costs / Math.max(1, data.price * (1 - data.variable_cost_pct / 100)))}</span> vendas/mês{data.initial_investment > 0 ? <>, e o investimento cobre <span className="num font-medium">{Math.floor(data.initial_investment / data.monthly_fixed_costs)}</span> meses de custos fixos</> : null}.
              </div>
            )}
          </div>
        )}

        {cur.key === "review" && (
          <div className="space-y-4">
            <Header title={existing ? "Pronto para o diagnóstico?" : "Pronto para fundar?"} sub={existing ? "Seu negócio entra na cidade já construído. Depois você roda o diagnóstico, gera 100 clientes do seu público e simula." : "Vamos criar sua cidade. Depois você roda a análise, gera 100 clientes e simula."} />
            <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
              <Row k="Negócio" v={`${data.name} · ${data.category}`} />
              <Row k="Estágio" v={existing ? `já existe · ${data.existing?.months_operating ?? 0} meses` : "vou abrir"} />
              {existing && data.existing && <Row k="Hoje" v={`${brl(data.existing.monthly_revenue)}/mês · ${data.existing.customers_per_month} clientes/mês`} />}
              <Row k="Modelo" v={data.model} />
              {physical && <Row k="Local" v={[data.location.neighborhood, data.location.city, data.location.state].filter(Boolean).join(", ")} />}
              <Row k="Preço" v={`${brl(data.price)} · ${data.pricing_model}`} />
              <Row k="Investimento" v={brl(data.initial_investment)} />
              <Row k="Custos fixos" v={`${brl(data.monthly_fixed_costs)}/mês`} />
              <Row k="Canais" v={data.acquisition_channels.join(", ") || "—"} />
              <Row k="Meta" v={data.goal_monthly_revenue ? `${brl(data.goal_monthly_revenue)}/mês` : "—"} />
            </dl>
            <p className="rounded-xl bg-slate-900/4 p-3 text-[12.5px] text-fg/85">{data.pitch}</p>
            {serverError && <p className="text-sm text-reject">{serverError}</p>}
          </div>
        )}

        {importOpen && (
          <div className="mt-5 rounded-xl border border-accent/30 bg-accent/6 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Preencher com o Claude</div>
              <a href="/briefing-founder-city.md" download className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"><FileText className="size-3.5" /> Baixar briefing para o Claude</a>
            </div>
            <p className="mb-2 text-[12px] text-muted">Mande o briefing ao Claude (chat) junto com o que ele sabe do negócio. Ele devolve um bloco JSON; cole aqui e o formulário se preenche sozinho.</p>
            <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6} placeholder='{"stage": "existente", "name": "...", ...}' className="font-mono text-[12px]" />
            {importMsg && <p className="mt-1 text-xs text-reject">{importMsg}</p>}
            <div className="mt-2 flex justify-end"><Button size="sm" onClick={importJson} disabled={!importText.trim()}><Check className="size-3.5" /> Preencher formulário</Button></div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {step > 0 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="size-4" /> Voltar</Button>}
            {step === 0 && <Button variant="ghost" onClick={() => setData(EXAMPLE)} title="Preenche um exemplo completo"><Wand2 className="size-4" /> Exemplo</Button>}
            {step === 0 && <Button variant="ghost" onClick={() => setImportOpen((v) => !v)} title="Cole o JSON devolvido pelo Claude"><FileJson className="size-4" /> Importar JSON</Button>}
          </div>
          {step < steps.length - 1 ? (
            <Button onClick={next}>Continuar <ArrowRight className="size-4" /></Button>
          ) : (
            <Button variant="gold" size="lg" onClick={submit} loading={saving}><Rocket className="size-4" /> {existing ? "Entrar na cidade" : "Fundar negócio"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-900/6 py-1.5">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
