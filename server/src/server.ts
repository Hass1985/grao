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
import { registerWhatsAppRoutes, BASE_URL } from './whatsapp.js';
import { registerMetaWebhookRoutes } from './metaWebhook.js';
import { registerOuvirRoutes } from './ouvir.js';
import { registerAdminRoutes } from './admin.js';
import { acessoDoUsuario, limitarSemente } from './acesso.js';
import {
  devocionalDeHoje, devocionaisAte, textoCompartilhavel,
  marcarDevocionalLido, resumoDeLeitura,
} from './devocional.js';
import {
  creditar, creditarLeitura, resumoDeGraos, extratoDeGraos, GANHO, NIVEIS,
} from './graos.js';
import { registerBibliaRoutes } from './biblia.js';
import { guardarMemorias, linhaDeLigacao, registrarUso } from './memoria.js';
import { avaliarRisco, respostaDeCuidado } from './seguranca.js';
import { iniciarAgenda } from './agenda.js';
import { registerCobrancaRoutes } from './cobranca.js';
import { registerAuthRoutes } from './auth.js';

const app = express();

// CORS: em produção, restrinja com CORS_ORIGINS (lista separada por vírgula).
// Sem a variável, libera geral (útil no Trial e no desenvolvimento).
const origins = process.env.CORS_ORIGINS?.split(',').map((s: string) => s.trim()).filter(Boolean);
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
  // Presença das integrações, nunca o valor. Serve para responder de fora
  // "o Render está com a chave?" sem abrir o painel nem revelar segredo. Foi
  // o que faltou nas últimas configurações: dava para conferir que o webhook
  // recusa token errado, mas não que a chave chegou a ser cadastrada.
  const integracoes = {
    anthropic: hasKey,
    meta: !!process.env.WA_ACCESS_TOKEN && !!process.env.WA_PHONE_NUMBER_ID,
    supabase: !!process.env.SUPABASE_URL,
    asaas: !!process.env.ASAAS_API_KEY,
    asaasWebhook: !!process.env.ASAAS_WEBHOOK_TOKEN,
  };
  return {
    ok: hasKey && db === 'ok',
    anthropicKey: hasKey ? 'ok' : 'faltando',
    db, dbError, integracoes,
  };
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
 * body: { userId, name?, transcript, source: 'audio'|'text', teste?: boolean }
 * resp: { message, channel, emotionalHint, needsCare, themes }
 *
 * `teste: true` é a demonstração do fluxo pago dentro do app. A resposta é a
 * real (é isso que se quer mostrar), mas NADA fica gravado: sem turno, sem
 * leitura, sem perfil e, principalmente, sem mexer no momento emocional. Sem
 * essa separação, cada demonstração reescrevia o momento de quem demonstrou e
 * a tela Hoje passava a responder ao teste, não à pessoa.
 *
 * A única coisa que continua sendo registrada é risco emocional: se alguém
 * digita sofrimento grave, mesmo "testando", isso precisa aparecer no painel.
 */
