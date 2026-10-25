# Briefing para preencher o Founder City

Você vai me ajudar a preencher o formulário do **Founder City**, um simulador de viabilidade e crescimento de negócios. Leia este briefing, use tudo o que você sabe sobre o negócio em questão (e me pergunte o que faltar) e **devolva um único bloco JSON** no formato da seção 4. Eu vou colar esse JSON no sistema, que preenche o formulário sozinho.

## 1. O que o sistema faz

1. **Análise com IA e pesquisa na web**: tamanho de mercado (TAM/SAM/SOM), demografia da região (se físico), concorrentes reais, preço vs. mercado, economia unitária (CAC, LTV, break-even, runway), SWOT, ameaças, barreiras, regulação, perfil de cliente ideal (ICP) com segmentos e um score de 0 a 100.
   - Para negócio **que vai abrir**: o score é a chance realista de sobreviver e lucrar em 24 meses.
   - Para negócio **que já existe**: o sistema faz um diagnóstico de crescimento. Pesquisa o próprio negócio (avaliações, presença online), compara faturamento e volume atuais com o potencial da região, identifica onde o funil trava e o score é a chance de atingir a meta de crescimento em 12 a 24 meses.
2. **100 clientes do ICP**: pessoas sintéticas com nome, idade, renda, rotina, solução atual, objeções e canal preferido, distribuídas pelos segmentos do ICP.
3. **Simulação**: cada cliente ouve a oferta e decide (compra, adia, recusa), com objeções, teto de preço e o que o convenceria. Sai conversão, curva de preço, objeções mais citadas, conversão por segmento, canais, leads necessários para o break-even e para a meta.
4. **Cenários**: mudar preço, oferta, garantia, posicionamento e canais, e re-simular com os mesmos 100 clientes.

A qualidade da análise depende da qualidade do preenchimento. Seja específico e use números reais sempre que existirem. Onde não souber, estime e diga que é estimativa (no campo de texto correspondente).

## 2. Campos do formulário

Todos os campos abaixo existem no JSON. Textos em português do Brasil. Valores em reais (número, sem "R$" e sem separador de milhar; use ponto para decimais).

### Básico

| Campo | Tipo | O que colocar |
|---|---|---|
| `stage` | `"ideia"` ou `"existente"` | `"ideia"` se vai abrir; `"existente"` se já opera. |
| `name` | texto | Nome do negócio. |
| `category` | texto | Segmento, ex.: "Clínica odontológica", "Cafeteria", "SaaS de agendamento". |
| `pitch` | texto (3 a 10 frases) | O que vende, para quem, como funciona, por que alguém compraria. No caso de negócio existente, descreva como opera hoje (serviços, estrutura, diferenciais percebidos). |
| `model` | `"fisico"`, `"online"` ou `"hibrido"` | Ponto físico, 100% online, ou os dois. |
| `location` | objeto `{ "city", "state", "neighborhood", "country" }` | Para físico/híbrido: cidade, UF (sigla), bairro (pode ser vazio), país ("Brasil"). Para online, pode deixar cidade/UF vazios. |
| `target_audience` | texto (2 a 6 frases) | Cliente ideal: idade, renda, rotina, dor que sente, como decide. Quanto mais vivo, melhor. |
| `acquisition_channels` | lista de textos | Escolha entre: "Instagram", "TikTok", "Google", "Indicação", "WhatsApp", "Facebook Ads", "Parcerias locais", "Ponto físico / rua", "Marketplace", "LinkedIn", "YouTube", "Eventos". Pode incluir outros. |

### Oferta e preço

| Campo | Tipo | O que colocar |
|---|---|---|
| `price` | número > 0 | Ticket médio por venda/atendimento, em reais. Se há vários serviços, use o ticket médio real. |
| `pricing_model` | `"unico"`, `"assinatura"`, `"recorrente"`, `"pacote"`, `"comissao"` ou `"freemium"` | Como cobra: por venda/visita; mensalidade; planos/pacotes recorrentes; projeto fechado; comissão; grátis com upgrade. |
| `differentiators` | texto | Por que escolher este negócio e não o concorrente. |
| `known_competitors` | texto | Nomes de concorrentes (redes, independentes, alternativas e substitutos). |

### Dinheiro

| Campo | Tipo | O que colocar |
|---|---|---|
| `initial_investment` | número ≥ 0 | Para ideia: investimento inicial. Para existente: quanto está disponível para investir em crescimento. |
| `monthly_fixed_costs` | número ≥ 0 | Custos fixos mensais (aluguel, equipe, software, pró-labore). |
| `variable_cost_pct` | número 0 a 95 | Custo variável como % do preço (insumos, taxas, comissões, impostos sobre venda). |
| `team_size` | inteiro ≥ 1 | Pessoas na operação, incluindo o dono. |
| `founder_experience` | `"nenhuma"`, `"alguma"` ou `"veterano"` | Experiência do dono no segmento. |
| `goal_monthly_revenue` | número ≥ 0 | Meta de faturamento mensal (0 se não houver). |
| `launch_horizon_months` | inteiro ≥ 0 | Para ideia: em quantos meses lança. Para existente, use 0. |

