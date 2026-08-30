# Grão — Roadmap técnico do Trial

Mapa dos 5 pontos levantados com os sócios: o que **já está construído**, o que **falta**, e os **contratos de integração** para cada frente trabalhar em paralelo.

---

## 1. O "cérebro" emocional ✅ construído (validar em uso)

**O problema:** o onboarding com questionário longo (~20 perguntas) fricciona e derruba a adoção. E sem entendimento contínuo, a entrega vira mensagem genérica.

**A solução implementada (2 peças):**

### a) A Abertura — onboarding por áudio (`src/screens/onboarding/Abertura.tsx` + `POST /onboarding/opening`)
O questionário morreu. O onboarding agora é **um único momento**: a pessoa grava um **áudio de até 1 minuto** (ou escreve, a um toque) contando o que tem vivido e pedido a Deus — e o Grão responde **citando o que ela disse**. Por que áudio-primeiro: o "áudio de zap" é a língua nativa do público, falar da própria caminhada é prática que o evangélico já tem (testemunho), e 1 minuto de fala carrega mais sinal que 10 perguntas.

- **Transcrição no aparelho** (Web Speech API): o áudio **nunca sai do dispositivo** — só o texto viaja (ganho de LGPD e custo zero de STT no web).
- Fluxo: nome → desabafo (mic pulsante, transcrição ao vivo, contador 60s) → resposta personalizada → segue o cadastro. Fallbacks em cada ponto: sem voz/permissão negada → texto; sem backend → leitura local; "Pular" sempre visível; a conversa por chat segue disponível como alternativa.
- Backend: `readOpening()` em `brain.ts` (modelo forte, 1 chamada por usuário na vida) extrai de uma vez: resposta personalizada, família emocional + intensidade + confiança, canal sensorial, `needs_care` e `themes` — e o endpoint monta o perfil-base completo.
- **Nativo (Trial):** Web Speech não existe no app nativo. Duas opções: (a) `expo-speech-recognition` (on-device, requer dev build — recomendado) ou (b) gravar com `expo-av` → STT no servidor (Whisper via Groq/OpenAI) → mesma `/onboarding/opening`. O contrato do endpoint já aceita qualquer transcrição.

### b) Onboarding por chat (alternativa) — `server/src/prompt.ts`
A conversa guiada caiu de ~20 para **no máximo 4 perguntas** e permanece como caminho alternativo ("Prefiro conversar por mensagem").

### c) Leitura contínua — `server/src/brain.ts` (o coração)
**Toda mensagem** do usuário (app ou WhatsApp) passa por um classificador silencioso que devolve:

```jsonc
{
  "family": "ansiedade",      // 1 de 10 famílias emocionais
  "intensity": 78,             // 0-100: força do estado
  "confidence": 85,            // 0-100: segurança da leitura
  "channel_hint": "auditivo",  // pista de canal sensorial (ou null)
  "needs_care": false,         // sofrimento intenso → tom mais cuidadoso
  "summary": "..."             // 1 frase interna, nunca exibida
}
```

Regras de produto embutidas:
- **Confiança mínima (60)** para a leitura mudar o estado — "ok, obrigado" não muda nada.
- **Respeito ao usuário:** o cérebro **nunca sobrepõe** um momento definido manualmente nas últimas 24h.
- **`needs_care`:** sofrimento intenso é sinalizado para adaptação de tom e acompanhamento pastoral humano (view `v_needs_care_7d`). ⚠️ Decisão pendente de produto: protocolo para esses casos (ex.: mensagem acolhedora + indicação do CVV 188). O Grão acolhe, não diagnostica.
- **Custo:** modelo pequeno (Haiku) + prompt caching → ~centavos por usuário/mês.

**Endpoint universal** — é este que o n8n/WhatsApp chama:

```
POST /message  { userId, text, source: "app"|"whatsapp", wantSeed?: true }
→ { reading, momentUpdated, seed? }

GET /state/:userId
→ { moment, lastReading, profileHint, channel }
```

