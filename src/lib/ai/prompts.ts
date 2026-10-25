import type { Analysis, BusinessInput, Persona, ScenarioConfig } from "../types";
import { brl } from "../format";

export const ANALYST_SYSTEM = `Você é um analista sênior de viabilidade de negócios no Brasil, com experiência em venture building, franquias, varejo físico, serviços locais e negócios digitais. Você combina rigor financeiro (unit economics, break-even, elasticidade de preço) com leitura de mercado (demografia, concorrência, barreiras, regulação).

Princípios:
- Seja realista e direto. A maioria dos negócios falha; não infle o score para agradar. Um score acima de 70 exige evidência forte.
- Quando houver pesquisa de mercado anexada, baseie-se nela e cite os fatos. Quando não houver dado, use estimativas conservadoras e diga que são estimativas.
- Pense em reais (BRL) e no contexto brasileiro (tributação simplificada, sazonalidade, meios de pagamento, comportamento do consumidor local).
- Para negócios físicos, a localização pesa muito: renda do bairro, fluxo, concorrência num raio de 1-3 km, acesso.
- Para negócios online, pesam: CAC, saturação de canais, diferenciação, retenção.
- Escreva em português do Brasil, conciso, sem jargão desnecessário.`;

export function describeBusiness(input: BusinessInput): string {
  const loc =
    input.model === "online"
      ? "Online (sem ponto físico)"
      : [input.location.neighborhood, input.location.city, input.location.state, input.location.country]
          .filter(Boolean)
          .join(", ");
  return `NEGÓCIO: ${input.name}
SEGMENTO: ${input.category}
MODELO: ${input.model}
LOCALIZAÇÃO: ${loc}
IDEIA / PROPOSTA:
${input.pitch}

PÚBLICO-ALVO DECLARADO: ${input.target_audience}
PREÇO / TICKET MÉDIO: ${brl(input.price)} (modelo de cobrança: ${input.pricing_model})
INVESTIMENTO INICIAL: ${brl(input.initial_investment)}
CUSTOS FIXOS MENSAIS: ${brl(input.monthly_fixed_costs)}
CUSTO VARIÁVEL: ${input.variable_cost_pct}% do preço
EQUIPE: ${input.team_size} pessoa(s); experiência do fundador: ${input.founder_experience}
DIFERENCIAIS: ${input.differentiators || "não informado"}
CONCORRENTES CONHECIDOS: ${input.known_competitors || "não informado"}
CANAIS DE AQUISIÇÃO: ${input.acquisition_channels.join(", ") || "não informado"}
META DE FATURAMENTO MENSAL: ${input.goal_monthly_revenue ? brl(input.goal_monthly_revenue) : "não informada"}
HORIZONTE DE LANÇAMENTO: ${input.launch_horizon_months} meses`;
}

export function researchPrompt(input: BusinessInput): string {
  const physical = input.model !== "online";
  return `Faça uma pesquisa de mercado objetiva para o negócio abaixo, usando a busca na web. Produza um briefing em português com fatos, números e fontes (URL) sempre que possível.

${describeBusiness(input)}

Pesquise e relate:
1. Tamanho e tendência do mercado deste segmento no Brasil (números recentes, crescimento, sazonalidade).
2. Concorrentes ${physical ? `na região (${input.location.neighborhood ? input.location.neighborhood + ", " : ""}${input.location.city} - ${input.location.state}) e` : ""} nacionais/online relevantes: nomes reais, preços praticados, posicionamento, avaliações.
${physical ? `3. Demografia da região: população, renda média, faixa etária predominante, perfil do bairro/cidade (IBGE, prefeitura, portais locais), fluxo comercial.` : `3. Comportamento de compra online do público, canais mais usados, CAC típico do segmento.`}
4. Faixa de preço praticada no mercado e percepção de valor do público.
5. Regulação, licenças e exigências legais para operar.
6. Riscos e ameaças recentes (notícias, mudanças de mercado, novos entrantes, crises).

Formato: seções com títulos curtos, bullets factuais, cada fato com fonte entre parênteses quando vier de busca. Termine com "LACUNAS:" listando o que não foi possível confirmar.`;
}

