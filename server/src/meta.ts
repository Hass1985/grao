// Cliente da Graph API do WhatsApp — o lado que FALA com a Meta.
//
// Mantido separado das rotas de propósito: enviar mensagem é a operação que
// custa dinheiro e que o usuário final enxerga, então ela merece um lugar
// próprio, com erro explícito e nada de falha silenciosa.

const GRAPH = `https://graph.facebook.com/${process.env.WA_GRAPH_VERSION || 'v21.0'}`;

const TOKEN = () => process.env.WA_ACCESS_TOKEN ?? '';
const PHONE_ID = () => process.env.WA_PHONE_NUMBER_ID ?? '';
const TEMPLATE = () => process.env.WA_TEMPLATE_NAME || 'semente_do_dia';
const TEMPLATE_LANG = () => process.env.WA_TEMPLATE_LANG || 'pt_BR';

export function metaConfigurada(): boolean {
  return !!TOKEN() && !!PHONE_ID();
}

/**
 * Teto de espera para qualquer chamada à Meta.
 *
 * O `fetch` do Node NÃO tem timeout padrão: uma conexão que fica pendurada
 * espera para sempre. Numa chamada solta isso é um pedido lento; dentro da
 * varredura da agenda foi o que matou a entrega diária — uma única conexão
 * presa segurava o `despacharDevidos`, a trava `rodando` nunca voltava a false
 * e a agenda parava até o próximo deploy, sem um erro sequer no log.
 *
 * Trinta segundos é folgado para a Graph API, que responde em ~300ms.
 */
const TIMEOUT_MS = Number(process.env.WA_TIMEOUT_MS ?? 30_000);

