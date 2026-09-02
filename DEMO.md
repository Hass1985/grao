# Grão — Guia de demonstração (pitch)

Dois caminhos. Para a **apresentação ao vivo**, use o **Caminho A** (mais robusto). Para **provar que a IA é real**, use o **Caminho B** (grave um vídeo antes, para não depender da rede na hora).

---

## Caminho A — Protótipo offline (recomendado para o palco)

O app roda 100% sem backend: a conversa inicial usa o roteiro local, o perfil é calculado no aparelho e a semente é entregue pelo perfil. É o que você deve mostrar ao vivo, porque não depende de internet, servidor nem chave de API.

### Rodar no seu celular (Expo Go)
1. No terminal, dentro de `grao/`:
   ```bash
   npm install
   npx expo start
   ```
2. Instale o **Expo Go** (App Store / Play Store) no celular.
3. Escaneie o QR code (celular e computador na **mesma rede Wi‑Fi**).
4. Pronto — dá para percorrer: Welcome → **Conversa** → Notificações → WhatsApp → Planos → app (Hoje/Campo/Raiz).

### Roteiro de demonstração (3 minutos)
1. **Abertura:** toque em "Plantar minha primeira semente".
2. **A conversa que conhece a pessoa:** responda 4–5 perguntas. Destaque que **nunca** parece um teste — é um amigo conversando. Mencione que o canal sensorial e o momento estão sendo captados nos bastidores.
3. **A entrega personalizada:** na tela **Hoje**, mostre que a semente veio no formato do perfil. Toque em **"Estou passando por outra coisa"** e escolha um sentimento → a semente **muda na hora**.
4. **Configuração de momento:** em **Configurações → Como estou me sentindo**, mude o momento e volte para Hoje para mostrar a adaptação.
5. **Confiança/LGPD:** em **Configurações → Privacidade e dados**, mostre o disclaimer "Aqui você pode se abrir com tranquilidade".
6. **Modelo de negócio:** role até **Planos** (Plantio R$ 19,90/mês / Anual R$ 199).

> Dica: percorra o fluxo uma vez antes de apresentar para "aquecer" o app.

---

## Caminho B — IA generativa de verdade (Claude API)

Aqui a conversa é conduzida pela Claude API real: perguntas dinâmicas e classificação do perfil via `salvar_perfil`. Precisa de backend + banco + chave. Ótimo para um vídeo gravado ou uma demo técnica.

### 1. Pré-requisitos
- **Node 18+**
- **PostgreSQL** (local): `brew install postgresql@16 && brew services start postgresql@16`
- **Chave da Claude API** (console.anthropic.com). Nunca coloque no app.

### 2. Subir o backend
```bash
cd grao/server
cp .env.example .env
# edite o .env: ANTHROPIC_API_KEY=sk-ant-...  e  DATABASE_URL=postgres://SEU_USUARIO@localhost:5432/grao
npm install
createdb grao
npm run db:init      # cria as tabelas e carrega as sementes de exemplo
npm run dev          # sobe em http://localhost:8787
```
Teste: `curl http://localhost:8787/health` → `{"ok":true}`.

### 3. Descobrir o IP do computador (para o celular achar o backend)
```bash
ipconfig getifaddr en0    # ex.: 192.168.15.95
```

### 4. Ligar o app ao backend
Crie o arquivo `grao/.env` (na raiz do app) com:
```
EXPO_PUBLIC_GRAO_API_URL=http://SEU_IP:8787
```
(ex.: `http://192.168.15.95:8787`). Depois reinicie o Expo:
```bash
cd grao
npx expo start -c        # -c limpa o cache para pegar a variável nova
```

### 5. Rodar
Abra no Expo Go (mesma Wi‑Fi). Agora a **Conversa** fala com a Claude API: o Grão gera as perguntas, valida as respostas e, ao final, salva o perfil no PostgreSQL. A semente do dia vem de `GET /seed/today/:userId`.

### Verificar que funcionou
- No terminal do backend, você verá os turnos chegando.
- No banco: `psql grao -c "select name, dominant_channel, emotional_hint from profiles;"`

---

## Qual usar no pitch?
- **No palco:** Caminho A (offline). Zero dependências, zero risco.
- **Para provar a tecnologia:** um trecho gravado do Caminho B, mostrando a conversa dinâmica e, se quiser, o JSON do perfil no banco (a "inteligência por trás").

## Solução de problemas
| Sintoma | Causa provável | Solução |
|---|---|---|
| App não conecta no backend | IP errado / firewall / redes diferentes | Confirme o IP, use a mesma Wi‑Fi, teste `curl http://SEU_IP:8787/health` do celular |
| Variável não aplicou | Cache do Expo | `npx expo start -c` |
| `db:init` falha | Postgres não está rodando ou `DATABASE_URL` errada | `brew services start postgresql@16`; confira usuário/porta |
| 401 da Claude API | Chave inválida/ausente | Confira `ANTHROPIC_API_KEY` no `server/.env` |
| Tela branca no celular | Bundle ainda compilando | Aguarde alguns segundos; recarregue no Expo Go |

## Segurança
- A `ANTHROPIC_API_KEY` vive só no backend (`server/.env`, que está no `.gitignore`). Nunca no app.
- Revogue/rotacione qualquer chave que já tenha sido exposta.