**Metodologia do motor (v2 — evidência antes do veredito):** o modelo é obrigado, pela ordem dos campos da ferramenta, a (1) analisar o relato, (2) listar **citações literais** que sustentam a leitura ("sem evidência, sem afirmação"), e só então (3) classificar — com **família secundária** para estados mistos e **régua de confiança calibrada** (neutro <30 · ambíguo 40-60 · claro 65-85 · inequívoco 90+) — e (4) escrever a resposta ancorada nas evidências, com **teste anti-genérico** ("se encaixaria no relato de outra pessoa, reescreva") e lista de frases proibidas. O prompt inclui exemplos calibrados (misto, luto com needs_care, neutro).

**✅ Validado 12/12 (ago/2026).** O eval encontrou 4 bugs que faziam o motor falhar silenciosamente e cair na resposta genérica. Armadilhas do schema com `strict: true` (documentar para quem for editar as ferramentas): **não use `minItems`/`maxItems` em arrays, `minimum`/`maximum` em integers, nem `type:['string','null']` com `enum`** — para enum anulável use `anyOf: [{type:'string',enum:[…]},{type:'null'}]` e escreva os limites na `description`. O 4º bug: `max_tokens` truncava antes do campo `response` (o último gerado) em relatos longos — daí o limite generoso de 2500.

**Segurança em crise:** o prompt orienta mencionar o **CVV 188** quando há menção a não querer viver, e o endpoint tem fallback ciente de crise — se a leitura principal falhar, roda uma leitura leve só para não responder de forma inadequada a alguém em sofrimento. Verificado no eval (caso `desesperanca-profunda`).

**Garantia de qualidade — harness de avaliação (`server/scripts/eval-opening.ts`):** 12 relatos realistas (todas as famílias + neutro + transcrição com erros + desesperança profunda) rodam contra o motor REAL e medem: família correta, calibração de confiança, needs_care, ancoragem da resposta no relato e frases proibidas. Rodar: `cd server && ANTHROPIC_API_KEY=sk-... npm run eval:opening`. **Regra do Trial: mudou o prompt → roda o eval.**

**⚠️ Modo demo vs. motor real:** sem `EXPO_PUBLIC_GRAO_API_URL` configurado (caso do webapp publicado), o app usa um fallback local por léxico — que agora só afirma leitura com sinal claro (vago/ambíguo → acolhimento neutro). A inteligência de verdade exige o backend rodando com `ANTHROPIC_API_KEY`. Para o Trial: **deployar o backend** (Railway/Render/Fly) e apontar o app pra ele.

**Deploy:** o backend está pronto para produção — `Dockerfile`, `render.yaml`, `railway.json`, health check com diagnóstico (`GET /health` diz o que falta) e SSL automático para Supabase. Passo a passo em [`server/DEPLOY.md`](server/DEPLOY.md). Verificação pós-deploy em um comando: `GRAO_API=https://sua-url npm run smoke` (testa abertura ancorada, cérebro atualizando estado, mensagem neutra não mudando nada, semente e exclusão LGPD).

**Falta:** rodar o eval com a chave (validação inicial), deployar o backend, e calibrar com usuários reais usando os dados das views.

## 2. Curadoria de conteúdo ✅ arquitetura completa em produção

**Fábrica de conteúdo com âncoras anti-invenção (ago/2026):**

| Camada | O que é | Estado |
|---|---|---|
| `bible_verses` | **Bíblia COMPLETA no nosso banco** — Bíblia Livre (tradução brasileira moderna, licença CC-BY 3.0 BR), 66 livros, 31.102 versículos. O texto bíblico nunca vem da memória de um modelo. | ✅ importada |
| `passage_pool` | Cardápio curado: **380 referências** (38 × 10 famílias), 100% validadas versículo a versículo contra o texto importado (`content:validate-pool`) | ✅ |
| `musics` | Pool de louvores **validados na API do iTunes** (catálogo BR, sem chave): só entra faixa que existe, com nome oficial; playback/instrumental/remix são recusados. **75 faixas**, todas as famílias com 8+ | ✅ |
| `content_drafts` | Rascunhos gerados por IA aguardando **revisão humana** — nada chega ao usuário sem aprovação | ✅ |