async function chamar(corpo: unknown): Promise<{ ok: boolean; id?: string; erro?: string }> {
  if (!metaConfigurada()) return { ok: false, erro: 'WA_ACCESS_TOKEN ou WA_PHONE_NUMBER_ID ausente' };

  let res: Response;
  try {
    res = await fetch(`${GRAPH}/${PHONE_ID()}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e: any) {
    // Falha de rede vira erro tratado, e não promessa pendurada. Quem chamou
    // decide o que fazer; a varredura registra e segue para a próxima pessoa.
    const motivo = e?.name === 'TimeoutError'
      ? `a Meta não respondeu em ${TIMEOUT_MS / 1000}s`
      : e?.message || 'falha de rede';
    return { ok: false, erro: motivo };
  }
  const j: any = await res.json().catch(() => ({}));

  if (!res.ok || j.error) {
    // O código 131047 é o mais comum e o mais confuso: significa que a janela
    // de 24h fechou e só template é aceito. Vale traduzir para quem for ler o log.
    const cod = j.error?.code;
    const detalhe = cod === 131047
      ? 'janela de 24h fechada — fora dela só template aprovado'
      : j.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, erro: `${detalhe}${cod ? ` (código ${cod})` : ''}` };
  }
  return { ok: true, id: j.messages?.[0]?.id };
}

/**
 * Card de preview do link no fim da mensagem.
 *
 * Com preview, o WhatsApp busca a og:image da nossa página-ponte e desenha um
 * cartão. O cartão dá presença ao louvor, mas a miniatura vai COMPRIMIDA dentro
 * da própria mensagem — existe um piso de nitidez que não depende do arquivo
 * que servimos, e foi onde a marca ficou sempre um pouco borrada.
 *
 * Sem preview, some o cartão: fica o texto da semente e o link tocável. A
 * semente ganha o fim da mensagem de volta, que é o lugar que o olho procura.
 *
 * DESLIGADO por padrão: depois de ver os dois no aparelho, o card saiu perdendo.
 * Para religar, WA_LINK_PREVIEW=true no ambiente — sem deploy, porque a
 * resposta aqui é de gosto e gosto muda vendo.
 */
const PREVIEW_LINK = () => process.env.WA_LINK_PREVIEW === 'true';

/** Texto livre. Só funciona dentro da janela de 24h após a última mensagem da pessoa. */
export function sendText(phone: string, texto: string, preview?: boolean) {
  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: texto, preview_url: preview === undefined ? PREVIEW_LINK() : preview },
  });
}

/**
 * Aviso de que a semente do dia está pronta.
 *
 * Por que um AVISO e não a semente inteira: a Meta rejeitou o template
 * completo por categoria — versículo, reflexão e link de música são conteúdo,
 * e a categoria Utilidade cobre "mensagem sobre uma conta ou pedido
 * existente". Marketing aprovaria, mas custa muito mais por mensagem, todo
 * dia, por assinante.
 *
 * O aviso é, de fato, uma notificação sobre a assinatura. E ele resolve mais
 * do que a categoria: o toque no botão abre a janela de 24h, e a semente
 * completa segue como TEXTO LIVRE — gratuito, sem o teto de 1024 caracteres
 * e com formatação melhor. Sumiu junto a necessidade de encurtar reflexão.
 *
 * O toque, aliás, é o próprio gesto de plantar. A fricção virou o ritual.
 */
/** Os dois botões, com id estável. O rótulo tem teto de 20 caracteres. */
export const BOTOES = [
  { id: 'plantar', titulo: 'Plantar' },
  { id: 'troca', titulo: 'Meu sentimento mudou' },
] as const;

/**
 * O MESMO aviso de dois botões, mas sem gastar template.
 *
 * Dentro da janela de 24h o WhatsApp aceita mensagem interativa — botões de
 * verdade, sem passar pela aprovação da Meta e sem o preço de Marketing.
 *
 * Isto existe para resolver um problema de produto que só apareceu no uso: a
 * semente ia como texto livre quando a janela estava aberta, e texto livre não
 * tem botão. Resultado, ao contrário do que o produto quer: QUEM USA MAIS via
 * MENOS o "Meu sentimento mudou", porque cada interação reabre a janela.
 *
 * Agora os dois botões chegam todo dia, para todo mundo. Quando a janela está
 * fechada vai o template (Marketing, ~R$ 0,34); quando está aberta vai isto
 * (mensagem de sessão, ~R$ 0,04). A pessoa não vê diferença nenhuma.
 *
 * O corpo é curto de propósito — é o mesmo aviso do template, não a semente.
 * Mensagem interativa tem teto de 1024 caracteres, e a semente formatada
 * chega a 1072; ela continua indo como texto livre depois do toque.
 */
export function sendSeedNoticeInteractive(
  phone: string,
  partes: { name: string; reference: string },
) {
  const nome = partes.name?.trim();
  const corpo = [
    `${nome ? 'Olá ' + nome + ', sua' : 'Sua'} semente de hoje já está pronta 🌱`,
    '',
    `A palavra vem de ${partes.reference}.`,
    '',
    'Toque em Plantar para receber a reflexão, a prática e o louvor. ' +
    'Se o seu momento mudou, me conta antes.',
  ].join('\n');

  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: corpo },
      footer: { text: 'Grão · uma semente por dia' },
      action: {
        buttons: BOTOES.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.titulo },
        })),
      },
    },
  });
}

export function sendSeedNotice(phone: string, partes: { name: string; reference: string }) {
  const campos: Array<[string, string]> = [
    ['nome', partes.name?.trim() || 'tudo bem'],   // variável vazia é recusada
    ['referencia', partes.reference],
  ];
  const posicional = process.env.WA_TEMPLATE_POSITIONAL === 'true';
  const parameters = campos.map(([nome, text]) =>
    posicional ? { type: 'text', text } : { type: 'text', parameter_name: nome, text });

  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: TEMPLATE(),
      language: { code: TEMPLATE_LANG() },
      components: [{ type: 'body', parameters }],
    },
  });
}

/** O rótulo do botão único do template de quem plantou pelo aplicativo. */
export const BOTAO_VER = 'Ver minha semente';

const TEMPLATE_PLANTADA = () =>
  (process.env.WA_TEMPLATE_PLANTADA ?? 'semente_plantada').trim();

/**
 * Aviso para quem JÁ plantou pelo aplicativo — um botão só.
 *
 * Os dois botões do template normal não servem aqui: plantar já foi feito, e a
 * troca do dia fechou junto. Mas o botão não pode sumir de vez, e a razão é a
 * janela de 24h: ela abre quando a PESSOA toca em algo. Sem toque, só caberia
 * na mensagem o que entra em 1024 caracteres — a oração, a prática e o louvor
 * ficariam de fora. Com ele, o toque abre a janela e a semente inteira sai em
 * seguida como texto livre, de graça.
 */
export function sendSeedNoticePlantada(phone: string, partes: { name: string; reference: string }) {
  const campos: Array<[string, string]> = [
    ['nome', partes.name?.trim() || 'tudo bem'],
    ['referencia', partes.reference],
  ];
  const posicional = process.env.WA_TEMPLATE_POSITIONAL === 'true';
  const parameters = campos.map(([nome, text]) =>
    posicional ? { type: 'text', text } : { type: 'text', parameter_name: nome, text });

  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: TEMPLATE_PLANTADA(),
      language: { code: TEMPLATE_LANG() },
      components: [{ type: 'body', parameters }],
    },
  });
}

/** A mesma coisa na janela aberta: interativa, um botão, sem custo de template. */
export function sendSeedNoticePlantadaInteractive(
  phone: string,
  partes: { name: string; reference: string },
) {
  const nome = partes.name?.trim();
  const corpo = [
    `${nome ? nome + ', sua' : 'Sua'} semente de hoje já está plantada 🌱`,
    '',
    `Ela foi escolhida para o seu momento, e hoje traz ${partes.reference}.`,
    '',
    'Toque abaixo para ler.',
  ].join('\n');

  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: corpo },
      action: { buttons: [{ type: 'reply', reply: { id: 'ver', title: BOTAO_VER } }] },
    },
  });
}

/**
 * Um template qualquer, com variáveis posicionais.
 *
 * Existe separado de sendSeedNotice porque não é a semente: é o aviso interno
 * de risco emocional, que vai para o telefone do time e não para o da pessoa.
 * Misturar os dois no mesmo lugar acabaria com alguém mexendo no template da
 * semente para ajustar o alerta — e a semente é o produto.
 *
 * Posicional ({{1}}, {{2}}) sempre: este template é nosso, criado por nós, e
 * não herda a dúvida de nomeação que o da semente carrega.
 */
export function sendTemplate(phone: string, nome: string, idioma: string, textos: string[]) {
  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: nome,
      language: { code: idioma },
      components: textos.length
        ? [{ type: 'body', parameters: textos.map((text) => ({ type: 'text', text })) }]
        : [],
    },
  });
}

/** Marca a mensagem como lida — o "visto" azul. Cortesia barata: não custa nada. */
export async function markRead(messageId: string): Promise<void> {
  if (!metaConfigurada()) return;
  await fetch(`${GRAPH}/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => { /* nunca deve derrubar o fluxo principal */ });
}
