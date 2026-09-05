# Grão — contexto para quem mexe no app

Este arquivo existe para qualquer agente ou pessoa que vá alterar `src/`.
O backend (`server/`) é mantido separadamente; aqui está o que o app precisa
saber para não quebrar o que já funciona.

---

## O que o Grão é hoje

**Dois produtos debaixo do mesmo app.** Isto é a decisão de produto mais
importante e quase tudo depende dela:

| | Gratuito | Assinante |
|---|---|---|
| O que recebe | Devocional anual "De Grão em Grão": 366 páginas fixas, uma por data do calendário, iguais para todo mundo | Semente escolhida pelo motor a partir do momento emocional dela |
| Oração, prática, louvor | bloqueados | liberados |
| WhatsApp | não recebe | recebe todo dia, com o botão "Plantar" |
| Custo de API | zero | leitura emocional + memória |

O gratuito **não é uma amostra capada**: é um material inteiro, com começo,
meio e fim. Assinar não é "desbloquear o resto de uma página", é sair de um
livro para alguém que te acompanha. A tela precisa comunicar isso.

---

## Regras que não podem ser quebradas

### 1. O paywall é do servidor. A tela nunca decide.

`/seed/today` já devolve cortado para quem não assina. **Nunca** monte a tela
buscando conteúdo por outro caminho, nem esconda com CSS o que a API mandou.
Se a resposta trouxer `prayer`, a pessoa tem direito a ele.

`null` em `prayer` / `practice` / `music` significa **bloqueado**, não
inexistente. É o gancho do convite para assinar. Renderizar espaço vazio ali é
bug.

### 2. O app nunca escreve versículo bíblico.

Todo texto bíblico vem da API, recuperado de uma base fechada (Bíblia Livre,
31.102 versículos). Se o público evangélico pegar uma citação errada, o
produto perde credibilidade em uma semana. Não gere, não complete, não
"melhore" versículo em lugar nenhum do app.

O campo `passage` já traz o texto literal e `reference` a referência exata
(ex.: `Romanos 8:2`). O campo `verse` é a **paráfrase** na voz do devocional:
pode aparecer como texto do devocional, mas **nunca entre aspas com uma
referência ao lado**, porque aí vira citação falsa.

### 3. A resposta de segurança emocional não se altera.

Quando alguém relata sofrimento grave, o backend interrompe o fluxo e devolve
um texto fixo com o CVV (188). Esse texto é escrito por gente, não passa por
IA e não deve ser reformatado, resumido nem enfeitado pela tela. Se a API
devolver `needsCare: true`, mostre a mensagem como veio.

### 4. Sem travessão (—) em texto que o usuário lê.

O travessão virou assinatura de texto de IA, e num devocional isso custa a
confiança. Use vírgula, dois-pontos ou ponto final. Vale para toda copy nova.
Hífen normal continua ("meio-dia", "Provérbios 3:5-6").

### 5. Não mexa em `server/`.

O backend, o motor emocional, a memória, a cobrança e as integrações são
mantidos fora daqui. Alterar `server/` cria conflito.

---

## O que o app chama

Base: `EXPO_PUBLIC_GRAO_API_URL` (produção: `https://grao-backend.onrender.com`).

### `GET /seed/today/:userId` — a tela Hoje

Devolve **um de dois produtos**. O campo `tipo` diz qual:

```jsonc
// Gratuito
{
  "tipo": "devocional",
  "data": "2026-09-05",
  "title": "A lei do Espírito de vida",
  "body": "texto do devocional, voz de Deus em primeira pessoa",
  "passage": "Porque a Lei do Espírito de vida...",  // versículo LITERAL
  "reference": "Romanos 8:2",                        // referência exata
  "verse": "O que te prendia perdeu autoridade...",  // paráfrase, NÃO é citação
  "prayer": null, "practice": null, "music": null,
  "completa": false,
  "bloqueado": { "prayer": true, "practice": true, "music": true },
  "compartilhavel": "texto pronto para o botão compartilhar",
  "acesso": { "completo": false, "situacao": "nenhuma", "terminaEm": null }
}

// Assinante
{
  "tipo": "semente",
  "id": "s-ansiedade-8", "family": "ansiedade", "type": "reflexão",
  "passage": "...", "reference": "Provérbios 3:5-6",
  "reflection": "...", "prayer": "...", "practice": "...",
  "music": { "title": "...", "artist": "...", "spotifyUrl": "..." },
  "completa": true, "bloqueado": null,
  "compartilhavel": "...",
  "acesso": { "completo": true, "situacao": "trial", "terminaEm": "..." }
}
```