### Situação atual (só quando `stage` = `"existente"`; senão `existing` = `null`)

| Campo | Tipo | O que colocar |
|---|---|---|
| `existing.months_operating` | inteiro ≥ 0 | Tempo de operação em meses. |
| `existing.monthly_revenue` | número > 0 | Faturamento mensal atual (aproximado serve). |
| `existing.customers_per_month` | número ≥ 0 | Clientes/pacientes atendidos por mês. |
| `existing.growth_goal` | texto | Para onde quer chegar e em quanto tempo. |
| `existing.what_works` | texto | O que já funciona (canais, serviços, pontos fortes). |
| `existing.what_fails` | texto | O que não funciona / onde o funil trava (ser encontrado, confiança, conversão de orçamento, ticket, recorrência). |
| `existing.main_challenges` | texto | Principais desafios hoje (concorrência, agenda ociosa, dependência do dono, equipe…). |
| `existing.online_presence` | texto | Site, Instagram (seguidores, frequência), Google Meu Negócio, anúncios ativos. |
| `existing.reviews` | texto | Nota e volume de avaliações (Google, etc.), reclamações e elogios recorrentes. |

## 3. Regras para o preenchimento

- Devolva **somente** o bloco JSON (dentro de ```json ... ```), sem comentários e sem texto fora dele.
- Todos os campos devem existir. Não invente números financeiros: se não souber, estime de forma conservadora e sinalize a estimativa em `pitch` ou em `existing.main_challenges` (ex.: "faturamento estimado").
- Use os valores exatos dos campos de escolha (`stage`, `model`, `pricing_model`, `founder_experience`).
- `price`, `monthly_fixed_costs` e `existing.monthly_revenue` precisam ser coerentes entre si (ticket × clientes/mês ≈ faturamento).
- Em `target_audience` e `pitch`, escreva como quem conhece o negócio por dentro: detalhes concretos valem mais que adjetivos.

## 4. Modelo de resposta

Copie esta estrutura e preencha. Exemplo para um negócio existente (um consultório odontológico):

```json
{
  "stage": "existente",
  "name": "Clínica Sorriso & Cia",
  "category": "Clínica odontológica",
  "pitch": "Clínica odontológica com 2 cadeiras no centro de São Vicente, atende particular e dois convênios. Carro-chefe: estética (clareamento, lentes) e implantes; também clínico geral. Dentista dono atende 70% dos casos; uma dentista associada e uma recepcionista. Agenda cheia de manhã e ociosa à tarde. Pacientes chegam principalmente por indicação e Google.",
  "model": "fisico",
  "location": { "city": "São Vicente", "state": "SP", "neighborhood": "Centro", "country": "Brasil" },
  "target_audience": "Mulheres de 28 a 50 anos, classes B e C, que trabalham no centro ou moram num raio de 3 km, querem resultado estético visível (clareamento, lentes) e decidem comparando 2 ou 3 orçamentos. Confiam em avaliações no Google e em indicação de amigas. Objeção principal: preço e medo de dor.",
  "acquisition_channels": ["Google", "Indicação", "Instagram", "WhatsApp"],
  "price": 650,
  "pricing_model": "unico",
  "differentiators": "Avaliação com scanner intraoral, parcelamento em até 12x, atendimento humanizado, horário estendido às terças e quintas.",
  "known_competitors": "OdontoCompany, Sorridents, 3 consultórios independentes no centro, Clínica da Unimed.",
  "initial_investment": 20000,
  "monthly_fixed_costs": 28000,
  "variable_cost_pct": 25,
  "team_size": 3,
  "founder_experience": "veterano",
  "goal_monthly_revenue": 90000,
  "launch_horizon_months": 0,
  "existing": {
    "months_operating": 60,
    "monthly_revenue": 52000,
    "customers_per_month": 110,
    "growth_goal": "Chegar a R$ 90 mil/mês em 12 meses e ocupar a agenda da tarde",
    "what_works": "Indicação de pacientes antigos, avaliação no Google 4,8, estética com boa margem",
    "what_fails": "Instagram não gera agendamento; muitos orçamentos de implante não fecham; tarde ociosa",
    "main_challenges": "Redes com preço baixo na mesma rua; dependência do dentista dono; equipe pequena para follow-up",
    "online_presence": "Instagram com 3,1 mil seguidores e posts irregulares; sem site; perfil no Google ativo; nunca anunciou",
    "reviews": "Google 4,8 com 86 avaliações; elogios ao atendimento; 3 reclamações sobre espera"
  }
}
```

Para um negócio que **vai abrir**, use `"stage": "ideia"`, `"existing": null` e preencha `launch_horizon_months`.

Agora, com base no que você sabe sobre o negócio, me devolva o JSON preenchido. Se faltar alguma informação importante para preencher com confiança, pergunte antes de responder.
