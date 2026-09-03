import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runTurn, type ChatMessage } from './anthropic.js';
import {
  pool,
  ensureUser,
  saveTurn,
  upsertProfile,
  getProfile,
  setMoment,
  getMoment,
  deleteUserData,
  saveReading,
  getLatestReading,
  getRecentUserMessages,
  setMomentBySystem,
  logEvent,
} from './db.js';
import { selectSeedForUser, getTodaySeed } from './seedSelector.js';
import { readMessage, readOpening, CONFIDENCE_TO_UPDATE } from './brain.js';
import { registerWhatsAppRoutes } from './whatsapp.js';
import { registerMetaWebhookRoutes } from './metaWebhook.js';

const app = express();

// CORS: em produção, restrinja com CORS_ORIGINS (lista separada por vírgula).
// Sem a variável, libera geral (útil no Trial e no desenvolvimento).
const origins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(origins?.length ? { origin: origins } : undefined));
// O corpo CRU precisa sobreviver ao parser: a assinatura HMAC que a Meta
// envia é calculada sobre os bytes originais. Re-serializar o JSON muda
// espaços e ordem de chaves, e a conferência falharia sempre.
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));

/**
 * Diagnóstico compartilhado por /health e /ready.
 */
async function diagnose() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  let db: 'ok' | 'erro' | 'nao_configurado' = 'nao_configurado';
  let dbError: string | undefined;
  if (process.env.DATABASE_URL) {
    try {
      await pool.query('SELECT 1');
      db = 'ok';
    } catch (err: any) {
      db = 'erro';
      dbError = err?.message;
    }
  }
  return { ok: hasKey && db === 'ok', anthropicKey: hasKey ? 'ok' : 'faltando', db, dbError };
}

/**
 * LIVENESS — "o processo está de pé?". Responde 200 mesmo com dependências
 * faltando, e informa o diagnóstico no corpo. É este que as plataformas de
 * deploy monitoram: devolver 503 aqui faria o serviço reiniciar em loop
 * quando o banco estivesse fora, derrubando também o que ainda funciona.
 */
app.get('/health', async (_req, res) => {
  const d = await diagnose();
  res.status(200).json({ ...d, version: 2 });
});

/**
 * READINESS — "dá para atender requisições de verdade?". Devolve 503 quando
 * falta chave ou banco. Use este para verificar a configuração após o deploy.
 */
app.get('/ready', async (_req, res) => {
  const d = await diagnose();
  res.status(d.ok ? 200 : 503).json({ ...d, version: 2 });
});

/**
 * Uma rodada da conversa inicial (onboarding curto: máx. 4 perguntas).
 * body: { userId, history: [{role, content}, ...] }
 * resp: { done: false, message } enquanto conversa
 *       { done: true, message, channel, emotionalHint } quando o perfil foi salvo
 */
app.post('/onboarding/turn', async (req, res) => {
  try {
    const { userId, history } = req.body as { userId: string; history: ChatMessage[] };
    if (!userId || !Array.isArray(history)) {
      return res.status(400).json({ error: 'userId e history são obrigatórios' });
    }
    await ensureUser(userId);

    const last = history[history.length - 1];
    if (last?.role === 'user') await saveTurn(userId, 'user', last.content);

    const result = await runTurn(history);

    if (result.kind === 'profile') {
      await upsertProfile(userId, result.profile);
      if (result.profile.emotional_hint) {
        await setMomentBySystem(userId, result.profile.emotional_hint); // inferência = system
      }
      const closing = result.text || 'Prontinho. Já sei do seu jeito — sua primeira semente está sendo preparada. 🌱';
      await saveTurn(userId, 'assistant', closing);
      void logEvent(userId, 'onboarding_done', {
        channel: result.profile.dominant_channel,
        hint: result.profile.emotional_hint,
        turns: history.length,
      });
      // Primeira leitura do cérebro a partir do pedido inicial (assíncrona).
      if (result.profile.initial_request) {
        void readMessage(result.profile.initial_request).then((r) => {
          if (r) return saveReading(userId, 'onboarding', r);
        }).catch(() => {});
      }
      return res.json({
        done: true,
        message: closing,
        channel: result.profile.dominant_channel,
        emotionalHint: result.profile.emotional_hint,
      });
    }

    await saveTurn(userId, 'assistant', result.text);
    return res.json({ done: false, message: result.text });
  } catch (err: any) {
    console.error('[onboarding/turn]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao processar a conversa.' });
  }
});