app.post('/onboarding/opening', async (req, res) => {
  try {
    const { userId, name, transcript, source = 'audio', teste = false } = req.body as {
      userId: string; name?: string; transcript: string; source?: string; teste?: boolean;
    };
    if (!userId || !transcript?.trim()) {
      return res.status(400).json({ error: 'userId e transcript são obrigatórios' });
    }
    const grava = !teste;
    await ensureUser(userId);
    if (grava) await saveTurn(userId, 'user', transcript);

    // A Abertura é onde a pessoa mais se abre, e por áudio. É o ponto de maior
    // chance de alguém relatar sofrimento grave, e o único momento em que o
    // produto pede isso explicitamente. O detector roda antes do modelo, pelo
    // mesmo motivo do WhatsApp: ele precisa funcionar com a API fora.
    const risco = avaliarRisco(transcript);
    if (risco.risco !== 'nenhum') {
      void logEvent(userId, 'risco_detectado', {
        nivel: risco.risco, trecho: risco.trecho, origem: 'abertura', teste,
      });
    }
    if (risco.risco === 'grave') {
      const cuidado = respostaDeCuidado(name);
      if (grava) await saveTurn(userId, 'assistant', '[resposta de cuidado]');
      void logEvent(userId, 'onboarding_done', { mode: 'opening', source, needsCare: true, teste });
      return res.json({
        message: cuidado,
        channel: 'visual',
        emotionalHint: null,
        needsCare: true,
        themes: [],
      });
    }

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
      if (grava) {
        await saveTurn(userId, 'assistant', fallback);
        if (backup) {
          await saveReading(userId, 'onboarding', backup).catch(() => {});
          if (backup.family) await setMomentBySystem(userId, backup.family).catch(() => {});
        }
      }
      void logEvent(userId, 'onboarding_done', { mode: 'opening', source, degraded: true, needsCare: care, teste });
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
    if (grava) await upsertProfile(userId, {
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
    if (grava) {
      await setMomentBySystem(userId, r.family);
      await saveReading(userId, 'onboarding', {
        family: r.family, intensity: r.intensity, confidence: r.confidence,
        channel_hint: r.channel_hint, needs_care: r.needs_care, summary: r.summary,
      });
      await saveTurn(userId, 'assistant', r.response);
    }
    void logEvent(userId, 'onboarding_done', {
      mode: 'opening', source, family: r.family, channel,
      needsCare: r.needs_care, themes: r.themes, teste,
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

/**
 * Plano escolhido no fim do onboarding.
 *
 * Não cobra nada: não há gateway ligado. Registra a INTENÇÃO e abre os 7 dias
 * de teste que a tela promete — sem isso a escolha morria na tela e o painel
 * não teria como responder quantas pessoas quiseram qual plano, que é metade
 * do que se olha num Trial.
 *
 * Quando entrar um Stripe/Asaas, é aqui que a assinatura passa a nascer com
 * provider preenchido, e o webhook dele só precisa atualizar `status`.
 */
const PRECOS: Record<string, number> = { plantio: 1990, anual: 19900 };
app.post('/profile/:userId/plan', async (req, res) => {
  const { plan } = req.body as { plan?: string };
  if (!plan || !(plan in PRECOS)) {
    return res.status(400).json({ error: `plan deve ser um de: ${Object.keys(PRECOS).join(', ')}` });
  }
  try {
    await ensureUser(req.params.userId);
    // ESCOLHER plano não é ASSINAR. Aqui só fica registrada a intenção.
    //
    // Antes esta rota gravava status 'trial' com sete dias à frente, e um
    // toque bastava para virar assinante: o acesso pago abria, o motor
    // emocional passava a rodar (com custo real de API por pessoa) e a tela
    // Hoje trocava o devocional pela semente — sem volta, porque nada no app
    // desfaz uma assinatura. Foi exatamente assim que a tela Hoje ficou presa
    // no modelo pago durante os testes.
    //
    // Os sete dias de teste continuam existindo: eles começam quando a
    // assinatura é criada de verdade no gateway (cobranca.ts), que é o único
    // lugar com CPF, valor e data de cobrança. Acesso de cortesia é decisão
    // deliberada, não efeito colateral de um clique.
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, price_cents)
            VALUES ($1, $2, 'escolhida', $3)
       ON CONFLICT (user_id) DO UPDATE
              SET plan = excluded.plan,
                  price_cents = excluded.price_cents,
                  updated_at = now()`,
      [req.params.userId, plan, PRECOS[plan]]);
    void logEvent(req.params.userId, 'plan_selected', { plan, priceCents: PRECOS[plan] });
    res.json({ ok: true, plan });
  } catch (err: any) {
    console.error('[plan]', err?.message || err);
    res.status(500).json({ error: 'Falha ao registrar o plano.' });
  }
});

/**
 * A memória, dita em voz alta.
 *
 * O motor guarda fatos da vida da pessoa desde o começo — com evidência
 * literal, prazo de validade por categoria e trava contra invenção — e até
 * aqui isso só aparecia no WhatsApp. Dentro do app, a pessoa nunca via que
 * tinha sido lembrada, e é justamente esse o momento que nenhum concorrente
 * consegue imitar: ele exige um motor emocional que leva meses para existir.
 *
 * Não é uma chamada por dia: `memoriaParaRetomar` respeita um descanso entre
 * retomadas, e devolve nulo na maioria das vezes — lembrar todo dia deixaria
 * de ser cuidado e viraria vigilância. Quando a linha sai, registramos o uso
 * para aquela memória descansar de novo.
 */
async function lembrarEmVozAlta(userId: string, familia: string): Promise<string | null> {
  try {
    const l = await linhaDeLigacao(userId, familia);
    if (!l) return null;
    void registrarUso(l.memoriaId);
    void logEvent(userId, 'memoria_retomada', { memoriaId: l.memoriaId });
    return l.texto;
  } catch {
    return null;
  }
}

// Semente do dia, escolhida pelo perfil + momento + canal.
//
// O corte do plano gratuito acontece AQUI, não na tela: devolver a semente
// inteira e deixar o app esconder poria a curadoria a um F12 de distância.
app.get('/seed/today/:userId', async (req, res) => {
  const acesso = await acessoDoUsuario(req.params.userId);

  // GRATUITO: a página do dia no devocional anual. Não é semente cortada, é
  // outro material — 365 páginas fixas, iguais para todo mundo, sem motor e
  // sem custo de API. Só quem assina entra no motor emocional.
  if (!acesso.completo) {
    const dia = await devocionalDeHoje(req.params.userId);
    if (!dia) return res.status(404).json({ error: 'devocional do dia não encontrado' });
    // Cria a linha do usuário na primeira leitura. Quem lê o devocional É
    // usuário do produto e precisa aparecer no funil; sem isto o evento bateria
    // na chave estrangeira, sairia um aviso no log e a leitura não seria
    // contada em lugar nenhum.
    await ensureUser(req.params.userId).catch(() => {});
    void logEvent(req.params.userId, 'devocional_lido', { data: dia.data });
    // A tela precisa saber se o dia já foi confirmado para não oferecer de
    // novo um gesto que a pessoa já fez.
    const { rows: [leitura] } = await pool.query(
      `SELECT 1 FROM devotional_reads WHERE user_id = $1 AND data = $2::date`,
      [req.params.userId, dia.data]);
    // Os campos são espelhados nos nomes da semente (passage/reference/
    // reflection) para a tela do dia servir aos dois produtos sem virar duas
    // telas. `tipo` é o que diz qual dos dois está na mão.
    return res.json({
      ...dia,
      compartilhavel: textoCompartilhavel(dia),
      id: `d-${dia.data}`,
      // `passage` recebe o versículo LITERAL, não a paráfrase: é o campo que a
      // tela mostra entre aspas, ao lado de uma referência. Colocar paráfrase
      // ali é justamente o que fazia o material parecer citar a Bíblia sem
      // citar.
      passage: dia.verseLiteral ?? dia.verse,
      reference: dia.referenceExact ?? dia.reference,
      reflection: dia.body,
      prayer: null, practice: null, music: null,
      completa: false,
      bloqueado: { prayer: true, practice: true, music: true },
      lido: !!leitura,
      acesso,
    });
  }

  // Se a pessoa já recebeu a semente hoje — pelo WhatsApp ou por uma abertura
  // anterior do app — devolvemos A MESMA. Abrir o app não pode trocar a
  // semente do dia nem consumir outra das 380.
  const jaEntregue = await getTodaySeed(req.params.userId);
  if (jaEntregue) {
    return res.json({
      tipo: 'semente', ...limitarSemente(jaEntregue, true),
      compartilhavel: textoCompartilhavel({
        title: '', body: jaEntregue.reflection,
        verse: jaEntregue.passage, reference: jaEntregue.reference,
      }),
      ligacao: await lembrarEmVozAlta(req.params.userId, jaEntregue.family),
      acesso,
    });
  }

  const seed = await selectSeedForUser(req.params.userId);
  if (!seed) return res.status(404).json({ error: 'sem sementes disponíveis' });
  void logEvent(req.params.userId, 'seed_delivered', { seedId: seed.id, family: seed.family, source: 'app' });
  res.json({
    tipo: 'semente', ...limitarSemente(seed, true),
    compartilhavel: textoCompartilhavel({
      title: '', body: seed.reflection,
      verse: seed.passage, reference: seed.reference,
    }),
    ligacao: await lembrarEmVozAlta(req.params.userId, seed.family),
    acesso,
  });
});

// EXPERIMENTAR: a semente real do plano pago, para quem ainda não assina.
//
// Existe porque testar o plano pago com semente de mentira não testa nada. Aqui
// roda o motor inteiro — família da conversa, variedade entre famílias, janela
// de gesto, ineditismo — e a entrega fica REGISTRADA, como a de um assinante.
// É o registro que faz valer a regra que já falhou uma vez (dez sementes de
// ansiedade seguidas): sem gravar, o motor não sabe o que a pessoa já viu.
//
// Não confere assinatura de propósito, e por isso tem três cercas:
//   1. GRAO_TESTE_PAGO=0 desliga a rota inteira. No dia do lançamento, quando o
//      botão virar "Quero assinar o plano", é essa linha que se muda no Render;
//   2. teto de MAX_TESTES_DIA por pessoa por dia. Uma pessoa demonstrando nunca
//      chega perto; um script tentando baixar as 380 esbarra no primeiro dia;
//   3. só para quem já existe no banco.
//
// A tela Hoje não muda: quem não assina continua vendo o devocional do dia.
const MAX_TESTES_DIA = 5;

app.post('/seed/experimentar/:userId', async (req, res) => {
  if ((process.env.GRAO_TESTE_PAGO ?? '1') === '0') {
    return res.status(404).json({ error: 'demonstração do plano pago desligada' });
  }
  const userId = req.params.userId;
  // `relato` é o que a pessoa contou na conversa de teste. Vem no pedido
  // porque o modo teste não grava nada dela — sem ele a curadoria ficaria sem
  // o que ler justamente na demonstração, e o teste avaliaria a fila do
  // acervo em vez do motor. É usado na escolha e descartado.
  const { family, relato } = req.body as { family?: string; relato?: string };

  const { rows: [existe] } = await pool.query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (!existe) return res.status(404).json({ error: 'usuário não encontrado' });

  const { rows: [uso] } = await pool.query(
    `SELECT count(*)::int n FROM events e JOIN users u ON u.id = e.user_id
      WHERE e.user_id = $1 AND e.type = 'semente_teste'
        AND (e.created_at AT TIME ZONE u.timezone)::date
          = (now() AT TIME ZONE u.timezone)::date`, [userId]);
  if (uso.n >= MAX_TESTES_DIA) {
    return res.status(429).json({
      error: `limite de ${MAX_TESTES_DIA} sementes de teste por dia`,
      restantes: 0,
    });
  }

  // A família vem da conversa de teste. Sem ela, o motor decide como decidiria
  // para essa pessoa em um dia normal. A validação é contra o banco, não contra
  // uma lista escrita aqui: lista copiada é lista que envelhece sozinha.
  const { rows: [conhecida] } = family
    ? await pool.query(`SELECT 1 FROM seeds WHERE family = $1 LIMIT 1`, [family])
    : { rows: [null] };
  const alvo = conhecida ? family! : null;

  // Conversa nova → escolha nova, mesmo dentro da mesma família. Contar outra
  // coisa e receber a semente de antes faria a demonstração parecer quebrada
  // justamente quando alguém testa duas histórias parecidas — e é comparar
  // essas duas que mostra se a curadoria está lendo o relato ou só o rótulo.
  //
  // Sem relato novo, vale a semente do dia: é o comportamento do produto real,
  // e é o que a tela de reler usa.
  const relatoNovo = typeof relato === 'string' && relato.trim().length > 0 ? relato : null;
  const deHoje = await getTodaySeed(userId);
  const seed = !relatoNovo && deHoje && (!alvo || deHoje.family === alvo)
    ? deHoje
    : await selectSeedForUser(userId, alvo, relatoNovo);

  if (!seed) return res.status(404).json({ error: 'sem sementes disponíveis' });

  const novaEntrega = seed !== deHoje;
  void logEvent(userId, 'semente_teste', {
    seedId: seed.id, family: seed.family, pedida: alvo, novaEntrega,
  });

  return res.json({
    tipo: 'semente', ...limitarSemente(seed, true),
    compartilhavel: textoCompartilhavel({
      title: '', body: seed.reflection,
      verse: seed.passage, reference: seed.reference,
    }),
    teste: true,
    restantesHoje: MAX_TESTES_DIA - uso.n - 1,
  });
});

/**
 * A semente de hoje da demonstração, para reler quantas vezes quiser.
 *
 * Só LÊ: não escolhe semente nova, não gasta do teto diário e não registra
 * entrega. Existe porque a semente sumia depois de vista uma vez — para
 * revê-la era preciso refazer a conversa inteira, e uma semente que não se
 * pode reler não é uma semente, é um aviso que passou.
 */
app.get('/seed/experimentar/:userId/hoje', async (req, res) => {
  const seed = await getTodaySeed(req.params.userId);
  if (!seed) return res.status(404).json({ error: 'nenhuma semente de teste hoje' });
  return res.json({
    tipo: 'semente', ...limitarSemente(seed, true),
    compartilhavel: textoCompartilhavel({
      title: '', body: seed.reflection,
      verse: seed.passage, reference: seed.reference,
    }),
    teste: true,
  });
});

/**
 * Histórico das sementes da demonstração — o Campo e a Raiz do fluxo de teste.
 *
 * Separado do histórico de verdade de propósito. Quem é gratuito tem o
 * devocional no Campo e na Raiz; misturar as sementes da demonstração ali
 * faria o histórico contar duas histórias ao mesmo tempo, e nenhuma delas
 * seria a da pessoa.
 */
app.get('/seed/experimentar/:userId/historico', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.family, s.type, s.passage, s.reference, s.reflection,
            s.prayer, s.practice, s.music_title, s.music_artist,
            s.music_spotify, s.music_youtube, d.planted,
            (d.delivered_at AT TIME ZONE u.timezone)::date data
       FROM seed_deliveries d
       JOIN seeds s ON s.id = d.seed_id
       JOIN users u ON u.id = d.user_id
      WHERE d.user_id = $1
      ORDER BY d.delivered_at DESC
      LIMIT 60`, [req.params.userId]);

  res.json(rows.map((r: any) => ({
    ...limitarSemente({
      id: r.id, family: r.family, type: r.type, passage: r.passage,
      reference: r.reference, reflection: r.reflection,
      prayer: r.prayer, practice: r.practice,
      music: {
        title: r.music_title || undefined, artist: r.music_artist || undefined,
        spotifyUrl: r.music_spotify || undefined, youtubeUrl: r.music_youtube || undefined,
      },
    } as any, true),
    tipo: 'semente',
    date: String(r.data instanceof Date ? r.data.toISOString().slice(0, 10) : r.data).slice(0, 10),
    planted: r.planted,
  })));
});

/**
 * A leitura confirmada do devocional do dia.
 *
 * É o gesto que dá história ao plano gratuito: sem ele o Campo é um calendário
 * onde nada acontece e a Raiz lista todos os dias do ano como se a pessoa os
 * tivesse lido. Aqui só entra o que ela confirmou.
 */
/**
 * "Esta semente falou com você?"
 *
 * A única medida barata de que a curadoria está acertando. Sem ela, avaliar o
 * motor é ouvir uma pessoa por vez — e foi assim que descobrimos, por acaso,
 * que todo mundo recebia a mesma semente de culpa.
 */
app.post('/seed/:seedId/feedback', async (req, res) => {
  try {
    const { userId, util } = req.body as { userId?: string; util?: boolean };
    if (!userId || typeof util !== 'boolean') {
      return res.status(400).json({ error: 'userId e util são obrigatórios' });
    }
    await ensureUser(userId);
    const { rows: [existe] } = await pool.query(
      `SELECT 1 FROM seeds WHERE id = $1`, [req.params.seedId]);
    if (!existe) return res.status(404).json({ error: 'semente não encontrada' });

    await pool.query(
      `INSERT INTO seed_feedback (user_id, seed_id, util) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, seed_id) DO UPDATE
              SET util = excluded.util, criado_em = now()`,
      [userId, req.params.seedId, util]);
    void logEvent(userId, 'semente_avaliada', { seedId: req.params.seedId, util });
    // Vale pouco de propósito: responder é um favor que pedimos, não um gesto
    // dela com Deus. Pagar bem por isso compraria resposta, não opinião.
    const ganhou = await creditar(userId, GANHO.avaliacao, 'avaliacao', req.params.seedId);
    return res.json({ ok: true, graosGanhos: ganhou });
  } catch (err: any) {
    console.error('[seed/feedback]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao registrar.' });
  }
});

/**
 * A resposta da pessoa à semente do dia.
 *
 * O cérebro só entra para quem assina, e a decisão é do SERVIDOR, não do app:
 * é a mesma regra do paywall. Quem é gratuito escreve e o texto fica guardado
 * para ela reler — um diário. Quem assina tem a resposta LIDA, e é dela que
 * saem as memórias que o Grão retoma dias depois. Sem isso, a memória só teria
 * o que foi dito na abertura, e o motor envelheceria junto com aquele retrato.
 */
app.post('/resposta/:userId', async (req, res) => {
  try {
    const { texto } = req.body as { texto?: string };
    const userId = req.params.userId;
    const limpo = String(texto ?? '').trim().slice(0, 2000);
    if (!limpo) return res.status(400).json({ error: 'texto é obrigatório' });

    await ensureUser(userId);
    const { rows: [r] } = await pool.query(
      `WITH fuso AS (
         SELECT coalesce((SELECT timezone FROM users WHERE id = $1), 'America/Sao_Paulo') tz
       )
       INSERT INTO respostas (user_id, data, texto)
       VALUES ($1, (now() AT TIME ZONE (SELECT tz FROM fuso))::date, $2)
       ON CONFLICT (user_id, data) DO UPDATE
              SET texto = excluded.texto, criado_em = now()
       RETURNING data::text`, [userId, limpo]);

    const data = r?.data as string;
    void logEvent(userId, 'resposta_escrita', { data, chars: limpo.length });
    const ganhou = await creditar(userId, GANHO.resposta, 'resposta', data);

    // Segurança emocional antes de qualquer coisa, como em todo canal: o
    // detector roda sem depender da IA e a resposta de cuidado não muda.
    const risco = avaliarRisco(limpo);
    if (risco.risco !== 'nenhum') {
      void logEvent(userId, 'risco_detectado', {
        nivel: risco.risco, trecho: risco.trecho, origem: 'resposta',
      });
    }
    if (risco.risco === 'grave') {
      return res.json({
        ok: true, data, graosGanhos: ganhou,
        cuidado: respostaDeCuidado(null),
      });
    }

    const acesso = await acessoDoUsuario(userId);
    let lembrou = 0;
    if (acesso.completo) {
      await saveTurn(userId, 'user', limpo);
      const [recentes, perfil] = await Promise.all([
        getRecentUserMessages(userId, 4),
        getProfile(userId),
      ]);
      const leitura = await readMessage(limpo, {
        recentMessages: recentes.slice(0, -1),
        profileHint: perfil?.emotional_hint ?? null,
      });
      if (leitura) {
        await saveReading(userId, 'resposta', leitura);
        if (leitura.confidence >= CONFIDENCE_TO_UPDATE) {
          await setMomentBySystem(userId, leitura.family);
        }
        lembrou = await guardarMemorias(userId, limpo, leitura.memorias ?? []);
      }
    }

    return res.json({ ok: true, data, graosGanhos: ganhou, lembrou });
  } catch (err: any) {
    console.error('[resposta]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao guardar a resposta.' });
  }
});

/**
 * A resposta de HOJE, com o dia resolvido no fuso da pessoa.
 *
 * Existe separada da rota com data porque o app não sabe qual é "hoje" para o
 * servidor. Quem escreve às 21h no Brasil está no dia seguinte em UTC: o app
 * pedia a data de amanhã, não achava nada, e a pessoa via o campo vazio como
 * se nunca tivesse escrito — justamente no horário de maior leitura.
 */
app.get('/resposta/:userId', async (req, res) => {
  try {
    const { rows: [r] } = await pool.query(
      `WITH fuso AS (
         SELECT coalesce((SELECT timezone FROM users WHERE id = $1), 'America/Sao_Paulo') tz
       )
       SELECT texto FROM respostas
        WHERE user_id = $1
          AND data = (now() AT TIME ZONE (SELECT tz FROM fuso))::date`,
      [req.params.userId]);
    return res.json({ texto: r?.texto ?? null });
  } catch (err: any) {
    console.error('[resposta/hoje]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao ler a resposta.' });
  }
});

/** A resposta de um dia específico, para reabrir junto com aquele dia. */
app.get('/resposta/:userId/:data', async (req, res) => {
  try {
    const { rows: [r] } = await pool.query(
      `SELECT texto FROM respostas WHERE user_id = $1 AND data = $2::date`,
      [req.params.userId, req.params.data]);
    return res.json({ texto: r?.texto ?? null });
  } catch (err: any) {
    console.error('[resposta/dia]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao ler a resposta.' });
  }
});

/**
 * Grãos, nível e extrato — o que a tela Campo mostra no topo.
 *
 * É também o lugar que credita os bônus de marco, e credita de forma
 * idempotente: se um crédito falhou por rede, a próxima abertura repõe.
 */
app.get('/graos/:userId', async (req, res) => {
  try {
    const [resumo, extrato] = await Promise.all([
      resumoDeGraos(req.params.userId),
      extratoDeGraos(req.params.userId),
    ]);
    return res.json({ ...resumo, niveis: NIVEIS, extrato });
  } catch (err: any) {
    console.error('[graos]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao ler os grãos.' });
  }
});

/** Sequência e total de leituras — os dois números do topo do Campo. */
app.get('/devocional/:userId/resumo', async (req, res) => {
  try {
    return res.json(await resumoDeLeitura(req.params.userId));
  } catch (err: any) {
    console.error('[devocional/resumo]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao ler o resumo.' });
  }
});

