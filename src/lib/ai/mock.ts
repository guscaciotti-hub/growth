/* Modo demonstração: gera dados sintéticos determinísticos quando não há chave de API.
   Serve para testar a interface e o fluxo; não substitui a análise real. */
import type { Analysis, BusinessInput, Persona, RunMetrics, RunSummary, ScenarioConfig, SimResult } from "../types";

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const between = (r: () => number, a: number, b: number) => Math.round(a + r() * (b - a));

const FIRST_F = ["Ana", "Beatriz", "Camila", "Daniela", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patrícia", "Renata", "Sabrina", "Tatiane", "Vanessa", "Letícia", "Carla", "Simone", "Bruna", "Aline", "Priscila", "Luana", "Michele"];
const FIRST_M = ["André", "Bruno", "Carlos", "Diego", "Eduardo", "Felipe", "Gustavo", "Henrique", "Igor", "João", "Lucas", "Marcos", "Paulo", "Rafael", "Rodrigo", "Thiago", "Vinícius", "Leandro", "Fábio", "Ricardo", "Daniel", "Mateus", "Pedro", "Caio", "Sérgio"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Carvalho", "Ribeiro", "Almeida", "Costa", "Gomes", "Martins", "Rocha", "Barbosa", "Araújo", "Nascimento", "Fernandes", "Moreira", "Cardoso", "Teixeira"];
const JOBS = ["professora", "analista de marketing", "motorista de aplicativo", "dentista", "vendedor", "enfermeira", "desenvolvedor", "advogada", "autônomo", "gerente de loja", "nutricionista", "estudante", "aposentado", "contadora", "corretor de imóveis", "designer", "cabeleireira", "engenheiro", "atendente", "empresário"];
const SKIN = ["#f3d5b5", "#e0ac69", "#c68642", "#8d5524", "#5c3a21", "#ffdbac", "#a56e3f"];
const SHIRT = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#db2777", "#475569", "#ea580c", "#0d9488"];
const HAIR = ["#1c1917", "#3f2a1d", "#6b4423", "#a16207", "#d4a373", "#111827", "#7f1d1d"];
const CHANNELS = ["Instagram", "Indicação de amigos", "Google", "WhatsApp", "Passando na rua", "TikTok", "Anúncio no Facebook", "Grupo do bairro"];

export function mockResearch(input: BusinessInput): string {
  const loc = input.model === "online" ? "Brasil (online)" : `${input.location.city || "cidade"}/${input.location.state || "UF"}`;
  return `[MODO DEMONSTRAÇÃO — pesquisa sintética, sem busca real na web]

MERCADO
- O segmento "${input.category}" no Brasil movimenta bilhões por ano e cresce acima do PIB, puxado por conveniência e digitalização (estimativa ilustrativa).
- Sazonalidade moderada: picos no fim de ano e queda em fevereiro.

CONCORRÊNCIA EM ${loc.toUpperCase()}
- 3 a 6 concorrentes diretos num raio relevante, com preços entre 70% e 130% do seu ticket.
- Redes nacionais pressionam preço; independentes competem em atendimento.

DEMOGRAFIA
- Público predominante 25-45 anos, renda média-alta nos bairros centrais, alta penetração de smartphones.

PREÇOS
- Faixa praticada: R$ ${Math.round(input.price * 0.7)} a R$ ${Math.round(input.price * 1.3)}.

REGULAÇÃO
- Alvará de funcionamento, inscrição municipal e, conforme o segmento, licença sanitária.

LACUNAS:
- Sem chave de API configurada não foi possível buscar dados reais. Configure ANTHROPIC_API_KEY para a pesquisa com web search.`;
}

export function mockAnalysis(input: BusinessInput): Analysis {
  const r = rng(input.name + input.pitch);
  const physical = input.model !== "online";
  const score = between(r, 38, 72);
  const price = input.price;
  const som = Math.round(price * between(r, 2000, 9000));
  const city = input.location.city || "a cidade";
  const segs = [
    { name: "Profissional ocupado", share_pct: 35, description: "25-40 anos, pouco tempo, paga por conveniência.", typical_objection: "Não tenho tempo de testar algo novo." },
    { name: "Família prática", share_pct: 30, description: "30-50 anos, decide em casal, compara preço.", typical_objection: "Está caro para o nosso orçamento." },
    { name: "Jovem conectado", share_pct: 20, description: "18-28 anos, descobre pelo Instagram/TikTok, quer estética e rapidez.", typical_objection: "Não conheço, nunca vi ninguém falando." },
    { name: "Cliente tradicional", share_pct: 15, description: "45+, fiel ao que já usa, confia em indicação.", typical_objection: "Já tenho onde resolvo isso há anos." },
  ];
  return {
    executive_summary: `${input.name} entra em um mercado ${score > 55 ? "com demanda consistente" : "competitivo e sensível a preço"} em ${physical ? city : "ambiente online"}. A proposta tem diferenciais perceptíveis, mas o sucesso depende de converter o público declarado a um ticket de R$ ${price}, o que exige prova social rápida e controle de CAC. (Dados sintéticos do modo demonstração.)`,
    market: {
      tam_brl_year: som * 40,
      sam_brl_year: som * 8,
      som_brl_year: som,
      sizing_rationale: "Estimativa top-down a partir de gasto médio do público-alvo no segmento e densidade de potenciais clientes na área de atuação.",
      maturity: pick(r, ["crescimento", "maduro", "emergente"]),
      growth_trend: "Crescimento moderado, com migração para canais digitais e exigência maior de conveniência.",
      demand_signals: ["Buscas recorrentes pelo serviço na região", "Concorrentes com agenda cheia", "Reclamações sobre preço/atendimento dos atuais"],
    },
    demographics: physical
      ? {
          population_estimate: "~180 mil habitantes na área de influência (3 km)",
          income_profile: "Renda domiciliar média de R$ 6 a 9 mil; classes B e C+ predominantes",
          age_profile: "Concentração em 25-44 anos (38%)",
          local_dynamics: "Corredor comercial ativo, bom fluxo de pedestres em dias úteis, estacionamento limitado.",
          fit_score: between(r, 55, 85),
          notes: "Região aderente ao público, com atenção ao custo do ponto comercial.",
        }
      : null,
    competitors: [
      { name: "Rede nacional líder", type: "direto", strength: 5, price_position: "abaixo", differentiator: "Escala e preço", threat_level: 4, weakness_to_exploit: "Atendimento impessoal e padronizado" },
      { name: "Independente consolidado do bairro", type: "direto", strength: 3, price_position: "igual", differentiator: "Relação com a clientela", threat_level: 3, weakness_to_exploit: "Pouca presença digital" },
      { name: "Marketplace / app genérico", type: "indireto", strength: 4, price_position: "abaixo", differentiator: "Conveniência total", threat_level: 3, weakness_to_exploit: "Qualidade inconsistente" },
      { name: "Fazer por conta própria", type: "substituto", strength: 2, price_position: "abaixo", differentiator: "Custo zero", threat_level: 2, weakness_to_exploit: "Tempo e resultado inferior" },
      { name: "Premium boutique", type: "direto", strength: 3, price_position: "acima", differentiator: "Experiência exclusiva", threat_level: 2, weakness_to_exploit: "Preço afasta a maioria" },
    ],
    competitive_intensity: between(r, 3, 4),
    pricing: {
      assessment: `O ticket de R$ ${price} está ${r() > 0.5 ? "no teto" : "no meio"} da faixa do mercado local.`,
      suggested_price_min: Math.round(price * 0.8),
      suggested_price_max: Math.round(price * 1.15),
      elasticity: pick(r, ["media", "alta"]),
      rationale: "Público compara com alternativas conhecidas; valor percebido precisa ser demonstrado antes do preço.",
    },
    unit_economics: {
      estimated_cac_brl: Math.round(price * (0.4 + r() * 0.6)),
      estimated_ltv_brl: Math.round(price * (2.5 + r() * 4)),
      gross_margin_pct: 100 - input.variable_cost_pct,
      breakeven_customers_per_month: Math.max(1, Math.round(input.monthly_fixed_costs / Math.max(1, price * (1 - input.variable_cost_pct / 100)))),
      months_to_breakeven: between(r, 6, 18),
      realistic_monthly_revenue_12m: Math.round(som / 12),
      runway_months: input.monthly_fixed_costs ? Math.round(input.initial_investment / input.monthly_fixed_costs) : 24,
      notes: "Margem de contribuição saudável se o CAC ficar abaixo de 30% do LTV.",
    },
    swot: {
      strengths: ["Proposta clara", "Diferenciais declarados pelo fundador", "Equipe enxuta"],
      weaknesses: ["Marca desconhecida", "Dependência de poucos canais", "Capital limitado"],
      opportunities: ["Concorrentes com atendimento fraco", "Demanda por conveniência", "Parcerias locais"],
      threats: ["Guerra de preço de redes", "Alta do aluguel/custos", "Mudança de hábito do consumidor"],
    },
    threats: [
      { title: "Guerra de preço", severity: 4, probability: 3, description: "Redes podem baixar preço para defender participação.", mitigation: "Competir em experiência e recorrência, não em preço." },
      { title: "CAC acima do previsto", severity: 4, probability: 4, description: "Canais pagos saturados encarecem a aquisição.", mitigation: "Priorizar indicação e parcerias locais." },
      { title: "Sazonalidade", severity: 2, probability: 4, description: "Queda de demanda em meses específicos.", mitigation: "Pacotes e assinatura para suavizar." },
      { title: "Dependência do fundador", severity: 3, probability: 3, description: "Operação trava sem o fundador.", mitigation: "Processos e segunda pessoa treinada." },
    ],
    barriers: [
      { title: "Capital de giro inicial", type: "capital", difficulty: 3, how_to_overcome: "Reserva para 6 meses de custos fixos." },
      { title: "Licenças e alvarás", type: "regulatoria", difficulty: 2, how_to_overcome: "Contador e checklist municipal antes de abrir." },
      { title: "Construir confiança sem histórico", type: "reputacional", difficulty: 4, how_to_overcome: "Garantia, avaliações e casos reais nas primeiras semanas." },
    ],
    regulatory: ["Alvará de funcionamento", "Inscrição municipal/CNPJ (Simples Nacional)", "Normas sanitárias conforme o segmento", "LGPD para dados de clientes"],
    icp: {
      name: "Morador ocupado que valoriza conveniência",
      description: `Adulto de 25 a 45 anos em ${physical ? city : "grandes centros"}, renda média, que sente a dor descrita e já gasta com alternativas imperfeitas.`,
      demographics: "25-45 anos, renda R$ 3 a 12 mil, smartphone, decide rápido quando confia.",
      psychographics: "Valoriza tempo, prova social e previsibilidade; desconfia de novidade sem avaliações.",
      pains: ["Falta de tempo", "Soluções atuais caras ou inconsistentes", "Dificuldade de encontrar algo confiável perto"],
      desires: ["Resolver rápido e bem", "Sentir que fez um bom negócio", "Ser bem atendido"],
      buying_triggers: ["Indicação de conhecido", "Promoção de primeira compra", "Frustração com fornecedor atual"],
      common_objections: ["Está caro", "Não conheço, não confio", "Já tenho onde resolvo", "Fica longe / não tenho tempo"],
      channels: ["Instagram", "Google", "WhatsApp", "Indicação"],
      segments: segs,
    },
    verdict: {
      success_score: score,
      confidence: "media",
      rating: score < 35 ? "inviavel" : score < 55 ? "arriscado" : score < 75 ? "promissor" : "forte",
      headline: score >= 55 ? "Dá para funcionar, se a aquisição for barata e a confiança vier rápido." : "Viável só com ajuste de preço e canal de aquisição mais eficiente.",
      reasoning: "O mercado existe e os diferenciais são plausíveis, mas a marca é desconhecida e o CAC pode consumir a margem nos primeiros meses. A simulação com clientes vai mostrar quais objeções pesam mais.",
      key_risks: ["CAC alto", "Preço acima da percepção de valor inicial", "Dependência do fundador"],
      adjustments: [
        { title: "Oferta de entrada com garantia", description: "Primeira compra com garantia incondicional para destravar a confiança.", impact: "alto", effort: "baixo", expected_score_delta: 6 },
        { title: "Programa de indicação", description: "Recompensa para quem traz um amigo; reduz CAC em até 40%.", impact: "alto", effort: "medio", expected_score_delta: 5 },
        { title: "Testar preço 10% menor", description: "Validar elasticidade antes de fixar o ticket.", impact: "medio", effort: "baixo", expected_score_delta: 3 },
        { title: "Parcerias com negócios vizinhos", description: "Fluxo cruzado de clientes com comércios complementares.", impact: "medio", effort: "medio", expected_score_delta: 3 },
      ],
      next_steps: ["Validar preço com 20 conversas reais", "Fechar o ponto/canal e os custos fixos", "Lançar oferta de entrada com garantia", "Medir CAC nos primeiros 30 dias"],
    },
  };
}

export function mockPersonas(input: BusinessInput, analysis: Analysis, start: number, count: number, plan: { segment: string; count: number }[]): Persona[] {
  const r = rng(`${input.name}-personas-${start}`);
  const out: Persona[] = [];
  const segQueue: string[] = [];
  for (const p of plan) for (let i = 0; i < p.count; i++) segQueue.push(p.segment);
  while (segQueue.length < count) segQueue.push(analysis.icp.segments[0]?.name ?? "Cliente ideal");
  const city = input.model === "online" ? pick(r, ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Recife", "Porto Alegre"]) : input.location.city || "Cidade";
  for (let i = 0; i < count; i++) {
    const gender = r() > 0.5 ? "feminino" : "masculino";
    const first = pick(r, gender === "feminino" ? FIRST_F : FIRST_M);
    const segment = segQueue[i];
    const age = segment.includes("Jovem") ? between(r, 18, 28) : segment.includes("tradicional") ? between(r, 45, 68) : between(r, 25, 48);
    const income = between(r, 2200, 14000);
    const sens = income < 4000 ? between(r, 4, 5) : income < 8000 ? between(r, 2, 4) : between(r, 1, 3);
    out.push({
      idx: start + i,
      name: `${first} ${pick(r, LAST)}`,
      age,
      gender,
      occupation: pick(r, JOBS),
      income_monthly_brl: income,
      location: `${input.location.neighborhood ? input.location.neighborhood + ", " : ""}${city}`,
      segment,
      household: pick(r, ["mora sozinho(a)", "casado(a), 2 filhos", "mora com os pais", "casal sem filhos", "mãe solo, 1 filho"]),
      lifestyle: pick(r, ["rotina corrida, almoça fora", "home office, academia à noite", "transporte público, 2h/dia no trânsito", "fim de semana em família", "vida social intensa"]),
      pains: [pick(r, analysis.icp.pains), pick(r, analysis.icp.pains)],
      goals: [pick(r, analysis.icp.desires)],
      current_solution: pick(r, ["resolve com um conhecido", "usa a rede grande", "não resolve, vai levando", "usa um app", "faz sozinho(a)"]),
      price_sensitivity: sens,
      tech_savviness: age > 55 ? between(r, 1, 3) : between(r, 3, 5),
      decision_style: pick(r, ["impulsivo", "analitico", "social", "cauteloso"]),
      preferred_channel: pick(r, CHANNELS),
      objections: [pick(r, analysis.icp.common_objections), pick(r, analysis.icp.common_objections), ...(r() > 0.5 ? [pick(r, ["Prefiro ver avaliações antes", "Não sei se vou usar com frequência", "Já paguei por algo parecido e me decepcionei"])] : [])].filter((v, i, a) => a.indexOf(v) === i),
      trust_factors: [pick(r, ["avaliações no Google", "indicação de amigo", "garantia", "ver o lugar/produto antes", "nome conhecido"])],
      quote: pick(r, ["Se funcionar mesmo eu pago, mas tô cansada de promessa.", "Me manda o preço direto que eu não gosto de enrolação.", "Ah, se minha vizinha usa e gosta eu testo.", "Hoje em dia tudo é caro, tem que valer muito a pena.", "Quero algo que resolva sem eu ter que pensar."]),
      avatar: { skin: pick(r, SKIN), shirt: pick(r, SHIRT), hair: pick(r, HAIR) },
    });
  }
  return out;
}

export function mockSimulateBatch(input: BusinessInput, analysis: Analysis, personas: Persona[], scenario: ScenarioConfig): SimResult[] {
  const price = scenario.price_override ?? input.price;
  const boost = (scenario.guarantee ? 0.08 : 0) + (scenario.offer_changes ? 0.05 : 0) + (scenario.positioning ? 0.03 : 0);
  return personas.map((p) => {
    const r = rng(`${input.name}-${scenario.label}-${p.idx}-${price}`);
    const affordability = Math.min(1.2, (p.income_monthly_brl * 0.08) / Math.max(1, price));
    const base = 0.18 + affordability * 0.25 - p.price_sensitivity * 0.04 + boost + (p.decision_style === "impulsivo" ? 0.08 : 0) - (p.decision_style === "cauteloso" ? 0.07 : 0);
    const roll = r();
    const decision = roll < base ? "compra" : roll < base + 0.3 ? "depois" : "nao_compra";
    const maxPrice = Math.round(price * (0.55 + affordability * 0.6 + r() * 0.2));
    const objections = decision === "compra" ? p.objections.slice(0, 1) : p.objections.slice(0, decision === "depois" ? 2 : 3);
    return {
      persona_idx: p.idx,
      awareness_channel: p.preferred_channel,
      interest_level: decision === "compra" ? between(r, 7, 10) : decision === "depois" ? between(r, 4, 7) : between(r, 0, 4),
      objections_raised: objections,
      objections_overcome: decision === "compra",
      decision,
      willingness_to_pay_brl: decision === "compra" ? Math.min(price, maxPrice) : 0,
      max_price_brl: maxPrice,
      reasoning:
        decision === "compra"
          ? pick(r, ["Resolve justamente o que me incomoda, e o preço cabe se eu cortar outra coisa.", "Gostei da proposta, parece sério. Vou experimentar.", "Já gasto com algo pior, então faz sentido trocar."])
          : decision === "depois"
            ? pick(r, ["Achei interessante, mas quero ver avaliações de outras pessoas primeiro.", "Esse mês não dá, mas se tiver promoção eu volto.", "Preciso conversar em casa antes de fechar."])
            : pick(r, ["Está caro pra minha realidade, não compensa.", "Não conheço, não vou arriscar meu dinheiro.", "Já tenho onde resolvo isso, não vejo motivo pra mudar."]),
      deal_breaker: decision === "nao_compra" ? pick(r, ["preço", "falta de confiança", "já tem alternativa", "distância"]) : null,
      what_would_convince: pick(r, ["Um desconto na primeira vez", "Avaliações reais de clientes", "Garantia de devolução", "Indicação de alguém que eu conheço", "Um plano mais barato"]),
      would_recommend: decision === "compra" && r() > 0.3,
      churn_risk: decision === "compra" ? between(r, 1, 3) : between(r, 3, 5),
    };
  });
}

export function mockSummary(input: BusinessInput, analysis: Analysis, m: RunMetrics, scenario: ScenarioConfig): RunSummary {
  const conv = m.conversion_rate;
  const after = Math.round(Math.max(5, Math.min(95, analysis.verdict.success_score * 0.5 + conv * 100 * 0.9 + (m.later / Math.max(1, m.total)) * 20)));
  return {
    headline: `${m.buy} de ${m.total} clientes do ICP comprariam ${scenario.label !== "Cenário base" ? `no cenário "${scenario.label}"` : "a oferta como está"}.`,
    verdict: `A conversão simulada de ${(conv * 100).toFixed(0)}% entre pessoas já dentro do ICP indica ${conv > 0.3 ? "um encaixe real entre oferta e público" : conv > 0.18 ? "interesse, mas com fricção de preço e confiança" : "resistência forte: preço e desconhecimento pesam mais que os diferenciais"}. Com ${m.later} adiando a decisão, há demanda latente que prova social e uma oferta de entrada podem converter. Na operação real, espere conversão menor que a simulada porque nem todo lead está tão qualificado. (Síntese do modo demonstração.)`,
    success_score_after: after,
    top_objections: m.objections.slice(0, 4).map((o) => ({ objection: o.objection, count: o.count, how_to_handle: "Responder na página/atendimento com prova concreta e uma oferta de baixo risco." })),
    segment_insights: m.segments.map((s) => ({ segment: s.segment, insight: `${s.buy}/${s.total} compram; ${s.later} adiam. ${s.buy / Math.max(1, s.total) > 0.3 ? "Segmento prioritário." : "Precisa de abordagem específica."}` })),
    pricing_insight: `O teto mediano aceitável é R$ ${m.median_max_price.toFixed(0)} contra R$ ${(scenario.price_override ?? input.price).toFixed(0)} ofertados; ${m.median_max_price < (scenario.price_override ?? input.price) ? "há pressão para baixo ou para criar um plano de entrada." : "o preço atual está sustentável para a maioria."}`,
    channel_insight: `${m.channels[0]?.channel ?? "Indicação"} é o canal de descoberta dominante; concentre a verba de lançamento ali.`,
    insights: ["Quem compra já gasta com uma alternativa pior.", "Confiança pesa mais que preço para o segmento cauteloso.", "Um plano de entrada capturaria parte dos que adiam."],
    adjustments: [
      { title: "Plano de entrada", description: "Versão enxuta a 60-70% do preço para converter os que adiam.", impact: "alto", effort: "medio", expected_score_delta: 6 },
      { title: "Garantia incondicional", description: "Reduz a objeção de confiança nas primeiras semanas.", impact: "alto", effort: "baixo", expected_score_delta: 5 },
      { title: "Prova social antes do lançamento", description: "20 clientes beta com depoimento em vídeo.", impact: "medio", effort: "medio", expected_score_delta: 4 },
    ],
    pivot_warning: conv < 0.1 ? "Conversão abaixo de 10% dentro do ICP sugere repensar preço ou proposta antes de investir em aquisição." : null,
  };
}