export function analysisPrompt(input: BusinessInput, research: string | null): string {
  return `Analise a viabilidade completa do negócio abaixo e preencha TODOS os campos do formato estruturado.

${describeBusiness(input)}

${research ? `=== PESQUISA DE MERCADO (use como base factual) ===\n${research}\n=== FIM DA PESQUISA ===` : "Não há pesquisa anexada: use conhecimento geral e estimativas conservadoras, sinalizando-as."}

Diretrizes para campos específicos:
- market: TAM/SAM/SOM em reais por ano. SOM = fatia realista capturável em 24 meses por este negócio específico.
- demographics: preencha para negócios físicos/híbridos com base na região; null para 100% online.
- competitors: 4 a 8, misturando diretos, indiretos e substitutos. Use nomes reais quando a pesquisa trouxer; senão descreva o arquétipo (ex: "Clínicas populares de rede").
- pricing: compare o preço proposto com o mercado e com o poder de compra do público.
- unit_economics: estime CAC e LTV coerentes com os canais informados; break-even com os custos fixos declarados; runway = investimento inicial / custos fixos.
- threats: 4 a 7 ameaças concretas com severidade e probabilidade.
- barriers: barreiras de entrada reais (para o fundador e para quem vier depois).
- icp: um perfil de cliente ideal vivo e específico, com 3 a 5 segmentos cuja soma de share_pct é 100. As objeções devem ser as que esse público realmente verbaliza.
- verdict.success_score: probabilidade realista (0-100) de sobreviver e lucrar em 24 meses. rating: inviavel (<35), arriscado (35-54), promissor (55-74), forte (75+).
- verdict.adjustments: 3 a 6 ajustes acionáveis ordenados por impacto, com expected_score_delta realista.`;
}

export function personaBatchPrompt(
  input: BusinessInput,
  analysis: Analysis,
  startIdx: number,
  count: number,
  segmentPlan: { segment: string; count: number }[],
): string {
  return `Gere ${count} clientes potenciais realistas (personas) que pertençam ao ICP abaixo. São pessoas que o negócio tentaria conquistar, não fãs: inclua céticos, indiferentes, curiosos e entusiastas, em proporção realista.

${describeBusiness(input)}

ICP: ${analysis.icp.name} — ${analysis.icp.description}
Demografia: ${analysis.icp.demographics}
Psicografia: ${analysis.icp.psychographics}
Dores: ${analysis.icp.pains.join("; ")}
Desejos: ${analysis.icp.desires.join("; ")}
Objeções comuns: ${analysis.icp.common_objections.join("; ")}
Canais: ${analysis.icp.channels.join(", ")}
Segmentos (use EXATAMENTE estes nomes no campo segment):
${analysis.icp.segments.map((s) => `- ${s.name} (${s.share_pct}%): ${s.description}. Objeção típica: ${s.typical_objection}`).join("\n")}

Distribuição obrigatória deste lote: ${segmentPlan.map((p) => `${p.count}x "${p.segment}"`).join(", ")}.
Numere idx de ${startIdx} a ${startIdx + count - 1}, sem repetir.

Regras:
- Nomes brasileiros variados (evite repetir primeiro nome no lote), idades e rendas coerentes com o segmento e com ${input.model === "online" ? "o público online brasileiro" : `a região ${input.location.city}/${input.location.state}`}.
- objections: 2 a 4 objeções concretas e específicas dessa pessoa (preço, confiança, tempo, hábito, alternativa atual, distância, etc.).
- quote: uma frase curta e natural, como a pessoa falaria num áudio de WhatsApp.
- avatar: cores hex plausíveis (skin em tons de pele variados, shirt cor da roupa, hair cor de cabelo).
- price_sensitivity e tech_savviness de 1 a 5; decision_style variado.`;
}

export function offerDescription(input: BusinessInput, scenario: ScenarioConfig): string {
  const price = scenario.price_override ?? input.price;
  return `OFERTA APRESENTADA AO CLIENTE
Negócio: ${input.name} (${input.category}, ${input.model}${input.model !== "online" ? ` em ${input.location.neighborhood ? input.location.neighborhood + ", " : ""}${input.location.city}` : ""})
Proposta: ${input.pitch}
Preço: ${brl(price)} (${input.pricing_model})${scenario.price_override ? " [preço ajustado neste cenário]" : ""}
Diferenciais: ${input.differentiators || "não declarados"}
${scenario.positioning ? `Posicionamento/mensagem: ${scenario.positioning}` : ""}
${scenario.offer_changes ? `Mudanças na oferta neste cenário: ${scenario.offer_changes}` : ""}
${scenario.guarantee ? `Garantia / redução de risco: ${scenario.guarantee}` : ""}
Canais pelos quais o cliente descobre: ${(scenario.channel_focus.length ? scenario.channel_focus : input.acquisition_channels).join(", ") || "indefinidos"}`;
}