app.post('/devocional/:userId/lido', async (req, res) => {
  try {
    const { data } = req.body as { data?: string };
    await ensureUser(req.params.userId);
    const r = await marcarDevocionalLido(req.params.userId, data ?? null);
    if (!r) return res.status(500).json({ error: 'não foi possível confirmar' });
    if (!r.jaEstava) void logEvent(req.params.userId, 'devocional_confirmado', { data: r.data });
    const resumo = await resumoDeLeitura(req.params.userId);
    // A sequência já contava a partir de ontem; se ela é maior que 1, este dia
    // emendou no anterior e vale o bônus.
    const ganhou = await creditarLeitura(req.params.userId, r.data, resumo.sequencia > 1);
    const graos = await resumoDeGraos(req.params.userId);
    return res.json({
      ok: true, data: r.data, jaEstava: r.jaEstava,
      totalLidos: resumo.total, ...resumo,
      graosGanhos: ganhou, graos,
    });
  } catch (err: any) {
    console.error('[devocional/lido]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao confirmar a leitura.' });
  }
});

/** Situação da assinatura, para a tela saber o que oferecer. */
app.get('/acesso/:userId', async (req, res) => {
  res.json(await acessoDoUsuario(req.params.userId));
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
    const acesso = await acessoDoUsuario(req.params.userId);

    // GRATUITO: o histórico é o próprio calendário, as páginas que já vieram
    // até hoje. Sem isto o Campo e a Raiz nasceriam vazios para quem não
    // assina, já que essas telas leem entregas do motor.
    if (!acesso.completo) {
      const dias = await devocionaisAte(req.params.userId, limite);
      return res.json(dias.map((d) => ({
        ...d,
        id: `d-${d.data}`,
        date: d.data,
        passage: d.verseLiteral ?? d.verse,
        reference: d.referenceExact ?? d.reference,
        reflection: d.body,
        prayer: null, practice: null, music: null,
        completa: false,
      })));
    }
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

    res.json(rows.map((r: any) => limitarSemente({
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
    }, true)));
  } catch (err: any) {
    console.error('[history]', err?.message || err);
    res.status(500).json({ error: 'Falha ao carregar o histórico.' });
  }
});

