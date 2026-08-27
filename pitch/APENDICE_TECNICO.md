# Grão — Apêndice técnico (para engenharia)

Para os engenheiros avaliarem o produto. Descreve a arquitetura **como ela existe hoje** no repositório e **o que falta construir**, sem vaporware.

---

## 1. Visão geral

```
┌─────────────────────┐        ┌──────────────────────────┐
│  App (Expo / RN)    │        │  Backend (Node/Express)  │
│  Onboarding, Hoje,  │  HTTPS │  /onboarding/turn        │
│  Campo, Raiz, Perfil│◀──────▶│  /seed/today/:userId     │
│  react-native-web   │        │  /profile ... /moment    │
└─────────────────────┘        │  DELETE /user/:id (LGPD) │
                               └───────┬──────────┬───────┘
                                       │          │
                          ┌────────────▼───┐  ┌───▼─────────────┐
                          │ Anthropic API  │  │  PostgreSQL     │
                          │ claude-opus-4-8│  │ profiles, seeds,│
                          │ (perfil oculto)│  │ seed_deliveries,│
                          └────────────────┘  │ moments, turns  │
                               ┌──────────────┴─────────────┐
                               │ WhatsApp Business API (BSP) │  ← roadmap
                               │ entrega diária proativa     │
                               └─────────────────────────────┘
```

**Stack:** TypeScript ponta a ponta. App: Expo/React Native (SDK 54/55), react-native-svg, AsyncStorage. Backend: Express, `pg` (PostgreSQL), `@anthropic-ai/sdk`.

---

## 2. O ativo: motor de personalização

Não vendemos "usamos IA". O ativo é **como** a personalização é feita, em duas dimensões separadas:

- **Canal sensorial (VAK)** → define o **formato** entregue.
  `visual → reflexão · auditivo → oração · sinestésico → prática` (`seedSelector.ts`, `CHANNEL_TO_TYPE`).
- **Família emocional + OCEAN** → definem **conteúdo e tom**.
  Família = `momento manual` (se o usuário ajustou) › `emotional_hint` do perfil › `esperança` (padrão).

O mapeamento é **oculto**: o usuário vive uma conversa, nunca um questionário. As palavras "perfil", "análise", "teste", "OCEAN" são proibidas no prompt.

---

## 3. Fluxo de dados

### 3.1 Onboarding conversacional — `POST /onboarding/turn`
- Body: `{ userId, history: [{role, content}] }`.
- Chama `runTurn(history)` → Anthropic:
  - `model = claude-opus-4-8` (override por `GRAO_MODEL`), `max_tokens: 2048`.
  - `thinking: { type: 'adaptive' }` — melhora a precisão da classificação oculta.
  - **Prompt caching** (`cache_control: ephemeral`) no system prompt (grande e estável) → ~90% mais barato após a 1ª chamada.
  - **Tool estrita** `salvar_perfil` (`strict: true`) — garante um JSON válido e completo.
- O modelo conversa em texto (uma pergunta por vez, ~20 perguntas). Quando conhece a pessoa, `stop_reason === 'tool_use'` → devolve o **perfil**.
- Resp: `{ done:false, message }` enquanto conversa; `{ done:true, message, channel, emotionalHint }` ao salvar.

**Perfil gerado (schema da tool):**
```jsonc
{
  "name": "Lucas",
  "dominant_channel": "visual | auditivo | sinestesico",
  "sensory_scores": { "visual": int, "auditivo": int, "sinestesico": int },
  "ocean": { "O": 0-100, "C": 0-100, "E": 0-100, "A": 0-100, "N": 0-100 },
  "emotional_hint": "ansiedade|paz|esperança|propósito|gratidão|fé|solidão|luto|culpa|alegria",
  "initial_request": "nas palavras da pessoa, o que tem pedido a Deus",
  "answers": [ { "topic": "...", "value": "..." } ]
}
```

### 3.2 Semente do dia — `GET /seed/today/:userId`
`selectSeedForUser` (`seedSelector.ts`):
1. Resolve `family` (momento › hint › padrão) e `preferredType` (canal → formato).
2. Query 1: semente na família-alvo, **ainda não entregue** (`NOT IN seed_deliveries`), priorizando o formato do canal (`ORDER BY (type = $preferred) DESC, random()`).
3. Fallback 1: qualquer semente inédita (formato como desempate).
4. Fallback 2: já viu tudo → repete a mais alinhada.
5. Registra a entrega em `seed_deliveries` (evita repetição) e retorna a semente + `reason` (por que foi escolhida).

### 3.3 Ajuste de momento — `PATCH /profile/:userId/moment`
Usuário muda a família emocional atual (ex.: "estou em luto") → a próxima seleção muda **na hora**.