/**
 * A ABERTURA — onboarding sem fricção (áudio de até 1 min OU texto).
 * O app transcreve o áudio (no aparelho quando possível — o áudio em si não
 * precisa subir) e manda só o texto. Uma única chamada extrai o essencial do
 * questionário antigo E devolve uma resposta que cita o que a pessoa contou.
 *
 * body: { userId, name?, transcript, source: 'audio'|'text' }
 * resp: { message, channel, emotionalHint, needsCare, themes }
 */
app.post('/onboarding/opening', async (req, res) => {
  try {
    const { userId, name, transcript, source = 'audio' } = req.body as {
      userId: string; name?: string; transcript: string; source?: string;
    };
    if (!userId || !transcript?.trim()) {
      return res.status(400).json({ error: 'userId e transcript são obrigatórios' });
    }
    await ensureUser(userId);
    await saveTurn(userId, 'user', transcript);

    const r = await readOpening(transcript, name);

    if (!r) {
      // Degradação graciosa — mas NUNCA cega. Se a leitura principal falhar,
      // fazemos uma leitura leve (modelo pequeno) só para não responder de
      // forma inadequada a alguém em sofrimento intenso.
      const backup = await readMessage(transcript).catch(() => null);
      const care = !!backup?.needs_care;
      const fallback = care
        ? `${name ? name + ', o' : 'O'}brigado por confiar em mim o que você está vivendo. O que você sente é sério e você não precisa carregar isso sozinho — fica perto de quem te ama e, por favor, procure alguém de confiança: seu pastor, uma pessoa querida ou o CVV (188, ligação gratuita, 24h). Eu vou estar aqui todo dia, sem pressa. Sua primeira semente já está sendo preparada, com todo cuidado. 🌱`
        : `${name ? name + ', o' : 'O'}brigado por se abrir comigo. Guardei cada palavra — sua primeira semente já está sendo preparada. 🌱`;
      await saveTurn(userId, 'assistant', fallback);
      if (backup) {
        await saveReading(userId, 'onboarding', backup).catch(() => {});
        if (backup.family) await setMomentBySystem(userId, backup.family).catch(() => {});
      }
      void logEvent(userId, 'onboarding_done', { mode: 'opening', source, degraded: true, needsCare: care });
      return res.json({
        message: fallback,
        channel: 'visual',
        emotionalHint: backup?.family ?? null,
        needsCare: care,
        themes: [],
      });
    }

    // Perfil-base a partir da abertura (o cérebro refina com o uso diário).
    const channel = r.channel_hint && r.channel_confidence >= 50 ? r.channel_hint : 'visual';
    const scores = { visual: 0, auditivo: 0, sinestesico: 0 } as Record<string, number>;
    scores[channel] = Math.round(r.channel_confidence / 25); // 0-4, na escala dos scores
    await upsertProfile(userId, {
      name: name ?? null,
      dominant_channel: channel,
      sensory_scores: scores,
      ocean: { O: 50, C: 50, E: 50, A: 50, N: 50 }, // neutro; aprende com o uso
      emotional_hint: r.family,
      initial_request: transcript,
      themes: r.themes,
      opening: {
        intensity: r.intensity,
        confidence: r.confidence,
        needs_care: r.needs_care,
        summary: r.summary,
        familia_secundaria: r.familia_secundaria,
        evidencias: r.evidencias,
      },
    });
    // Momento vindo de INFERÊNCIA (não de escolha consciente) → set_by='system',
    // para que o cérebro possa atualizá-lo livremente nos próximos dias.
    // Usar setMoment aqui marcaria como 'user' e travaria a leitura por 24h.
    await setMomentBySystem(userId, r.family);
    await saveReading(userId, 'onboarding', {
      family: r.family, intensity: r.intensity, confidence: r.confidence,
      channel_hint: r.channel_hint, needs_care: r.needs_care, summary: r.summary,
    });
    await saveTurn(userId, 'assistant', r.response);
    void logEvent(userId, 'onboarding_done', {
      mode: 'opening', source, family: r.family, channel, needsCare: r.needs_care, themes: r.themes,
    });

    return res.json({
      message: r.response,
      channel,
      emotionalHint: r.family,
      needsCare: r.needs_care,
      themes: r.themes,
    });
  } catch (err: any) {
    console.error('[onboarding/opening]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao processar a abertura.' });
  }
});