/**
 * Trocar o horário da entrega.
 *
 * Só existia dentro do opt-in do WhatsApp, que exige telefone: quem já tinha
 * ligado o canal e quisesse mudar o horário nos ajustes mexia num seletor que
 * não saía da tela. Para um assinante, o horário É o produto — é a hora em que
 * a semente chega.
 */
app.patch('/profile/:userId/horario', async (req, res) => {
  try {
    const { horario, timezone } = req.body as { horario?: string; timezone?: string };
    if (!horario || !/^\d{2}:\d{2}$/.test(horario)) {
      return res.status(400).json({ error: 'horario deve ser HH:MM' });
    }
    const { rowCount } = await pool.query(
      `UPDATE users SET delivery_time = $2::time,
                        timezone = coalesce($3, timezone)
        WHERE id = $1`, [req.params.userId, horario, timezone ?? null]);
    if (!rowCount) return res.status(404).json({ error: 'usuário não encontrado' });
    void logEvent(req.params.userId, 'horario_alterado', { horario });
    return res.json({ ok: true, horario });
  } catch (err: any) {
    console.error('[horario]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao salvar o horário.' });
  }
});

/** O horário e as preferências que a tela de ajustes precisa mostrar. */
app.get('/profile/:userId/preferencias', async (req, res) => {
  try {
    const { rows: [u] } = await pool.query(
      `SELECT to_char(delivery_time, 'HH24:MI') horario,
              (wa_opt_in_at IS NOT NULL AND phone_e164 IS NOT NULL) "whatsappLigado"
         FROM users WHERE id = $1`, [req.params.userId]);
    return res.json({
      horario: u?.horario ?? null,
      whatsappLigado: !!u?.whatsappLigado,
    });
  } catch (err: any) {
    console.error('[preferencias]', err?.message || err);
    return res.status(500).json({ error: 'Falha ao ler as preferências.' });
  }
});

