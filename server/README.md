# Grão — Backend (IA generativa + perfil + entrega)

Backend Node/TypeScript que conduz a **conversa inicial com a Claude API de verdade**, classifica o perfil-base (canal sensorial + OCEAN + momento emocional) via **tool use** com schema estrito, guarda tudo no **PostgreSQL** e entrega a semente do dia **de acordo com o perfil**.

## Arquitetura

```
App (Expo)  ──POST /onboarding/turn──►  Backend (Node)  ──►  Claude API (claude-opus-4-8)
                                             │  tool_use "salvar_perfil" (JSON estrito)
                                             ▼
                                        PostgreSQL  ◄── GET /seed/today/:userId (semente por perfil)
```

- A chave da API **nunca** vai para o app — fica só no backend (evita exposição).
- **Prompt caching** no system prompt (grande e estável) reduz custo ~90% após a 1ª chamada.
- **Adaptive thinking** melhora a precisão da classificação oculta.
- A IA chama a ferramenta `salvar_perfil` quando conhece a pessoa — o **JSON silencioso** vira o perfil-base.

## Rodar

1. **Pré-requisitos:** Node 18+, PostgreSQL, uma chave da Claude API.
2. `cp .env.example .env` e preencha `ANTHROPIC_API_KEY` e `DATABASE_URL`.
3. `npm install`
4. Criar o banco e carregar as sementes de exemplo:
   ```bash
   createdb grao
   npm run db:init
   ```
5. `npm run dev`  → `http://localhost:8787`

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/onboarding/turn` | Uma rodada da conversa. `{ userId, history }` → `{ done, message, channel? }` |
| GET | `/profile/:userId` | Perfil-base (uso interno/curadoria) |
| GET/PATCH | `/profile/:userId/moment` | Lê/ajusta o "momento atual" manual |
| GET | `/seed/today/:userId` | Semente do dia escolhida pelo perfil + momento + canal |
| DELETE | `/user/:userId` | **LGPD** — apaga todos os dados do usuário |

## Como o app conversa com o backend

O app mantém o histórico `[{role, content}]`. A cada mensagem do usuário, faz `POST /onboarding/turn` com o histórico. Enquanto `done=false`, mostra `message` como fala do Grão. Quando `done=true`, o perfil foi salvo e o app segue para o app principal; a semente do dia vem de `GET /seed/today/:userId`.

> O protótipo atual do app roda a versão **offline** (roteiro fixo em `src/data/onboardingScript.ts`). Para ligar a IA de verdade, aponte a `Conversa.tsx` para este backend (uma função `postTurn(history)` no lugar do motor local). O contrato de mensagens é o mesmo.

## LGPD (dado sensível)

Convicção religiosa é **dado pessoal sensível** (Lei 13.709/2018, art. 5º, II). Este backend:
- coleta apenas o necessário para personalizar o conteúdo, com **consentimento** (`users.consent_at`);
- guarda o perfil e a conversa vinculados ao usuário, com **exclusão total** via `DELETE /user/:userId`;
- mantém a mecânica de classificação **invisível** ao usuário, mas a política de privacidade (na tela de Configurações do app) declara o uso.

## Modelo

Padrão `claude-opus-4-8` (o mais capaz). Para reduzir custo em produção de alto volume, troque `GRAO_MODEL=claude-sonnet-5` no `.env`.
