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
 * MONTADA, não para o modelo com os espaços vazios.
 */
const LIMITE_CORPO = 1024;

/**
 * Texto fixo do template. Três regras da Meta moldam este texto:
 *
 *  1. o corpo não pode começar nem TERMINAR numa variável — daí a saudação e
 *     a linha de fecho;
 *  2. DENSIDADE: é exigido no mínimo 3 × (nº de variáveis) + 1 palavras de
 *     texto fixo. A primeira versão tinha 12 palavras para 6 variáveis e foi
 *     rejeitada; um template quase todo feito de variáveis é recusado porque
 *     a Meta não consegue prever o que será enviado. Os rótulos ("A palavra:",
 *     "Para pensar:") existem por isso — e de quebra deixam a mensagem mais
 *     legível;
 *  3. o rodapé não aceita emoji.
 *
 * A referência foi fundida na variável `passagem` para baixar de 6 para 5
 * variáveis, o que reduz a exigência de palavras.
 */
const MOLDE_FIXO = 'Olá , esta é a sua semente de hoje 🌱\n\nA palavra: \n\n\n\nPrática de hoje: \n\nPara ouvir: 🎵 \n\nQue Deus te guarde. 🌱';

/**
 * REDE DE SEGURANÇA, não solução.
 *
 * O certo é a semente já caber, e é isso que `content:fit` garante: ele
 * reescreve editorialmente as reflexões longas, produzindo texto completo e
 * mais enxuto. Cortar no envio entregaria uma reflexão terminada em "…", e a
 * pessoa pensaria que faltou alguma coisa.
 *
 * Esta função só existe para o caso de uma semente nova escapar da revisão.
 * Quando ela dispara, grita no log: é anomalia a corrigir na origem, não
 * comportamento esperado.
 */
function couberNoLimite(
  p: { name: string; passage: string; reference: string; reflection: string; practice: string },
  musica: string,
): string {
  const fixo = MOLDE_FIXO.length + (p.name?.trim() || 'tudo bem').length +
    p.passage.length + p.reference.length + p.practice.length + musica.length;
  const orcamento = LIMITE_CORPO - fixo;

  if (p.reflection.length <= orcamento) return p.reflection;

  console.error(
    `[wa] ANOMALIA: reflexão de ${p.reflection.length} caracteres não cabe em ${orcamento}. ` +
    `Rode "npm run content:fit -- gravar" para reescrever na origem; o corte abaixo é paliativo.`);

  if (orcamento < 60) return '—';   // nem um fragmento faria sentido

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

  // Passagem e referência viajam juntas: uma variável a menos baixa a
  // exigência de densidade da Meta em 3 palavras.
  const passagem = `"${partes.passage}" — ${partes.reference}`;
  const reflexao = couberNoLimite({ ...partes, passage: passagem, reference: '' }, musica);

  const campos: Array<[string, string]> = [
    // template não aceita variável vazia; o fallback mantém a frase natural
    ['nome', partes.name?.trim() || 'tudo bem'],
    ['passagem', passagem],
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
