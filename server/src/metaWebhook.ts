// O webhook que a Meta chama. É a porta de entrada do WhatsApp no Grão.
//
// Três exigências da Meta moldam este arquivo:
//
//  1. HANDSHAKE — antes de mandar qualquer evento, ela faz um GET com um
//     desafio e só aceita a URL se você devolver o desafio de volta.
//  2. ASSINATURA — todo POST vem com X-Hub-Signature-256, um HMAC do corpo
//     CRU usando a chave secreta do app. Sem conferir isso, qualquer um que
//     descubra a URL consegue injetar mensagens falsas no cérebro.
//  3. RESPOSTA RÁPIDA — se o 200 demorar, a Meta REENVIA. Por isso
//     respondemos primeiro e processamos depois, com trava de idempotência.

import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import { pool, getProfile, getRecentUserMessages, saveTurn, saveReading, setMomentBySystem, logEvent } from './db.js';
import { readMessage, CONFIDENCE_TO_UPDATE } from './brain.js';
import { selectSeedForUser } from './seedSelector.js';
import { resolveUserByPhone, normalizePhone, formatSeed, replyFor } from './whatsapp.js';
import { sendText, sendSeedNotice, markRead, metaConfigurada } from './meta.js';

/** Resposta a quem manda áudio, figurinha ou imagem — formatos que ainda não lemos. */
const SO_TEXTO =
  'Por enquanto eu só consigo ler mensagens escritas — ainda não sei ouvir áudio. ' +
  'Me conta por texto o que você está vivendo? 🌱';

/**
 * Confere o HMAC do corpo cru. Comparação em tempo constante: comparar
 * assinatura com === vaza informação pelo tempo de resposta.
 */
