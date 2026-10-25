# Founder City — simulador de viabilidade de negócios

Funde seu negócio numa cidade 3D isométrica antes de arriscar dinheiro de verdade.

**Fluxo**

1. **Fundar** — wizard de 5 passos: ideia, local/ICP, oferta e preço, finanças.
2. **Analisar** — pesquisa na web (concorrentes reais, demografia da região, preços, regulação) e análise estruturada: TAM/SAM/SOM, demografia, concorrência, preço, economia unitária (CAC, LTV, break-even, runway), SWOT, ameaças, barreiras, ICP com segmentos e score de sucesso (0-100).
3. **Gerar clientes** — 100 personas dentro do ICP (nome, idade, renda, rotina, solução atual, objeções, canal, estilo de decisão). Cada uma vira um morador da cidade, no bairro do seu segmento.
4. **Simular** — cada cliente ouve a oferta, levanta objeções e decide (compra / adia / recusa). Métricas: conversão, curva de preço, objeções mais citadas, conversão por segmento, canais, leads para break-even e para a meta. A IA sintetiza o veredito pós-simulação e os ajustes.
5. **Ajustar e re-simular** — mude preço, oferta, garantia, posicionamento e canais; rode de novo com os mesmos 100 clientes e compare cenários.

**Cidade 3D** — a sede sobe com o score e acende janelas conforme a viabilidade; concorrentes viram prédios (altura = força, cor = ameaça); ameaças viram nuvens de tempestade; bairros são os segmentos do ICP; os 100 clientes caminham até a sede (compram), orbitam (pensando) ou vão embora (recusam). Clique numa pessoa para ver a persona e o raciocínio dela.

## Stack

Next.js 16 (App Router) · React Three Fiber + drei + postprocessing · Anthropic SDK (structured outputs, web search) · Supabase (persistência via RPC com RLS) · Zustand · Tailwind v4 · Recharts.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev
```

Sem `ANTHROPIC_API_KEY` o app roda em **modo demonstração** (dados sintéticos, marcados na interface). Sem Supabase, os dados ficam em memória.

### Variáveis

| Variável | Para quê |
|---|---|
| `ANTHROPIC_API_KEY` | Liga a IA real (análise, personas, simulação). |
| `AI_MODEL_ANALYSIS` | Modelo da análise e síntese. Padrão `claude-opus-5-5`. |
| `AI_MODEL_SIM` | Modelo das personas e da simulação. Padrão `claude-opus-5-5`; `claude-sonnet-5-5` reduz o custo. |
| `AI_MOCK=1` | Força o modo demonstração. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Persistência. Aplique `supabase/migrations/0001_sim_schema.sql` no projeto. |

### Banco

As tabelas `sim_*` têm RLS ligado sem políticas diretas: todo acesso passa pelas funções `sim_*` (security definer), que exigem o token anônimo do dono (cookie httpOnly `sim_owner`). Assim a chave publishable pode ser usada no servidor sem expor dados entre usuários.

### Custos por rodada (estimativa)

Análise com pesquisa: 1 chamada com web search + 1 estruturada. Personas: 4 chamadas (25 cada). Simulação: 10 chamadas (10 clientes cada) + 1 síntese. Com Opus 5.5 uma rodada completa fica na casa de alguns dólares; troque `AI_MODEL_SIM` por Sonnet 5.5 para baratear.

## Estrutura

```
src/app                 páginas e rotas de API (streaming NDJSON)
src/lib/ai              prompts, análise, personas, simulação, mock
src/lib/db              store (Supabase RPC ou memória)
src/components/city     cena 3D (R3F)
src/components/hud      painéis, barra, card de persona, log
src/components/wizard   formulário de fundação
supabase/migrations     schema + funções RPC
```