/**
 * O CÉREBRO — entrada universal de mensagens (app E WhatsApp via n8n).
 * Toda mensagem do usuário passa por aqui: é lida silenciosamente, o estado
 * emocional é atualizado (com respeito ao momento manual) e, se pedido,
 * a semente do momento volta na resposta.
 *
 * body: { userId, text, source?: 'app'|'whatsapp', wantSeed?: boolean }
 * resp: { reading: {family,intensity,confidence,needs_care}|null,
 *         momentUpdated: boolean, seed? }
 */
app.post('/message', async (req, res) => {
  try {
    const { userId, text, source = 'app', wantSeed = false } = req.body as {
      userId: string; text: string; source?: string; wantSeed?: boolean;
    };
    if (!userId || !text?.trim()) {
      return res.status(400).json({ error: 'userId e text são obrigatórios' });
    }
    await ensureUser(userId);
    await saveTurn(userId, 'user', text);
    void logEvent(userId, 'message_in', { source, chars: text.length });

    const [recent, profile] = await Promise.all([
      getRecentUserMessages(userId, 4),
      getProfile(userId),
    ]);
    const reading = await readMessage(text, {
      recentMessages: recent.slice(0, -1), // sem a própria mensagem
      profileHint: profile?.emotional_hint ?? null,
    });

    let momentUpdated = false;
    if (reading) {
      await saveReading(userId, source, reading);
      if (reading.confidence >= CONFIDENCE_TO_UPDATE) {
        momentUpdated = await setMomentBySystem(userId, reading.family);
        if (momentUpdated) void logEvent(userId, 'moment_changed', { by: 'brain', family: reading.family });
      }
    }

    let seed = undefined;
    if (wantSeed) {
      seed = (await selectSeedForUser(userId)) ?? undefined;
      if (seed) void logEvent(userId, 'seed_delivered', { seedId: seed.id, family: seed.family, source });
    }

    return res.json({
      reading: reading
        ? { family: reading.family, intensity: reading.intensity, confidence: reading.confidence, needs_care: reading.needs_care }
        : null,
      momentUpdated,
      seed,
    });
  } catch (err: any) {
    console.error('[message]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao processar a mensagem.' });
  }
});

// Estado emocional atual (painéis, depuração e adaptação de tom no canal).
app.get('/state/:userId', async (req, res) => {
  const [reading, moment, profile] = await Promise.all([
    getLatestReading(req.params.userId),
    getMoment(req.params.userId),
    getProfile(req.params.userId),
  ]);
  res.json({
    moment,                                  // família em vigor (manual ou do cérebro)
    lastReading: reading,                    // última leitura confiável
    profileHint: profile?.emotional_hint ?? null,
    channel: profile?.dominant_channel ?? null,
  });
});