### Os outros

| Rota | Para quê |
|---|---|
| `GET /acesso/:userId` | situação da assinatura, sem pedir a semente |
| `GET /seeds/history/:userId?limit=` | Campo e Raiz. Mesma regra de bloqueio. Para o gratuito, devolve os dias já passados do ano |
| `POST /profile/:userId/whatsapp` | liga o WhatsApp: `{ phone, time: "HH:MM", timezone }` |
| `POST /onboarding/opening` | a Abertura (só depois de assinar) |
| `POST /assinatura/:userId` | assinar: `{ plano: "plantio"\|"anual", cpf, email }` |
| `POST /assinatura/:userId/cancelar` | cancelar em um passo |
| `GET /seed/today/:userId` | acima |

`compartilhavel` já vem pronto do servidor. O botão de compartilhar só passa
essa string para o `Share` do sistema. Não monte o texto no app: ele muda
(convite, link, campanha) e cada mudança exigiria publicar versão nova.

---

## O fluxo do onboarding (novo)

```
Splash (só "Grão")
  → Telas de apresentação (frases curtas, com efeito)
  → Autenticação (Google, Apple, Facebook ou e-mail/senha, via Supabase Auth)
  → Entra no app, na tela Hoje
       card "Deus, o que temos para hoje?" → revela o devocional do dia
       botão pequeno de compartilhar embaixo
```

**Horário, telefone, Abertura e escolha de plano saíram do onboarding.** Eles
pertencem ao fluxo de assinatura, porque só fazem sentido para quem assina:
sem WhatsApp, um horário de entrega não entrega nada.

O card antes do devocional não é enfeite: transforma a leitura num gesto de
abrir, o mesmo papel que o botão "Plantar" faz no WhatsApp.

Referência visual: Glorify (fluxo e ritmo), com a arte do Grão (fontes, cores,
marca). Simplicidade é recurso, não falta: fonte grande, um caminho por tela,
"abriu → já está no devocional de hoje". O público envelhece para cima e parte
relevante tem 45+.

---

## Onde estão as coisas

```
src/theme/          colors, typography, spacing, radius, shadows
src/components/ui/  Button, BackButton, AppHeader, FloatingTabBar,
                    ScreenBackground, StepProgress, Reveal
src/components/     SeedCard, MusicPlayer, SeletorHorario, GraoSymbol...
src/screens/        Hoje, Campo, Raiz, Settings, Credits, PrivacyPolicy
src/screens/onboarding/  Welcome, Intro, Abertura, Notification, WhatsApp, Plan
src/onboarding/aiClient.ts   todas as chamadas ao backend passam por aqui
src/navigation/index.tsx     as pilhas de navegação
```

Toda chamada nova ao backend entra em `aiClient.ts`, não espalhada nas telas.

`Intro.tsx` **já tem** as telas de apresentação com 4 slides e animação de
scroll. Não precisa recriar: precisa de outro destino (autenticação em vez da
Abertura) e de polimento visual.

---

## Publicar

```bash
npm run build:web     # gera dist/ com a URL de produção embutida
```

O `dist/` **não se atualiza sozinho**. Publicar no Netlify sem rodar o build
sobe a versão anterior, e já aconteceu.

---

## Preços

R$ 19,90/mês (Plantio) e R$ 199,00/ano (Anual), com 7 dias grátis e a primeira
cobrança no 8º dia. Cobrança por **Pix**, não pela loja de aplicativos: parte
relevante do público não tem cartão de crédito.
