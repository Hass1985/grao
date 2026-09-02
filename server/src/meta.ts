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
 * O limite de 1024 caracteres do corpo do template vale para a mensagem
 * MONTADA, não para o modelo com os espaços vazios. Medindo a base real:
 * 16 das 380 sementes estouram esse teto, e a maior chega a 1174. Sem esta
 * trava elas falhariam no envio — em silêncio, para ~4% das entregas.
 */
const LIMITE_CORPO = 1024;

/** Texto fixo do template (tudo que não é variável), para calcular o orçamento. */
const MOLDE_FIXO = 'Olá , sua semente de hoje 🌱\n\n""\n— \n\n\n\nPrática de hoje: \n\n🎵 \n\nQue Deus te guarde hoje. 🌱';

/**
 * Encurta a REFLEXÃO até a mensagem caber, cortando no fim de uma frase.
 *
 * A reflexão é o campo sacrificado de propósito: é o mais longo e o único que
 * sobrevive a um corte. Passagem, referência, prática e música ou vão
 * inteiras ou não fazem sentido — cortar um versículo pela metade seria pior
 * que não enviar.
 */
function couberNoLimite(
  p: { name: string; passage: string; reference: string; reflection: string; practice: string },
  musica: string,
): string {
  const fixo = MOLDE_FIXO.length + (p.name?.trim() || 'tudo bem').length +
    p.passage.length + p.reference.length + p.practice.length + musica.length;
  const orcamento = LIMITE_CORPO - fixo;

  if (p.reflection.length <= orcamento) return p.reflection;
  if (orcamento < 60) {
    // Caso patológico: nem uma reflexão mínima cabe. Melhor mandar sem ela do
    // que mandar um fragmento sem sentido.
    console.warn(`[wa] semente longa demais para template (sobra ${orcamento} caracteres para a reflexão)`);
    return '—';
  }

  const corte = p.reflection.slice(0, orcamento - 1);
  const fimDeFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  return (fimDeFrase > orcamento * 0.5 ? corte.slice(0, fimDeFrase + 1) : corte.trimEnd()) + '…';
}

/**
 * Template aprovado — o único caminho fora da janela de 24h.
 *
 * A Meta passou a exigir variáveis NOMEADAS ({{nome}}) em vez de numeradas
 * ({{1}}) na criação de templates novos. No envio, cada parâmetro carrega
 * `parameter_name`, e aí a ordem do array deixa de importar — o casamento é
 * pelo nome. Os nomes aqui têm que ser idênticos aos do corpo submetido.
 *
 * WA_TEMPLATE_POSITIONAL=true volta ao formato antigo, para o caso de um
 * template legado numerado.
 */
export function sendSeedTemplate(phone: string, partes: {
  name: string; passage: string; reference: string; reflection: string;
  practice: string; musicTitle?: string; musicArtist?: string; musicUrl?: string;
}) {
  const musica = partes.musicTitle
    ? [`${partes.musicTitle}${partes.musicArtist ? `, de ${partes.musicArtist}` : ''}`, partes.musicUrl]
        .filter(Boolean).join(' — ')
    : 'sem música hoje';

  const reflexao = couberNoLimite(partes, musica);

  const campos: Array<[string, string]> = [
    // template não aceita variável vazia; o fallback mantém a frase natural
    ['nome', partes.name?.trim() || 'tudo bem'],
    ['passagem', partes.passage],
    ['referencia', partes.reference],
    ['reflexao', reflexao],
    ['pratica', partes.practice],
    ['musica', musica],
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