**Fluxo de produção** (`server/scripts/`): `content:generate` sorteia passagens menos usadas do pool → injeta o **texto real** do versículo → Claude escreve reflexão/oração/prática na voz do Grão (com lista de clichês proibidos e checagens automáticas) → música do pool da família → rascunho. `content:review` lista/mostra/aprova/rejeita; aprovar publica direto na tabela `seeds`. View `v_content_health` acompanha o estoque por família.

### Meta 365: um ano sem repetição

O `seedSelector` já registra cada entrega em `seed_deliveries` e **nunca** repete uma semente para o mesmo usuário. Com 380 sementes, isso são 365+ dias sem repetição — o padrão "Café com Deus Pai".

Quatro travas de qualidade, aplicadas nesta ordem:

| Trava | Script | Custo | O que pega |
|---|---|---|---|
| Antirrepetição na geração | embutida no `content:generate` | — | mostra ao modelo as práticas e aberturas **já existentes na família** e o obriga a divergir; repertório de ~39 gestos físicos |
| Sanidade estrutural | `content:check` | zero | tag interna vazando no texto, campo truncado, placeholder. Descarta **antes** de gravar no banco (pegou 7 saídas defeituosas em 260) |
| Variedade quantitativa | `content:variety` | zero | similaridade lexical (Jaccard) entre todas as práticas e aberturas da mesma família |
| Auditoria editorial | `content:audit` | API | revisor de IA lê a família inteira de uma vez e julga fidelidade à passagem, teologia, voz, prática concreta e variedade |

O que a auditoria marcar volta pro `content:regen`, que reescreve com o contexto de antirrepetição. Só então vai para a revisão humana.

**As 380 estão publicadas e aprovadas** (ago/2026): 37 a 39 por família.

### Garantia de espaçamento no calendário

Não repetir a mesma semente não basta: duas sementes *parecidas* caindo perto
uma da outra também soam repetidas. A regra é dura — **nada semelhante a menos
de 5 dias** — e vale para dois sentidos de "semelhante":

- **mesmo gesto físico** (`seeds.gesture`, vocabulário fechado de 30 termos). É a
  repetição que a pessoa sente no corpo, ainda que as palavras mudem: "segure um
  objeto na palma" e "ponha a mão no peito" não compartilham vocabulário e são o
  mesmo gesto;
- **par lexicalmente próximo** (`seed_similar`, Jaccard sobre prática e abertura).

O `seedSelector` filtra pela janela (7 dias, com margem sobre os 5 exigidos) e —
o detalhe que faz a garantia durar o ano — **ordena pelo gesto com mais sementes
inéditas restantes**. Sem essa ordenação o sorteio gasta os gestos abundantes
cedo e sobra um bolo do maior grupo no fim do ano, sem candidato elegível.

`npm run content:simulate` prova a garantia rodando 365 dias contra o seletor
real e **falha o processo** se achar qualquer repetição. Rodar depois de mexer
no seletor, no rótulo de gestos ou na base.

⚠️ Ao gerar sementes novas, rode `content:gestures` e `content:similarity` antes
de publicar — semente sem gesto não participa da garantia.

**Atribuição CC-BY** ✅ tela `Credits` (Ajustes → Sobre) com a licença da Bíblia
Livre e a indicação das modificações que fizemos no texto-fonte, como a licença
exige.

### Estado anterior (base mínima)

- Banco `seeds` estruturado por **família emocional × tipo** (reflexão/oração/prática — o tipo casa com o canal sensorial da pessoa).
- **20 sementes curadas** (2 por família, 10 famílias) em `server/db/seed_data.sql` — suficiente pra iniciar o Trial (com dedupe por usuário).
- **Músicas: só faixas reais e verificadas** (7 faixas com link de faixa exata no Spotify). Regra de curadoria: nenhuma música entra sem verificação — já tivemos títulos "inventados" no protótipo e é o tipo de erro que destrói confiança.
- O seletor (`seedSelector.ts`) escolhe por: momento atual → formato preferido → ineditismo.

**Falta:** pipeline editorial pra escalar (meta: 90+ sementes = ~1 mês sem repetição por família). Sugestão: geração assistida por IA **com revisão humana/teológica obrigatória** antes de publicar — posso montar esse pipeline quando decidirem.

## 3. Integração WhatsApp (n8n) 🟡 backend pronto — falta a conta no BSP