### 3.4 LGPD — `DELETE /user/:userId`
`deleteUserData` apaga todo o dado do usuário. Direito de exclusão total exposto como endpoint.

---

## 4. Modelo de dados (PostgreSQL)

- **profiles** — `dominant_channel`, `sensory_scores`, `ocean`, `emotional_hint`, `initial_request`, `answers` (perfil oculto, uso interno/curadoria).
- **seeds** — `family`, `type`, `passage`, `reference`, `reflection`, `prayer`, `practice`, `music_title/artist/spotify/youtube`.
- **seed_deliveries** — `user_id`, `seed_id` (histórico de entrega + dedupe).
- **moments** — momento emocional atual do usuário.
- **turns** — auditoria das mensagens da conversa.

---

## 5. Privacidade, segurança e LGPD

- **Dado religioso é sensível** (LGPD, Art. 11). Base legal: **consentimento explícito** (tela de consentimento no onboarding), transparente — o app confirma que guarda os dados e para quê.
- **Minimização + classificação invisível**: o perfil orienta a entrega, nunca é exibido ao usuário.
- **Exclusão total** via endpoint (`DELETE /user/:id`).
- **Chave de API só no backend** (`ANTHROPIC_API_KEY` em `.env`, gitignored) — nunca no app. Rotacionar qualquer chave exposta.
- A fazer: rate limiting, criptografia em repouso para PII sensível, trilha de auditoria, política de retenção.

---

## 6. Custo de IA (estimativa a validar)

- **Onboarding** (1x por usuário): ~20 turnos; system grande **cacheado** (~90% de economia após a 1ª chamada). Custo one-time estimado: **centavos a poucos reais** por usuário.
- **Semente diária**: hoje é **seleção em banco** (barata), não uma chamada de LLM por dia — o LLM é usado no onboarding e (roadmap) para gerar/curar conteúdo, não a cada entrega. Isso mantém o COGS diário baixo.
- **Mensagem WhatsApp**: custo por conversa do BSP (~centavos), some ao COGS.
- Resultado: **R$ 2–5/usuário/mês**, margem bruta ~90% (ver [MERCADO_E_NUMEROS.md](MERCADO_E_NUMEROS.md)).

---

## 7. Entrega no WhatsApp (roadmap de produção)

- **Não** é a API hoje (no protótipo, a entrega é simulada em tela — ver `WhatsAppDemo.tsx`).
- Produção: **WhatsApp Business API** via um BSP (Meta Cloud API direto, ou Twilio / 360dialog / Gupshup).
- Requer: verificação de negócio (Business Manager), **templates aprovados (HSM)** para mensagem proativa diária, **opt-in** explícito, respeito à janela de 24h, agendamento por horário escolhido pelo usuário.
- Custo por conversa e políticas da Meta entram no COGS e no planejamento.

---

## 8. Estado atual — construído × a construir (honesto)

**Construído (protótipo funcional):**
- App completo (onboarding conversacional, Hoje, Campo, Raiz, Perfil) rodando em Expo/RN + web.
- Backend com: conversa via LLM, geração do perfil oculto (tool estrita), motor de seleção da semente, endpoints de perfil/momento, **exclusão LGPD**.
- Conteúdo semente modelado (versículo, reflexão, oração, prática, música) com curadoria por família emocional.

**A construir:**
- Integração **WhatsApp Business API** em produção (entrega proativa real).
- **Pipeline/CMS de conteúdo em escala** (curadoria editorial + geração assistida por IA com revisão humana) — o gargalo de qualidade é conteúdo, não infra.
- **Pagamentos/assinatura** (gateway BR, Pix, recorrência) e gestão de trial.
- **Analytics de retenção/churn** e testes A/B (a métrica nº 1 do negócio).
- Hardening de segurança (rate limit, criptografia em repouso, auditoria).

---

## 9. Onde os 2 engenheiros agregam (perguntas abertas)

1. **BSP de WhatsApp**: qual provedor, custo por conversa em escala, arquitetura de templates e opt-in.
2. **Conteúdo em escala**: CMS + geração assistida por IA com revisão humana; versionamento e curadoria por tradição (evangélica/católica).
3. **Retenção**: instrumentação de churn, loops de hábito, notificação inteligente sem virar spam.
4. **Pagamentos**: recorrência no Brasil (Pix assinatura, cartão), gestão de trial e inadimplência.
5. **Custo de IA em escala**: caching, batching, quando (e se) usar LLM por entrega vs. seleção em banco.
6. **Dados sensíveis**: modelo de segurança/privacidade à altura de dado religioso (LGPD).

> Repositório: app em `/grao`, backend em `/grao/server` (`src/anthropic.ts`, `prompt.ts`, `seedSelector.ts`, `server.ts`, `db.ts`).