// Perfil (nunca exposto ao usuário final na íntegra — uso interno/curadoria).
app.get('/profile/:userId', async (req, res) => {
  const p = await getProfile(req.params.userId);
  if (!p) return res.status(404).json({ error: 'sem perfil' });
  res.json(p);
});

// Ajuste manual do "momento atual" (config do usuário) — sempre vence o cérebro por 24h.
app.patch('/profile/:userId/moment', async (req, res) => {
  const { family } = req.body as { family: string };
  if (!family) return res.status(400).json({ error: 'family é obrigatório' });
  await setMoment(req.params.userId, family);
  void logEvent(req.params.userId, 'moment_changed', { by: 'user', family });
  res.json({ ok: true, family });
});

app.get('/profile/:userId/moment', async (req, res) => {
  const family = await getMoment(req.params.userId);
  res.json({ family });
});

// Semente do dia, escolhida pelo perfil + momento + canal.
app.get('/seed/today/:userId', async (req, res) => {
  // Se a pessoa já recebeu a semente hoje — pelo WhatsApp ou por uma abertura
  // anterior do app — devolvemos A MESMA. Abrir o app não pode trocar a
  // semente do dia nem consumir outra das 380.
  const jaEntregue = await getTodaySeed(req.params.userId);
  if (jaEntregue) return res.json(jaEntregue);

  const seed = await selectSeedForUser(req.params.userId);
  if (!seed) return res.status(404).json({ error: 'sem sementes disponíveis' });
  void logEvent(req.params.userId, 'seed_delivered', { seedId: seed.id, family: seed.family, source: 'app' });
  res.json(seed);
});

/**
 * Histórico de sementes da pessoa — alimenta as telas Campo e Raiz.
 *
 * Elas liam de uma lista fixa dentro do app, ou seja, mostravam o mesmo
 * histórico inventado para todo mundo. Agora vem daqui: só o que foi
 * realmente entregue, na data em que foi, no fuso do usuário.
 */
app.get('/seeds/history/:userId', async (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limit ?? 120), 400);
    const { rows } = await pool.query(
      `SELECT s.id, s.family, s.type, s.passage, s.reference, s.reflection,
              s.prayer, s.practice, s.music_title, s.music_artist,
              s.music_spotify, s.music_youtube,
              d.planted,
              (d.delivered_at AT TIME ZONE u.timezone)::date AS data
         FROM seed_deliveries d
         JOIN seeds s ON s.id = d.seed_id
         JOIN users u ON u.id = d.user_id
        WHERE d.user_id = $1
        ORDER BY d.delivered_at DESC
        LIMIT $2`, [req.params.userId, limite]);

    res.json(rows.map((r: any) => ({
      id: r.id,
      date: r.data instanceof Date ? r.data.toISOString().slice(0, 10) : String(r.data).slice(0, 10),
      family: r.family,
      type: r.type,
      passage: r.passage,
      reference: r.reference,
      reflection: r.reflection,
      prayer: r.prayer,
      practice: r.practice,
      planted: r.planted,
      music: {
        title: r.music_title ?? '',
        artist: r.music_artist ?? '',
        spotifyUrl: r.music_spotify ?? undefined,
        youtubeUrl: r.music_youtube ?? undefined,
      },
    })));
  } catch (err: any) {
    console.error('[history]', err?.message || err);
    res.status(500).json({ error: 'Falha ao carregar o histórico.' });
  }
});

// LGPD: exclusão total dos dados do usuário.
app.delete('/user/:userId', async (req, res) => {
  await deleteUserData(req.params.userId);
  res.json({ ok: true });
});

// Canal WhatsApp. As rotas /whatsapp/inbound|due|opt-in são protegidas por
// GRAO_API_TOKEN e existem para um orquestrador externo (n8n). O webhook
// /whatsapp/webhook é a integração DIRETA com a Meta, autenticada pela
// assinatura HMAC — é o caminho em uso.
registerWhatsAppRoutes(app);
registerMetaWebhookRoutes(app);

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Grão backend em http://localhost:${port}`));