O backend expõe o canal inteiro. O n8n é encanamento: recebe do BSP, chama um
endpoint e envia o que voltar. Toda decisão fica aqui, onde dá para testar.

| Endpoint | O que faz |
|---|---|
| `POST /whatsapp/inbound` | telefone + texto → cérebro lê, gera resposta curta e decide sozinho se a pessoa pediu a semente. Devolve os balões na ordem de envio |
| `GET /whatsapp/due?window=` | fila da janela (dawn/morning/noon/evening) com a mensagem já renderizada **e** as partes separadas para template HSM |
| `POST /whatsapp/opt-in` | consentimento + janela de horário escolhida |

Os endpoints falam em **telefone**, não em `userId`: o n8n não mantém tabela de
mapeamento. Autenticação por `WHATSAPP_TOKEN` (header `x-grao-token`), com
falha **fechada** — sem a variável, respondem 503.

Fluxos prontos para importar em `server/n8n/` (dois JSON + README).

**A restrição que molda tudo:** a Meta só aceita texto livre nas 24h seguintes à
última mensagem do usuário. Fora disso, apenas template aprovado. Por isso o
`/whatsapp/due` devolve `parts` (passagem, referência, reflexão, prática
separadas) além do texto pronto — o README traz o texto do template a submeter.

`/whatsapp/due` é idempotente por dia no fuso de cada usuário: cron repetido não
duplica entrega. Em compensação, **chamar já registra a entrega** — não serve
para espiar a fila.

Falta (fora do código): conta WhatsApp Business API por um BSP, verificação do
negócio no Business Manager, template aprovado e `WHATSAPP_TOKEN` no Render.

## 4. Design/UX 🤝 com os sócios

Frente dos sócios. O que está pronto pra apoiar: protótipo navegável no ar, webapp real publicado, telas em `pitch/telas/`, tokens de design em `src/theme/` (cores/tipografia/sombras centralizados — reestilizar é trocar tokens, não caçar telas).

## 5. Base de dados + painéis (Supabase) 🟡 pronto pra plugar

O schema é **Postgres puro → 100% compatível com Supabase**. Setup (~15 min):

1. Criar projeto no supabase.com → SQL Editor → colar e rodar `server/db/schema.sql`, depois `server/db/seed_data.sql`.
2. Copiar a **connection string** (usar o **Session pooler**) → `DATABASE_URL` no `.env` do backend. Nada mais muda — o backend usa `pg` padrão.
3. Painéis: as **views já criadas** aparecem no Supabase Studio (Table Editor → Views) e em qualquer BI:
   - `v_signups_daily` — cadastros/dia
   - `v_active_users_daily` — usuários ativos/dia
   - `v_deliveries_daily` — sementes entregues × plantadas/dia (retenção do ritual)
   - `v_family_distribution_30d` — termômetro emocional da base
   - `v_needs_care_7d` — sinais de cuidado (acompanhamento humano)
4. Segurança: o acesso é só do backend (service role). Se um dia o app falar direto com o Supabase, aí sim configurar RLS.
5. A tabela `events` registra tudo que vira métrica (`signup`, `onboarding_done`, `message_in`, `seed_delivered`, `moment_changed`...).

---

## Ordem sugerida para o Trial

| # | Entrega | Dono | Status |
|---|---|---|---|
| 1 | Cérebro + onboarding curto | eu (feito) | ✅ validar em uso |
| 2 | Supabase de produção + `db:init` | vocês (15 min) + eu | 🟡 |
| 3 | BSP WhatsApp (conta, templates) | sócios/infra | 🔴 |
| 4 | Fluxos n8n (A e B acima) | eng. sócios + eu | 🔴 |
| 5 | Banco de 90+ sementes com revisão | curadoria + eu | 🟡 |
| 6 | UX/Design refinado | sócios | 🤝 |
| 7 | Pagamento (trial 7d → cobrança) | a definir | 🔴 |

> Item 7 não estava na lista, mas o Trial de 7 dias com cobrança no 8º (prometido na tela de planos) precisa de um gateway (Stripe/Pagar.me/Asaas + Pix). Vale decidir cedo.
