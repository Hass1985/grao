# Deploy do backend do Grão — passo a passo

Objetivo: colocar o cérebro no ar para que o app (e o WhatsApp, depois) usem a
inteligência real em vez do fallback de demonstração.

**Ordem: Supabase → backend → apontar o app.** Cada passo é verificável.

---

## Passo 1 — Banco no Supabase (~10 min)

1. Crie um projeto em [supabase.com](https://supabase.com) (plano free serve para o Trial).
   Guarde a senha do banco que ele pede na criação.
2. No projeto: **SQL Editor → New query** → cole todo o conteúdo de
   [`db/schema.sql`](db/schema.sql) → **Run**.
3. Nova query → cole [`db/seed_data.sql`](db/seed_data.sql) → **Run**.
   (Isso planta as 20 sementes curadas.)
4. Confira: **Table Editor** deve mostrar `users`, `profiles`, `seeds`,
   `emotional_readings`, `events` e as views `v_*`.
5. Copie a connection string: **Project Settings → Database → Connection string
   → escolha "Session pooler"** e troque `[YOUR-PASSWORD]` pela senha do passo 1.

> Use o **Session pooler** (porta 5432, IPv4). A conexão direta pode falhar em
> hosts sem IPv6.

## Passo 2 — Subir o backend

Escolha **uma** plataforma. Todas leem o `Dockerfile` ou o `package.json` daqui.

### Opção A — Railway (mais simples)
1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
   (ou `npm i -g @railway/cli && railway up` na pasta `server/`).
2. Se usar repositório, defina **Root Directory = `server`**.
3. **Variables** → adicione:
   - `ANTHROPIC_API_KEY` = sua chave
   - `DATABASE_URL` = a string do Supabase (passo 1.5)
   - `CORS_ORIGINS` = a URL do seu app (ex.: `https://dapper-smakager-388102.netlify.app`)
4. **Settings → Networking → Generate Domain**. Guarde a URL pública.

### Opção B — Render
1. [render.com](https://render.com) → **New → Blueprint** → aponte para o repositório
   (ele lê o [`render.yaml`](render.yaml)).
2. Preencha `ANTHROPIC_API_KEY`, `DATABASE_URL` e `CORS_ORIGINS` quando pedir.

### Opção C — Fly.io
```bash
cd server && fly launch --no-deploy
fly secrets set ANTHROPIC_API_KEY=sk-ant-... DATABASE_URL='postgres://...'
fly deploy
```

## Passo 3 — Verificar (não pule)

```bash
curl https://SUA-URL/health
```
Esperado: `{"ok":true,"anthropicKey":"ok","db":"ok","version":2}`.
Se vier `503`, o próprio JSON diz o que falta.

Depois, o teste de ponta a ponta (roda o caminho real do usuário):
```bash
cd server && GRAO_API=https://SUA-URL npm run smoke
```
Ele valida: abertura com resposta ancorada no relato, cérebro atualizando o
estado, mensagem neutra **não** mudando nada, semente do dia e exclusão LGPD.

## Passo 4 — Apontar o app para o backend

Na raiz do projeto, crie/edite o `.env`:
```
EXPO_PUBLIC_GRAO_API_URL=https://SUA-URL
```
Depois republique o webapp:
```bash
npx expo export --platform web
# empacote pitch/webapp e suba no Netlify (mesmo site, para manter a URL)
```

Verifique no app: faça a Abertura contando algo específico ("estou desempregado
há quatro meses…") — a resposta deve **citar o que você disse**. Se vier genérica,
o app ainda está no fallback (variável não aplicada no build).

---

## Custo estimado (Trial)

| Item | Custo |
|---|---|
| Supabase free | R$ 0 |
| Railway/Render starter | ~US$ 5–7/mês |
| Claude — Abertura (1x/usuário, modelo forte) | centavos por usuário |
| Claude — cérebro (por mensagem, Haiku + cache) | ~centavos/usuário/mês |

## Segurança

- A chave vive **só** no painel da plataforma / `.env` local (gitignored). Nunca no app.
- Se uma chave vazar, **revogue no console da Anthropic** e gere outra.
- `CORS_ORIGINS` restringe quem chama a API. Defina em produção.
- Dado religioso é sensível (LGPD): `DELETE /user/:id` apaga tudo em cascata.