// LGPD: exclusão total dos dados do usuário.
app.delete('/user/:userId', async (req, res) => {
  await deleteUserData(req.params.userId);
  res.json({ ok: true });
});

// Imagem do preview e página-ponte do louvor. BASE_URL vem de whatsapp.ts,
// que é quem também monta o link enviado na mensagem — os dois precisam
// apontar para o mesmo lugar.
app.use(express.static('public', { maxAge: '7d' }));
registerOuvirRoutes(app, BASE_URL);

// Canal WhatsApp. As rotas /whatsapp/inbound|due|opt-in são protegidas por
// GRAO_API_TOKEN e existem para um orquestrador externo (n8n). O webhook
// /whatsapp/webhook é a integração DIRETA com a Meta, autenticada pela
// assinatura HMAC — é o caminho em uso.
registerWhatsAppRoutes(app);
registerMetaWebhookRoutes(app);

// Painel de controle (/admin). Protegido por GRAO_ADMIN_TOKEN.
registerAdminRoutes(app);

// Cobrança pelo Asaas, com Pix. Só entra em ação com ASAAS_API_KEY.
registerCobrancaRoutes(app);

// Contas (Google, Apple, Facebook, e-mail/senha) via Supabase Auth.
registerAuthRoutes(app);

// A Bíblia para consulta, na Bíblia Livre (domínio público).
registerBibliaRoutes(app);

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Grão backend em http://localhost:${port}`);
  // A agenda de entrega vive dentro do processo: com horário escolhido pela
  // pessoa, o atraso de até duas horas do cron do GitHub deixou de ser
  // aceitável. Ele continua chamando /whatsapp/dispatch de hora em hora, como
  // reserva para o caso de o processo cair.
  iniciarAgenda();
});
