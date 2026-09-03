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

async function chamar(corpo: unknown): Promise<{ ok: boolean; id?: string; erro?: string }> {
  if (!metaConfigurada()) return { ok: false, erro: 'WA_ACCESS_TOKEN ou WA_PHONE_NUMBER_ID ausente' };

  const res = await fetch(`${GRAPH}/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
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

/** Marca a mensagem como lida — o "visto" azul. Cortesia barata: não custa nada. */
export async function markRead(messageId: string): Promise<void> {
  if (!metaConfigurada()) return;
  await fetch(`${GRAPH}/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => { /* nunca deve derrubar o fluxo principal */ });
}