export const SIM_SYSTEM = `Você simula o comportamento de compra de consumidores brasileiros reais com fidelidade. Para cada persona, você "vira" aquela pessoa: renda, rotina, hábitos, ceticismo, alternativas que ela já usa. Você NÃO é vendedor e não torce pelo negócio. A maioria das pessoas expostas a uma oferta nova não compra; muitas adiam; algumas compram. Preço alto para a renda, falta de confiança, hábito com a solução atual e distância são motivos reais de recusa. Responda sempre em português do Brasil.`;

export function simulateBatchPrompt(
  input: BusinessInput,
  analysis: Analysis,
  personas: Persona[],
  scenario: ScenarioConfig,
): string {
  return `${offerDescription(input, scenario)}

CONTEXTO DE MERCADO (resumo do analista): ${analysis.executive_summary}
Concorrentes que o cliente pode conhecer: ${analysis.competitors.map((c) => `${c.name} (${c.price_position} em preço)`).join("; ")}
Faixa de preço do mercado: ${brl(analysis.pricing.suggested_price_min)} a ${brl(analysis.pricing.suggested_price_max)}.

Simule a jornada de CADA persona abaixo ao ser exposta à oferta pelo canal mais provável para ela: descoberta → interesse → objeções → decisão. Cada persona raciocina com a própria renda, dores, objeções e solução atual.

PERSONAS:
${personas
  .map(
    (p) => `[idx ${p.idx}] ${p.name}, ${p.age}, ${p.gender}, ${p.occupation}, renda ${brl(p.income_monthly_brl)}/mês, ${p.location}. Segmento: ${p.segment}. Família: ${p.household}. Estilo: ${p.lifestyle}.
  Dores: ${p.pains.join("; ")}. Objetivos: ${p.goals.join("; ")}. Usa hoje: ${p.current_solution}.
  Sensibilidade a preço ${p.price_sensitivity}/5, tech ${p.tech_savviness}/5, decide de forma ${p.decision_style}, canal preferido ${p.preferred_channel}.
  Objeções: ${p.objections.join(" | ")}. Confia em: ${p.trust_factors.join(", ")}. Diz: "${p.quote}"`,
  )
  .join("\n")}

Regras de saída (um resultado por persona, mesmos idx):
- decision: "compra" (compraria nas próximas semanas), "depois" (interesse real mas adia/condiciona) ou "nao_compra".
- willingness_to_pay_brl: o que pagaria pela oferta como está (0 se não compraria por nenhum preço). max_price_brl: teto de preço que aceitaria para este tipo de solução.
- objections_raised: as objeções que de fato pesaram, na linguagem da pessoa. objections_overcome: se a oferta (diferenciais/garantia/posicionamento) as neutralizou.
- reasoning: 1-2 frases em primeira pessoa, com a voz da persona.
- deal_breaker: o motivo decisivo da recusa, ou null.
- what_would_convince: a mudança concreta que viraria o jogo para ela.
- Seja coerente: renda baixa + preço alto raramente compra; cético sem prova social não compra; quem já paga por alternativa pior pode trocar.`;
}

export function summaryPrompt(
  input: BusinessInput,
  analysis: Analysis,
  scenario: ScenarioConfig,
  metricsText: string,
  sampleReasonings: string,
): string {
  return `A simulação com 100 clientes do ICP terminou. Sintetize o que aprendemos e recalibre o veredito.

${offerDescription(input, scenario)}

SCORE DO ANALISTA ANTES DA SIMULAÇÃO: ${analysis.verdict.success_score}/100 (${analysis.verdict.rating})
ECONOMIA UNITÁRIA ESTIMADA: CAC ${brl(analysis.unit_economics.estimated_cac_brl)}, LTV ${brl(analysis.unit_economics.estimated_ltv_brl)}, break-even ${analysis.unit_economics.breakeven_customers_per_month} clientes/mês, custos fixos ${brl(input.monthly_fixed_costs)}/mês.

MÉTRICAS DA SIMULAÇÃO:
${metricsText}

AMOSTRA DE FALAS DOS CLIENTES SIMULADOS:
${sampleReasonings}

Produza:
- headline: uma frase de impacto com o resultado.
- verdict: 1 parágrafo honesto conectando conversão, objeções, preço e economia unitária (a conversão simulada é sobre pessoas DENTRO do ICP já expostas à oferta; na vida real a taxa será menor).
- success_score_after: recalibre o score (0-100) com base na simulação.
- top_objections: as 3 a 6 objeções mais frequentes com como contornar cada uma.
- segment_insights: um insight por segmento.
- pricing_insight e channel_insight: específicos e acionáveis.
- adjustments: 3 a 6 ajustes priorizados, com expected_score_delta realista.
- pivot_warning: se a simulação sugerir que o modelo precisa mudar de forma estrutural, explique; senão null.`;
}
