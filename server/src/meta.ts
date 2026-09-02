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

/** Texto livre. Só funciona dentro da janela de 24h após a última mensagem da pessoa. */
export function sendText(phone: string, texto: string) {
  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: texto, preview_url: true },
  });
}

/**
 * Template aprovado — o único caminho fora da janela de 24h.
 *
 * A ordem das variáveis tem que casar exatamente com o corpo submetido à Meta:
 * {{1}} nome · {{2}} passagem · {{3}} referência · {{4}} reflexão · {{5}} prática
 */
export function sendSeedTemplate(phone: string, partes: {
  name: string; passage: string; reference: string; reflection: string; practice: string;
}) {
  const v = [
    partes.name?.trim() || 'tudo bem',   // template não aceita variável vazia
    partes.passage, partes.reference, partes.reflection, partes.practice,
  ];
  return chamar({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: TEMPLATE(),
      language: { code: TEMPLATE_LANG() },
      components: [{ type: 'body', parameters: v.map((text) => ({ type: 'text', text })) }],
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
