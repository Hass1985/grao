> **Este caminho NÃO está em uso.** Optamos pela integração direta com a Meta
> (`server/src/metaWebhook.ts`), que custa R$ 0 e dispensa um segundo sistema.
> Estes fluxos ficam aqui como plano B, caso um dia faça sentido dar aos sócios
> uma interface visual para montar automações sem código.

# WhatsApp via n8n

O n8n aqui é **encanamento, não cérebro**. Ele recebe do BSP, chama um endpoint
do backend e envia o que voltar. Toda decisão — quem é o usuário, o que
responder, se cabe semente hoje — fica no backend, onde dá para testar.

Por isso os endpoints falam em **telefone**, não em `userId`: o n8n não precisa
manter tabela de mapeamento nem inventar identificadores.

## Antes de importar

1. No Render, defina `GRAO_API_TOKEN` com um segredo forte. Sem ele os
   endpoints respondem **503** — falham fechados de propósito, porque abertos
   exporiam a conversa e o telefone de todos os usuários.
2. No n8n, crie as credenciais/variáveis:
   - `GRAO_API` — `https://grao-backend.onrender.com`
   - `GRAO_TOKEN` — o mesmo valor do `GRAO_API_TOKEN`
   - `WA_PHONE_ID` e `WA_TOKEN` — do WhatsApp Business (Meta Cloud API)

## Os dois fluxos

| Arquivo | O que faz |
|---|---|
| `fluxo-a-inbound.json` | Mensagem recebida → cérebro → resposta (e semente, se pedida) |
| `fluxo-b-diaria.json` | Cron por janela de horário → fila de entrega → envio |

## A restrição que molda tudo: a janela de 24h

A Meta só permite **texto livre** nas 24 horas seguintes à última mensagem do
usuário. Fora disso, apenas **template (HSM) aprovado**.

Isso tem consequência direta no Fluxo B: não dá para simplesmente mandar o
devocional inteiro às 8h da manhã de quem não falou com você ontem.

Duas saídas, e o `/whatsapp/due` devolve o material para as duas:

**Opção 1 — template com a semente dentro (recomendada).** Submeta um template
com variáveis e mande a semente já no primeiro disparo. O endpoint devolve
`parts` com cada campo separado para preencher as variáveis.

Texto para submeter à aprovação (categoria `UTILITY`):

```
Olá {{nome}}, sua semente de hoje 🌱

"{{passagem}}"
— {{referencia}}

{{reflexao}}

Prática de hoje: {{pratica}}

🎵 {{musica}}
```

E no campo **Rodapé** (que não consome o limite do corpo):

```
Que Deus te guarde hoje. 🌱
```

Duas regras da Meta que derrubam o modelo se ignoradas:

1. **Variáveis são nomeadas**, não numeradas — minúsculas e sublinhados, sem
   acento. `{{1}}` é recusado.
2. **O corpo não pode terminar (nem começar) numa variável.** É por isso que
   existe a linha de fecho no final.
3. **O limite de 1024 caracteres vale para a mensagem MONTADA**, não para o
   modelo com os espaços vazios. Medindo a base, 16 das 380 sementes
   estouravam o teto. A solução é na ORIGEM: `npm run content:fit` reescreve
   editorialmente as reflexões longas, entregando texto **completo** e mais
   enxuto. Cortar no envio deixaria a reflexão terminando em "…" e a pessoa
   pensaria que faltou alguma coisa. O corte no `sendSeedTemplate` continua lá
   só como rede de segurança, e grita no log quando dispara.

No envio, cada parâmetro leva `parameter_name` com esses mesmos nomes.

**Opção 2 — template curto de convite.** Um template pequeno ("Sua semente de
hoje está pronta. Quer receber?") com botão de resposta rápida. Quando a pessoa
responde, abre-se a janela de 24h e o Fluxo A entrega a semente completa em
texto livre, usando `message` já formatado.

A opção 2 aprova mais fácil e gasta menos, mas adiciona um toque de atrito
diário. A opção 1 entrega o valor de imediato — comece por ela e use a 2 como
plano B se a aprovação demorar.

## Endpoints que os fluxos consomem

Todos exigem o cabeçalho `x-grao-token`.

### `POST /whatsapp/inbound`

```json
{ "phone": "5511999998888", "text": "to muito ansioso hoje", "name": "Marcos" }
```

Responde:

```json
{
  "userId": "uuid",
  "mensagens": ["resposta curta", "semente completa (só se pedida)"],
  "needsCare": false,
  "reading": { "family": "ansiedade", "confidence": 88 }
}
```

`mensagens` vem na ordem de envio — um balão por item. O backend decide sozinho
se a pessoa pediu a semente; o n8n não precisa interpretar intenção.

`needsCare: true` sinaliza sofrimento intenso. A resposta já inclui o CVV (188),
mas é o gancho para você acionar um alerta interno, se quiser.

### `GET /whatsapp/due?window=morning`

Janelas: `dawn` (6h–8h), `morning` (8h–10h), `noon` (12h–13h), `evening` (20h–22h).

Devolve quem ainda **não recebeu hoje**, no fuso de cada usuário, com a
mensagem já renderizada. Isso torna o disparo idempotente: um cron que roda
duas vezes não entrega duas sementes.

Atenção: chamar este endpoint **já registra a entrega**. Não o use para
"espiar" a fila — cada chamada consome a semente do dia daqueles usuários.

### `POST /whatsapp/opt-in`

```json
{ "phone": "5511999998888", "window": "morning", "optIn": true }
```

Registra o consentimento e a janela escolhida. Sem `wa_opt_in_at` preenchido, o
usuário nunca entra na fila do Fluxo B.

## O que ainda depende de você (fora do código)

- Conta WhatsApp Business API por um BSP (Meta Cloud API direto, Twilio,
  360dialog ou Gupshup)
- Verificação do negócio no Business Manager
- Template aprovado (ver acima)
- Opt-in explícito registrado — a tela de consentimento do app cobre isso