function assinaturaValida(raw: Buffer | undefined, header: string | undefined): boolean {
  const segredo = process.env.WA_APP_SECRET;
  if (!segredo || !raw || !header?.startsWith('sha256=')) return false;
  const esperado = crypto.createHmac('sha256', segredo).update(raw).digest('hex');
  const recebido = header.slice('sha256='.length);
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(recebido, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Registra a mensagem como vista. Devolve false se já tinha sido processada. */
async function primeiraVez(messageId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO wa_inbound_seen (message_id) VALUES ($1) ON CONFLICT DO NOTHING`, [messageId]);
  return rowCount === 1;
}

interface MsgMeta {
  id: string; from: string; type: string;
  text?: { body: string };
  button?: { payload?: string; text?: string };
}

/**
 * Toque no botão "Plantar" do template da semente diária.
 *
 * Vale mais do que parece: um toque conta como mensagem da pessoa, o que
 * ABRE a janela de 24h. Dali em diante, tudo que o Grão responder naquele dia
 * é gratuito — o botão se paga sozinho. E ainda registra o gesto de plantar,
 * que alimenta o Campo e a Raiz.
 */
async function processarBotao(msg: MsgMeta, userId: string): Promise<void> {
  // d.id precisa de apelido: s.* traz s.id (texto) e sobrescreveria o id
  // numérico da entrega, quebrando o UPDATE lá embaixo.
  //
  // `do_dia` diz se o aviso que ela tocou é de hoje, no fuso dela. Templates
  // de Marketing não permitem configurar validade no Cloud API, então um aviso
  // pode ficar dias parado num celular desligado. Sem esta checagem, a pessoa
  // voltaria de viagem e receberia a semente de terça numa sexta.
  const { rows: [entrega] } = await pool.query(
    `SELECT d.id AS entrega_id, d.planted,
            (d.delivered_at AT TIME ZONE u.timezone)::date
              = (now() AT TIME ZONE u.timezone)::date AS do_dia,
            s.*
       FROM seed_deliveries d
       JOIN seeds s ON s.id = d.seed_id
       JOIN users u ON u.id = d.user_id
      WHERE d.user_id = $1
      ORDER BY d.id DESC LIMIT 1`, [userId]);

  const perfil = await getProfile(userId);

  // Aviso velho (ou nenhum): entrega a semente de hoje, escolhida agora.
  if (!entrega || !entrega.do_dia) {
    const fresca = await selectSeedForUser(userId);
    if (!fresca) { await sendText(msg.from, 'Estou aqui. Me conta como você está hoje?'); return; }
    const r = await sendText(msg.from, formatSeed(fresca, perfil ? null : undefined));
    if (!r.ok) { console.error(`[wa] falha ao entregar semente do dia: ${r.erro}`); return; }
    await pool.query(
      `UPDATE seed_deliveries SET planted = true
        WHERE id = (SELECT max(id) FROM seed_deliveries WHERE user_id = $1)`, [userId]);
    void logEvent(userId, 'seed_planted', { seedId: fresca.id, source: 'whatsapp_botao', aviso_vencido: true });
    return;
  }

  // Texto livre: sem teto de 1024, com negrito e itálico, e gratuito porque o
  // toque acabou de abrir a janela de 24h.
  const texto = formatSeed({
    id: entrega.id, family: entrega.family, type: entrega.type,
    passage: entrega.passage, reference: entrega.reference,
    reflection: entrega.reflection, prayer: entrega.prayer, practice: entrega.practice,
    music: {
      title: entrega.music_title || undefined, artist: entrega.music_artist || undefined,
      spotifyUrl: entrega.music_spotify || undefined, youtubeUrl: entrega.music_youtube || undefined,
    },
    reason: { family: entrega.family, source: 'momento', preferredType: entrega.type },
  }, perfil ? null : undefined);

  const r = await sendText(msg.from, texto);
  if (!r.ok) { console.error(`[wa] falha ao entregar a semente: ${r.erro}`); return; }

  await pool.query(`UPDATE seed_deliveries SET planted = true WHERE id = $1`, [entrega.entrega_id]);
  void logEvent(userId, 'seed_planted', { seedId: entrega.id, source: 'whatsapp_botao' });
}

/** Processa UMA mensagem: cérebro, resposta e (se pedida) semente. */
async function processarMensagem(msg: MsgMeta, nome: string | null): Promise<void> {
  if (!(await primeiraVez(msg.id))) return;      // reenvio da Meta
  const e164 = normalizePhone(msg.from);
  if (!e164) return;

  void markRead(msg.id);
  const userId = await resolveUserByPhone(e164, nome ?? undefined);
  // Qualquer mensagem dela — texto ou toque de botão — abre a janela de 24h.
  await pool.query(`UPDATE users SET wa_last_inbound_at = now() WHERE id = $1`, [userId]);

  if (msg.type === 'button') { await processarBotao(msg, userId); return; }

  if (msg.type !== 'text' || !msg.text?.body?.trim()) {
    void logEvent(userId, 'message_in', { source: 'whatsapp', tipo: msg.type, lido: false });
    await sendText(msg.from, SO_TEXTO);
    return;
  }

  const texto = msg.text.body;
  await saveTurn(userId, 'user', texto);
  void logEvent(userId, 'message_in', { source: 'whatsapp', chars: texto.length });

  const [recentes, perfil] = await Promise.all([
    getRecentUserMessages(userId, 4),
    getProfile(userId),
  ]);
  const leitura = await readMessage(texto, {
    recentMessages: recentes.slice(0, -1),
    profileHint: perfil?.emotional_hint ?? null,
  });
  if (leitura) {
    await saveReading(userId, 'whatsapp', leitura);
    if (leitura.confidence >= CONFIDENCE_TO_UPDATE) {
      const mudou = await setMomentBySystem(userId, leitura.family);
      if (mudou) void logEvent(userId, 'moment_changed', { by: 'brain', family: leitura.family });
    }
  }

  const { resposta, quer_semente } = await replyFor(texto, leitura, recentes.slice(0, -1));
  await saveTurn(userId, 'assistant', resposta);
  const env = await sendText(msg.from, resposta);
  if (!env.ok) console.error(`[wa] falha ao responder ${e164}: ${env.erro}`);

  if (quer_semente) {
    const seed = await selectSeedForUser(userId);
    if (seed) {
      const r = await sendText(msg.from, formatSeed(seed, perfil ? null : nome));
      if (r.ok) void logEvent(userId, 'seed_delivered', { seedId: seed.id, family: seed.family, source: 'whatsapp' });
      else console.error(`[wa] falha ao enviar semente para ${e164}: ${r.erro}`);
    }
  }
}

/** Percorre o envelope da Meta, que vem em três níveis de aninhamento. */
async function processarEvento(corpo: any): Promise<void> {
  for (const entry of corpo?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const nome: string | null = value?.contacts?.[0]?.profile?.name ?? null;

      for (const msg of value?.messages ?? []) {
        try { await processarMensagem(msg, nome); }
        catch (e: any) { console.error('[wa] erro ao processar mensagem:', e?.message || e); }
      }

      // Status de entrega. O 'failed' chega DEPOIS do envio ter sido aceito —
      // por exemplo quando a mensagem expira sem ser entregue (celular
      // desligado além do período de validade). Nesse caso a entrega já foi
      // registrada como sucesso, e sem desfazer o registro a pessoa perderia
      // a semente do dia em silêncio.
      for (const st of value?.statuses ?? []) {
        if (st.status !== 'failed') continue;
        console.error(`[wa] envio falhou para ${st.recipient_id}:`, JSON.stringify(st.errors ?? st));
        try {
          const e164 = normalizePhone(st.recipient_id ?? '');
          if (!e164) continue;
          const { rows: [u] } = await pool.query(`SELECT id FROM users WHERE phone_e164 = $1`, [e164]);
          if (!u) continue;
          const { rowCount } = await pool.query(
            `DELETE FROM seed_deliveries
              WHERE id = (SELECT max(id) FROM seed_deliveries
                           WHERE user_id = $1 AND planted = false
                             AND delivered_at > now() - interval '2 days')`, [u.id]);
          if (rowCount) console.warn(`[wa] entrega desfeita para ${e164} — a semente volta para a fila`);
        } catch (e: any) {
          console.error('[wa] erro ao desfazer entrega:', e?.message || e);
        }
      }
    }
  }
}

/**
 * Disparo da semente diária.
 *
 * Faz TUDO num só lugar — monta a fila e envia — para o agendador externo ser
 * burro: um cron que só sabe chamar uma URL. Foi o mesmo motivo de dispensar
 * o n8n; a diferença é que aqui não há mensalidade nem um segundo sistema
 * para manter de pé.
 *
 * Fora da janela de 24h a Meta só aceita template, então este disparo usa
 * sempre o template aprovado.
 */
async function despachar(janela: string): Promise<{ enviadas: number; falhas: number; detalhes: string[] }> {
  const { rows: usuarios } = await pool.query(
    `SELECT u.id, u.phone_e164, u.name,
            (u.wa_last_inbound_at > now() - interval '24 hours') janela_aberta
       FROM users u
      WHERE u.delivery_window = $1
        AND u.wa_opt_in_at IS NOT NULL
        AND u.phone_e164 IS NOT NULL
        AND NOT EXISTS (
              SELECT 1 FROM seed_deliveries d
               WHERE d.user_id = u.id
                 AND (d.delivered_at AT TIME ZONE u.timezone)::date
                   = (now() AT TIME ZONE u.timezone)::date)`, [janela]);

  let enviadas = 0, falhas = 0;
  const detalhes: string[] = [];

  for (const u of usuarios) {
    const seed = await selectSeedForUser(u.id);
    if (!seed) continue;

    // Se a pessoa falou com o Grão nas últimas 24h, a janela está aberta e
    // texto livre é GRATUITO: mandamos a semente inteira, sem gastar template.
    // Quanto mais engajada, menos custa.
    const r = u.janela_aberta
      ? await sendText(u.phone_e164, formatSeed(seed, u.name))
      : await sendSeedNotice(u.phone_e164, { name: u.name ?? '', reference: seed.reference });

    if (r.ok && u.janela_aberta) {
      await pool.query(
        `UPDATE seed_deliveries SET planted = true
          WHERE id = (SELECT max(id) FROM seed_deliveries WHERE user_id = $1)`, [u.id]);
    }

    if (r.ok) {
      enviadas++;
      void logEvent(u.id, u.janela_aberta ? 'seed_delivered' : 'seed_announced',
        { seedId: seed.id, family: seed.family, source: 'whatsapp_cron', gratuita: !!u.janela_aberta });
    } else {
      falhas++;
      detalhes.push(`${u.phone_e164}: ${r.erro}`);
      console.error(`[wa/dispatch] ${u.phone_e164}: ${r.erro}`);
      // A entrega já foi registrada pelo seletor. Desfazemos, senão a pessoa
      // fica sem semente hoje E sem a semente de amanhã (ela contaria como vista).
      await pool.query(
        `DELETE FROM seed_deliveries
          WHERE id = (SELECT max(id) FROM seed_deliveries WHERE user_id = $1 AND seed_id = $2)`,
        [u.id, seed.id]);
    }
  }
  return { enviadas, falhas, detalhes };
}

export function registerMetaWebhookRoutes(app: Express) {
  /**
   * Chamado pelo cron (GitHub Actions). Protegido pelo mesmo segredo dos
   * outros endpoints internos.
   */
  app.post('/whatsapp/dispatch', async (req: Request, res: Response) => {
    const esperado = process.env.GRAO_API_TOKEN;
    if (!esperado) return res.status(503).json({ error: 'GRAO_API_TOKEN não configurado' });
    if (req.header('x-grao-token') !== esperado) return res.status(401).json({ error: 'token inválido' });

    const janela = String(req.query.window ?? '');
    if (!['dawn', 'morning', 'noon', 'evening'].includes(janela)) {
      return res.status(400).json({ error: 'window deve ser dawn, morning, noon ou evening' });
    }
    if (!metaConfigurada()) return res.status(503).json({ error: 'credenciais da Meta ausentes' });

    try {
      const r = await despachar(janela);
      console.log(`[wa/dispatch] ${janela}: ${r.enviadas} enviadas, ${r.falhas} falhas`);
      return res.json({ window: janela, ...r });
    } catch (e: any) {
      console.error('[wa/dispatch]', e?.message || e);
      return res.status(500).json({ error: 'falha no disparo' });
    }
  });

  /** Handshake: a Meta chama uma vez, ao salvar a URL no painel. */
  app.get('/whatsapp/webhook', (req: Request, res: Response) => {
    // trim dos dois lados: colar num painel web quase sempre traz um espaço
    // ou uma quebra de linha junto, e a diferença é invisível na tela. Sem
    // isso o handshake falha com uma mensagem genérica da Meta e não há como
    // descobrir o motivo olhando a configuração.
    const esperado = (process.env.WA_VERIFY_TOKEN ?? '').trim();
    if (!esperado) return res.status(503).send('WA_VERIFY_TOKEN não configurado');

    const modo = String(req.query['hub.mode'] ?? '').trim();
    const token = String(req.query['hub.verify_token'] ?? '').trim();
    const desafio = req.query['hub.challenge'];

    if (modo === 'subscribe' && token === esperado) {
      // Precisa ser texto puro, não JSON — a Meta compara byte a byte.
      return res.status(200).type('text/plain').send(String(desafio ?? ''));
    }
    // Diagnóstico sem vazar segredo: os tamanhos já dizem se é valor errado
    // (tamanhos diferentes) ou caractere invisível no meio (tamanhos iguais).
    console.warn(`[wa] handshake recusado · modo="${modo}" · token recebido tem ${token.length} caracteres, esperado tem ${esperado.length}`);
    return res.sendStatus(403);
  });

  /** Eventos. Responde 200 na hora e processa em seguida. */
  app.post('/whatsapp/webhook', (req: Request & { rawBody?: Buffer }, res: Response) => {
    if (!assinaturaValida(req.rawBody, req.header('x-hub-signature-256'))) {
      console.warn('[wa] assinatura inválida — evento descartado');
      return res.sendStatus(401);
    }
    if (!metaConfigurada()) {
      console.error('[wa] evento recebido mas WA_ACCESS_TOKEN/WA_PHONE_NUMBER_ID faltam');
      return res.sendStatus(200);   // 200 mesmo assim: reenviar não resolveria
    }

    // A Meta reenvia se o 200 demorar. Confirmamos primeiro; o processamento
    // (que chama modelo e banco) segue depois, protegido pela idempotência.
    res.sendStatus(200);
    void processarEvento(req.body).catch((e) =>
      console.error('[wa] erro no processamento assíncrono:', e?.message || e));
  });
}
