import { z } from "zod";

/* ----------------------------- Business input ----------------------------- */

export const BusinessModel = z.enum(["fisico", "online", "hibrido"]);
export type BusinessModel = z.infer<typeof BusinessModel>;

export const PricingModel = z.enum(["unico", "assinatura", "recorrente", "comissao", "freemium", "pacote"]);

export const BusinessInputSchema = z.object({
  name: z.string().min(2, "Dê um nome ao negócio"),
  pitch: z.string().min(20, "Descreva a ideia com mais detalhes"),
  category: z.string().min(2, "Informe o segmento"),
  model: BusinessModel,
  location: z.object({
    city: z.string(),
    state: z.string(),
    neighborhood: z.string(),
    country: z.string(),
  }),
  target_audience: z.string().min(10, "Descreva quem é o cliente ideal"),
  price: z.number().positive("Informe o preço/ticket médio"),
  pricing_model: PricingModel,
  initial_investment: z.number().nonnegative(),
  monthly_fixed_costs: z.number().nonnegative(),
  variable_cost_pct: z.number().min(0).max(95),
  team_size: z.number().int().min(1),
  founder_experience: z.enum(["nenhuma", "alguma", "veterano"]),
  differentiators: z.string(),
  known_competitors: z.string(),
  acquisition_channels: z.array(z.string()),
  goal_monthly_revenue: z.number().nonnegative(),
  launch_horizon_months: z.number().int().min(0),
});
export type BusinessInput = z.infer<typeof BusinessInputSchema>;

export const emptyBusinessInput = (): BusinessInput => ({
  name: "",
  pitch: "",
  category: "",
  model: "hibrido",
  location: { city: "", state: "", neighborhood: "", country: "Brasil" },
  target_audience: "",
  price: 0,
  pricing_model: "unico",
  initial_investment: 0,
  monthly_fixed_costs: 0,
  variable_cost_pct: 30,
  team_size: 1,
  founder_experience: "alguma",
  differentiators: "",
  known_competitors: "",
  acquisition_channels: [],
  goal_monthly_revenue: 0,
  launch_horizon_months: 3,
});

/* ------------------------------- Analysis -------------------------------- */
/* Schemas below are used as structured-output formats: every field required,
   nullable instead of optional, no numeric min/max constraints. */

const Level5 = z.number().describe("1 (baixo) a 5 (alto)");

export const CompetitorSchema = z.object({
  name: z.string(),
  type: z.enum(["direto", "indireto", "substituto"]),
  strength: Level5,
  price_position: z.enum(["abaixo", "igual", "acima", "desconhecido"]),
  differentiator: z.string(),
  threat_level: Level5,
  weakness_to_exploit: z.string(),
});

export const ThreatSchema = z.object({
  title: z.string(),
  severity: Level5,
  probability: Level5,
  description: z.string(),
  mitigation: z.string(),
});

export const BarrierSchema = z.object({
  title: z.string(),
  type: z.enum(["regulatoria", "capital", "tecnica", "mercado", "operacional", "reputacional"]),
  difficulty: Level5,
  how_to_overcome: z.string(),
});

export const AdjustmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.enum(["baixo", "medio", "alto"]),
  effort: z.enum(["baixo", "medio", "alto"]),
  expected_score_delta: z.number().describe("variação esperada no score de sucesso, em pontos"),
});

export const SegmentSchema = z.object({
  name: z.string(),
  share_pct: z.number().describe("participação do segmento no ICP, soma 100"),
  description: z.string(),
  typical_objection: z.string(),
});

export const AnalysisSchema = z.object({
  executive_summary: z.string(),
  market: z.object({
    tam_brl_year: z.number(),
    sam_brl_year: z.number(),
    som_brl_year: z.number(),
    sizing_rationale: z.string(),
    maturity: z.enum(["emergente", "crescimento", "maduro", "declinio"]),
    growth_trend: z.string(),
    demand_signals: z.array(z.string()),
  }),
  demographics: z
    .object({
      population_estimate: z.string(),
      income_profile: z.string(),
      age_profile: z.string(),
      local_dynamics: z.string().describe("fluxo, comércio local, acesso, perfil do bairro/cidade"),
      fit_score: z.number().describe("0 a 100: aderência da região ao negócio"),
      notes: z.string(),
    })
    .nullable()
    .describe("null quando o negócio é 100% online e a localização não importa"),
  competitors: z.array(CompetitorSchema),
  competitive_intensity: Level5,
  pricing: z.object({
    assessment: z.string(),
    suggested_price_min: z.number(),
    suggested_price_max: z.number(),
    elasticity: z.enum(["baixa", "media", "alta"]),
    rationale: z.string(),
  }),
  unit_economics: z.object({
    estimated_cac_brl: z.number(),
    estimated_ltv_brl: z.number(),
    gross_margin_pct: z.number(),
    breakeven_customers_per_month: z.number(),
    months_to_breakeven: z.number(),
    realistic_monthly_revenue_12m: z.number(),
    runway_months: z.number().describe("quantos meses o investimento inicial sustenta os custos fixos"),
    notes: z.string(),
  }),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  threats: z.array(ThreatSchema),
  barriers: z.array(BarrierSchema),
  regulatory: z.array(z.string()),
  icp: z.object({
    name: z.string().describe("apelido do cliente ideal, ex: 'Mãe corrida da zona sul'"),
    description: z.string(),
    demographics: z.string(),
    psychographics: z.string(),
    pains: z.array(z.string()),
    desires: z.array(z.string()),
    buying_triggers: z.array(z.string()),
    common_objections: z.array(z.string()),
    channels: z.array(z.string()),
    segments: z.array(SegmentSchema).describe("3 a 5 segmentos"),
  }),
  verdict: z.object({
    success_score: z.number().describe("0 a 100, probabilidade realista de o negócio sobreviver e ser lucrativo em 24 meses"),
    confidence: z.enum(["baixa", "media", "alta"]),
    rating: z.enum(["inviavel", "arriscado", "promissor", "forte"]),
    headline: z.string(),
    reasoning: z.string(),
    key_risks: z.array(z.string()),
    adjustments: z.array(AdjustmentSchema),
    next_steps: z.array(z.string()),
  }),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/* -------------------------------- Personas -------------------------------- */

export const PersonaSchema = z.object({
  idx: z.number(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(["feminino", "masculino", "outro"]),
  occupation: z.string(),
  income_monthly_brl: z.number(),
  location: z.string(),
  segment: z.string().describe("nome exato de um dos segmentos do ICP"),
  household: z.string(),
  lifestyle: z.string(),
  pains: z.array(z.string()),
  goals: z.array(z.string()),
  current_solution: z.string(),
  price_sensitivity: Level5,
  tech_savviness: Level5,
  decision_style: z.enum(["impulsivo", "analitico", "social", "cauteloso"]),
  preferred_channel: z.string(),
  objections: z.array(z.string()).describe("2 a 4 objeções concretas"),
  trust_factors: z.array(z.string()),
  quote: z.string().describe("uma frase na voz da pessoa sobre o problema"),
  avatar: z.object({
    skin: z.string().describe("cor hex"),
    shirt: z.string().describe("cor hex"),
    hair: z.string().describe("cor hex"),
  }),
});
export type Persona = z.infer<typeof PersonaSchema>;
export const PersonaBatchSchema = z.object({ personas: z.array(PersonaSchema) });

/* ------------------------------- Simulation ------------------------------- */

export const Decision = z.enum(["compra", "nao_compra", "depois"]);
export type Decision = z.infer<typeof Decision>;

export const SimResultSchema = z.object({
  persona_idx: z.number(),
  awareness_channel: z.string(),
  interest_level: z.number().describe("0 a 10"),
  objections_raised: z.array(z.string()),
  objections_overcome: z.boolean(),
  decision: Decision,
  willingness_to_pay_brl: z.number().describe("quanto pagaria pelo que foi ofertado; 0 se não compraria a nenhum preço"),
  max_price_brl: z.number().describe("preço máximo aceitável"),
  reasoning: z.string().describe("1 a 2 frases em primeira pessoa, na voz da persona"),
  deal_breaker: z.string().nullable(),
  what_would_convince: z.string(),
  would_recommend: z.boolean(),
  churn_risk: Level5,
});
export type SimResult = z.infer<typeof SimResultSchema>;
export const SimBatchSchema = z.object({ results: z.array(SimResultSchema) });

export const RunSummarySchema = z.object({
  headline: z.string(),
  verdict: z.string(),
  success_score_after: z.number().describe("0 a 100 após observar a simulação"),
  top_objections: z.array(
    z.object({ objection: z.string(), count: z.number(), how_to_handle: z.string() }),
  ),
  segment_insights: z.array(z.object({ segment: z.string(), insight: z.string() })),
  pricing_insight: z.string(),
  channel_insight: z.string(),
  insights: z.array(z.string()),
  adjustments: z.array(AdjustmentSchema),
  pivot_warning: z.string().nullable(),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

/* ------------------------- Scenario configuration ------------------------- */

export const ScenarioConfigSchema = z.object({
  label: z.string(),
  price_override: z.number().nullable(),
  offer_changes: z.string(),
  positioning: z.string(),
  guarantee: z.string(),
  channel_focus: z.array(z.string()),
});
export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;

export const defaultScenario = (): ScenarioConfig => ({
  label: "Cenário base",
  price_override: null,
  offer_changes: "",
  positioning: "",
  guarantee: "",
  channel_focus: [],
});

/* ------------------------------- Aggregates ------------------------------- */

export type RunMetrics = {
  total: number;
  buy: number;
  later: number;
  reject: number;
  conversion_rate: number;
  avg_interest: number;
  avg_wtp: number;
  median_max_price: number;
  projected_monthly_revenue: number;
  objections: { objection: string; count: number }[];
  segments: { segment: string; total: number; buy: number; later: number; reject: number }[];
  price_curve: { price: number; buyers_pct: number }[];
  channels: { channel: string; count: number }[];
};

export type Run = {
  id: string;
  label: string;
  config: ScenarioConfig;
  status: "running" | "done" | "error";
  summary: (RunSummary & { metrics?: RunMetrics }) | null;
  results: SimResult[];
  created_at: string;
  finished_at: string | null;
};

export type ProjectStatus = "draft" | "analyzed" | "personas" | "simulating" | "simulated";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  input: BusinessInput;
  created_at: string;
  updated_at: string;
};

export type ProjectBundle = {
  project: Project;
  analysis: { id: string; data: Analysis; research: string | null; model: string | null; created_at: string } | null;
  personas: Persona[];
  runs: Run[];
};

export type ProjectListItem = Project & { score: number | null; runs: number };

/* ------------------------------ Stream events ----------------------------- */

export type StreamEvent =
  | { type: "status"; message: string; progress?: number }
  | { type: "research"; text: string }
  | { type: "analysis"; data: Analysis; id: string }
  | { type: "personas"; batch: Persona[]; total: number }
  | { type: "run"; id: string; label: string; config: ScenarioConfig }
  | { type: "results"; batch: SimResult[]; total: number }
  | { type: "summary"; data: RunSummary & { metrics: RunMetrics }; runId: string }
  | { type: "done" }
  | { type: "error"; message: string };
