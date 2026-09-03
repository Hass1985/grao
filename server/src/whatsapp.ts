// Canal WhatsApp — a superfície que o n8n consome.
//
// Princípio: o n8n é encanamento, não cérebro. Ele recebe do BSP, chama um
// endpoint daqui e envia o que voltar. Toda decisão (quem é o usuário, o que
// responder, se cabe semente hoje) fica no backend, onde dá para testar.
//
// Por isso os endpoints falam em TELEFONE, não em userId: o n8n não deveria
// precisar manter uma tabela de mapeamento nem inventar ids.

import type { Express, Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { pool, getProfile, getRecentUserMessages, saveTurn, saveReading, setMomentBySystem, logEvent } from './db.js';
import { readMessage, CONFIDENCE_TO_UPDATE } from './brain.js';
import { selectSeedForUser, type SelectedSeed } from './seedSelector.js';
import { sendText, sendSeedNotice, metaConfigurada } from './meta.js';

const client = new Anthropic();
const REPLY_MODEL = process.env.GRAO_BRAIN_MODEL || 'claude-haiku-4-5-20251001';

/**
 * Janelas de entrega — cobrem o dia inteiro das 6h às 22h, sem buraco.
 *
 * A versão anterior tinha quatro faixas estreitas (6-8, 8-10, 12-13, 20-22) e
 * deixava 6 horas do dia descobertas. Quem ligava o WhatsApp às 13h40 escolhia
 * "Meio-dia", cujo disparo já tinha passado às 12h, e não recebia nada — foi
 * exatamente o que aconteceu no teste do Samir. Faixas contíguas de 4 horas
 * eliminam o buraco; `entregarSeJaEstaNaJanela` resolve o resto.
 */
export const JANELAS = ['dawn', 'noon', 'afternoon', 'evening'] as const;
export type Janela = (typeof JANELAS)[number];

/** Rótulo e faixa (hora de Brasília) de cada janela. Espelha a tela do app. */
export const JANELA_INFO: Record<Janela, { rotulo: string; inicio: number; fim: number }> = {
  dawn: { rotulo: 'Amanhecer', inicio: 6, fim: 10 },
  noon: { rotulo: 'Meio-dia', inicio: 10, fim: 14 },
  afternoon: { rotulo: 'Tarde', inicio: 14, fim: 18 },
  evening: { rotulo: 'Noite', inicio: 18, fim: 22 },
};

/** Telefone em E.164 (+5511999999999). Devolve null se não der para normalizar. */
export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  // Número brasileiro sem DDI: o BSP às vezes entrega assim.
  const comDDI = digits.length <= 11 ? `55${digits}` : digits;
  return `+${comDDI}`;
}

/**
 * Encontra o usuário pelo telefone, ou cria um novo.
 *
 * Criar aqui é deliberado: no WhatsApp a pessoa pode chegar antes de abrir o
 * app (alguém indicou o número). Sem isso, a primeira mensagem se perderia.
 */
export async function resolveUserByPhone(phone: string, name?: string): Promise<string> {
  const { rows: [existente] } = await pool.query(
    `SELECT id FROM users WHERE phone_e164 = $1`, [phone]);
  if (existente) {
    if (name) await pool.query(`UPDATE users SET name = coalesce(name, $2) WHERE id = $1`, [existente.id, name]);
    return existente.id;
  }
  const { rows: [novo] } = await pool.query(
    `INSERT INTO users (phone_e164, name) VALUES ($1, $2) RETURNING id`, [phone, name ?? null]);
  return novo.id;
}

/**
 * Renderiza a semente no formato do WhatsApp.
 *
 * Formatação: *negrito* e _itálico_ são o que o WhatsApp entende; nada de
 * markdown de cabeçalho, que aparece cru para o usuário.
 */
const BASE_URL = () =>
  (process.env.PUBLIC_BASE_URL || 'https://grao-backend.onrender.com').replace(/\/+$/, '');

export function formatSeed(seed: SelectedSeed, nome?: string | null): string {
  const saudacao = nome ? `${nome}, sua semente de hoje 🌱` : 'Sua semente de hoje 🌱';
  const partes = [
    saudacao,
    '',
    `_"${seed.passage}"_`,
    `— ${seed.reference}`,
    '',
    `*Reflexão*\n${seed.reflection}`,
    '',
    `*Oração*\n${seed.prayer}`,
    '',
    `*Prática de hoje*\n${seed.practice}`,
  ];
  if (seed.music.title) {
    // O link passa pela nossa página-ponte para o preview do WhatsApp mostrar
    // o Grão, e não a miniatura borrada do Spotify.
    partes.push('', `🎵 *${seed.music.title}* — ${seed.music.artist ?? ''}`.trimEnd());
    if (seed.music.spotifyUrl || seed.music.youtubeUrl) {
      partes.push(`${BASE_URL()}/ouvir/${seed.id}`);
    }
  }
  return partes.join('\n');
}

/** Quem vai receber. `janela_aberta` = falou com o Grão nas últimas 24h. */
export interface DestinoEntrega {
  id: string;
  phone_e164: string;
  name: string | null;
  janela_aberta?: boolean;
}

/**
 * Entrega a semente do dia para UMA pessoa. Único lugar que sabe enviar.
 *
 * Dentro da janela de 24h da Meta, texto livre é gratuito: mandamos a semente
 * inteira. Fora dela só passa template aprovado, então vai o aviso com o botão
 * "Plantar" — e o toque no botão abre a janela, deixando o resto do dia grátis.
 *
 * Se o envio falhar, a entrega registrada pelo seletor é DESFEITA. Sem isso a
 * pessoa ficaria sem semente hoje e ainda perderia a de amanhã, porque esta
 * contaria como já vista.
 */
export async function entregarSemente(
  u: DestinoEntrega,
  origem: string,
): Promise<{ ok: boolean; erro?: string; seedId?: string }> {
  const seed = await selectSeedForUser(u.id);
  if (!seed) return { ok: false, erro: 'sem semente disponível' };

  const aberta = !!u.janela_aberta;
  const r = aberta
    ? await sendText(u.phone_e164, formatSeed(seed, u.name ?? undefined))
    : await sendSeedNotice(u.phone_e164, { name: u.name ?? '', reference: seed.reference });

  if (r.ok) {
    if (aberta) {
      await pool.query(
        `UPDATE seed_deliveries SET planted = true
          WHERE id = (SELECT max(id) FROM seed_deliveries WHERE user_id = $1)`, [u.id]);
    }
    void logEvent(u.id, aberta ? 'seed_delivered' : 'seed_announced',
      { seedId: seed.id, family: seed.family, source: origem, gratuita: aberta });
    return { ok: true, seedId: seed.id };
  }

  void logEvent(u.id, 'wa_send_failed', { details: r.erro, source: origem });
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM seed_deliveries
        WHERE id = (SELECT max(id) FROM seed_deliveries
                     WHERE user_id = $1 AND planted = false
                       AND delivered_at > now() - interval '2 days')`, [u.id]);
    if (rowCount) console.warn(`[wa] entrega desfeita para ${u.phone_e164} — a semente volta para a fila`);
  } catch (e: any) {
    console.error('[wa] erro ao desfazer entrega:', e?.message || e);
  }
  return { ok: false, erro: r.erro };
}

/**
 * Primeira semente logo depois do opt-in, quando a janela escolhida JÁ abriu
 * hoje.
 *
 * Sem isto, quem liga o WhatsApp depois do horário do próprio disparo fica até
 * o dia seguinte sem nenhum sinal de que a integração funcionou — e conclui
 * que não funcionou. Foi o que aconteceu no teste do Samir: ele escolheu
 * "Meio-dia" às 13h40, e o disparo daquela janela tinha passado.
 *
 * Quem liga ANTES da janela abrir não recebe nada aqui: o cron entrega no
 * horário que a pessoa pediu, que é o certo.
 *
 * Falha de propósito em silêncio — é um bônus, não pode derrubar o opt-in.
 */
export async function entregarSeJaEstaNaJanela(userId: string): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const { rows: [u] } = await pool.query(
      `SELECT u.id, u.phone_e164, u.name, u.delivery_window,
              extract(hour from (now() AT TIME ZONE u.timezone))::int hora_local,
              (u.wa_last_inbound_at > now() - interval '24 hours') janela_aberta
         FROM users u
        WHERE u.id = $1
          AND u.wa_opt_in_at IS NOT NULL
          AND u.phone_e164 IS NOT NULL
          AND NOT EXISTS (
                SELECT 1 FROM seed_deliveries d
                 WHERE d.user_id = u.id
                   AND (d.delivered_at AT TIME ZONE u.timezone)::date
                     = (now() AT TIME ZONE u.timezone)::date)`, [userId]);

    if (!u) return false;
    const info = JANELA_INFO[(u.delivery_window ?? 'dawn') as Janela];
    if (!info || u.hora_local < info.inicio) return false;

    const r = await entregarSemente(u, 'whatsapp_optin');
    if (!r.ok) console.warn(`[wa/opt-in] entrega imediata falhou: ${r.erro}`);
    return r.ok;
  } catch (e: any) {
    console.error('[wa/opt-in] entrega imediata:', e?.message || e);
    return false;
  }
}

const REPLY_SYSTEM =`Você é o Grão respondendo no WhatsApp de uma pessoa evangélica brasileira. Você recebe a mensagem dela e uma leitura emocional interna (que ela nunca vê).

Escreva UMA resposta curta — no máximo 3 frases, como se manda numa conversa de WhatsApp. Português brasileiro caloroso e simples. Fale COM a pessoa.

REGRAS DURAS:
- Nada de clichê: "vai dar tudo certo", "tudo tem um propósito", "entendo perfeitamente", "sei como você se sente".
- Não prometa cura, solução ou resultado. Não culpe espiritualmente ("se você orasse mais").
- Ancore no que ELA disse: cite ou retome algo concreto da mensagem. Resposta genérica é falha.
- NÃO INVENTE A VIDA DELA. Só afirme o que ela contou. Nada de supor histórico ("você já passou por isso antes", "você sempre supera", "você já conhece essa rotina e sai dela"), nem de prever o futuro ("logo vai passar", "semana que vem melhora"), nem de atribuir traços que ela não mencionou ("você é forte", "sua fé é grande"). Parece acolhedor e é o contrário: uma hora você diz isso para quem NUNCA superou aquilo, e a frase vira deboche. Na dúvida, pergunte em vez de afirmar.
- NUNCA use vocativo com gênero ("irmão", "irmã", "meu filho", "querida") nem adjetive a pessoa no masculino ou feminino: você não sabe o gênero de quem escreve, e errar isso quebra a confiança. Use o nome, se souber, ou fale direto com "você". Prefira construções neutras ("que canseira", "isso pesa") a "você está cansado/cansada".
- Se a mensagem for operacional ("ok", "obrigado", "que horas?"), responda no mesmo tom leve e breve — não force profundidade.
- Se houver menção a não aguentar mais, se machucar ou não querer viver, acolha sem dramatizar e inclua o CVV: ligue 188 (24h, gratuito).

Você também decide se cabe entregar a semente do dia agora, no campo "quer_semente": true APENAS se a pessoa pedir (explícita ou claramente: "manda a semente", "cadê minha palavra de hoje", "quero minha semente"). Conversa comum não pede semente.`;

const REPLY_TOOL = {
  name: 'responder',
  description: 'Entrega a resposta do Grão. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      resposta: { type: 'string', description: 'Até 3 frases, tom de WhatsApp.' },
      quer_semente: { type: 'boolean', description: 'A pessoa pediu a semente do dia?' },
    },
    required: ['resposta', 'quer_semente'],
  },
};

/** Resposta conversacional curta, ancorada na leitura emocional. */
export async function replyFor(
  texto: string,
  leitura: { family: string; needs_care: boolean; summary: string } | null,
  contexto: string[],
): Promise<{ resposta: string; quer_semente: boolean }> {
  const ctx = contexto.length ? `\n\nMensagens anteriores dela:\n${contexto.map((m) => `- ${m}`).join('\n')}` : '';
  const leituraTxt = leitura
    ? `\n\nLeitura interna: família ${leitura.family}${leitura.needs_care ? ' · SOFRIMENTO INTENSO' : ''} · ${leitura.summary}`
    : '';

  const res = await client.messages.create({
    model: REPLY_MODEL,
    max_tokens: 600,
    system: [{ type: 'text', text: REPLY_SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [REPLY_TOOL as any],
    tool_choice: { type: 'tool', name: 'responder' },
    messages: [{ role: 'user', content: `Mensagem dela: "${texto}"${leituraTxt}${ctx}` }],
  });
  const tu = res.content.find((b) => b.type === 'tool_use');
  if (!tu || tu.type !== 'tool_use') {
    // Falha do modelo não pode virar silêncio no WhatsApp.
    return { resposta: 'Recebi sua mensagem. Estou aqui com você. 🌱', quer_semente: false };
  }
  return tu.input as { resposta: string; quer_semente: boolean };
}

/**
 * Autenticação por segredo compartilhado.
 *
 * Falha FECHADA: sem GRAO_API_TOKEN configurado, os endpoints não respondem.
 * Deixá-los abertos exporia a conversa e o telefone de todos os usuários.
 */
function exigeToken(req: Request, res: Response, next: NextFunction) {
  const esperado = process.env.GRAO_API_TOKEN;
  if (!esperado) {
    return res.status(503).json({ error: 'Canal WhatsApp não configurado (defina GRAO_API_TOKEN).' });
  }
  const recebido = req.header('x-grao-token');
  if (recebido !== esperado) return res.status(401).json({ error: 'token inválido' });
  next();
}

export function registerWhatsAppRoutes(app: Express) {
  /**
   * Fluxo A — mensagem recebida.
   * O n8n manda o que o BSP entregou; devolvemos o texto pronto para enviar.
   */
  app.post('/whatsapp/inbound', exigeToken, async (req, res) => {
    try {
      const { phone, text, name } = req.body as { phone?: string; text?: string; name?: string };
      const e164 = normalizePhone(phone ?? '');
      if (!e164) return res.status(400).json({ error: 'phone inválido' });
      if (!text?.trim()) return res.status(400).json({ error: 'text é obrigatório' });

      const userId = await resolveUserByPhone(e164, name);
      await saveTurn(userId, 'user', text);
      void logEvent(userId, 'message_in', { source: 'whatsapp', chars: text.length });

      const [recentes, perfil] = await Promise.all([
        getRecentUserMessages(userId, 4),
        getProfile(userId),
      ]);
      const leitura = await readMessage(text, {
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

      const { resposta, quer_semente } = await replyFor(text, leitura, recentes.slice(0, -1));
      await saveTurn(userId, 'assistant', resposta);

      let seedTexto: string | undefined;
      if (quer_semente) {
        const seed = await selectSeedForUser(userId);
        if (seed) {
          seedTexto = formatSeed(seed, perfil ? undefined : name);
          void logEvent(userId, 'seed_delivered', { seedId: seed.id, family: seed.family, source: 'whatsapp' });
        }
      }

      // mensagens: o n8n envia na ordem, uma por balão.
      const mensagens = seedTexto ? [resposta, seedTexto] : [resposta];
      return res.json({
        userId,
        mensagens,
        needsCare: leitura?.needs_care ?? false,
        reading: leitura ? { family: leitura.family, confidence: leitura.confidence } : null,
      });
    } catch (err: any) {
      console.error('[wa/inbound]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao processar a mensagem.' });
    }
  });

  /**
   * Fluxo B — quem recebe a semente agora.
   *
   * Devolve a mensagem JÁ RENDERIZADA. O n8n só precisa iterar e enviar, sem
   * um segundo round-trip por usuário.
   *
   * Idempotente por dia: quem já recebeu hoje (no fuso do próprio usuário)
   * não volta na lista, então um cron que dispara duas vezes não duplica.
   */
  app.get('/whatsapp/due', exigeToken, async (req, res) => {
    try {
      const janela = String(req.query.window ?? '');
      if (!JANELAS.includes(janela as Janela)) {
        return res.status(400).json({ error: `window deve ser um de: ${JANELAS.join(', ')}` });
      }
      const limite = Math.min(Number(req.query.limit ?? 200), 500);

      const { rows: usuarios } = await pool.query(
        `SELECT u.id, u.phone_e164, u.name
           FROM users u
          WHERE u.delivery_window = $1
            AND u.wa_opt_in_at IS NOT NULL
            AND u.phone_e164 IS NOT NULL
            AND NOT EXISTS (
                  SELECT 1 FROM seed_deliveries d
                   WHERE d.user_id = u.id
                     AND (d.delivered_at AT TIME ZONE u.timezone)::date
                       = (now() AT TIME ZONE u.timezone)::date)
          LIMIT $2`, [janela, limite]);

      const entregas = [];
      for (const u of usuarios) {
        const seed = await selectSeedForUser(u.id);
        if (!seed) continue;
        void logEvent(u.id, 'seed_delivered', { seedId: seed.id, family: seed.family, source: 'whatsapp_cron' });
        entregas.push({
          userId: u.id,
          phone: u.phone_e164,
          name: u.name,
          seedId: seed.id,
          family: seed.family,
          // texto pronto, para quando a janela de 24h estiver aberta
          message: formatSeed(seed, u.name),
          // partes separadas, para preencher as variáveis de um template HSM
          // (fora da janela de 24h a Meta só aceita template aprovado)
          parts: {
            name: u.name ?? '',
            passage: seed.passage,
            reference: seed.reference,
            reflection: seed.reflection,
            prayer: seed.prayer,
            practice: seed.practice,
            musicTitle: seed.music.title ?? '',
            musicArtist: seed.music.artist ?? '',
            musicUrl: seed.music.spotifyUrl || seed.music.youtubeUrl || '',
          },
        });
      }
      return res.json({ window: janela, total: entregas.length, entregas });
    } catch (err: any) {
      console.error('[wa/due]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao montar a fila de entrega.' });
    }
  });

  /**
   * Liga o cadastro do WEBAPP ao canal do WhatsApp.
   *
   * Sem isto o produto se parte em dois: a pessoa faz a Abertura no site, o
   * cérebro monta o perfil dela — e o WhatsApp nunca descobre quem é, porque
   * lá a identidade é o telefone e aqui é o userId do navegador.
   *
   * O caso difícil é quando a pessoa JÁ escreveu para o Grão antes de fazer o
   * onboarding: existem dois registros para a mesma pessoa. Aqui eles são
   * fundidos — o histórico do webapp migra para o registro do telefone, que é
   * o que o WhatsApp consegue encontrar. O endpoint devolve o id sobrevivente,
   * e o app precisa passar a usar esse.
   */
  app.post('/profile/:userId/whatsapp', async (req, res) => {
    try {
      const { userId } = req.params;
      const { phone, window: janela, timezone } = req.body as
        { phone?: string; window?: string; timezone?: string };

      const e164 = normalizePhone(phone ?? '');
      if (!e164) return res.status(400).json({ error: 'phone inválido' });
      if (janela && !JANELAS.includes(janela as Janela)) {
        return res.status(400).json({ error: `window deve ser um de: ${JANELAS.join(', ')}` });
      }

      const { rows: [dono] } = await pool.query(
        `SELECT id FROM users WHERE phone_e164 = $1`, [e164]);

      let idFinal = userId;

      if (dono && dono.id !== userId) {
        // Fusão: o telefone manda, porque é a chave que o WhatsApp usa.
        idFinal = dono.id;
        await pool.query(`UPDATE conversation_turns SET user_id = $2 WHERE user_id = $1`, [userId, dono.id]);
        await pool.query(`UPDATE emotional_readings SET user_id = $2 WHERE user_id = $1`, [userId, dono.id]);
        await pool.query(`UPDATE events SET user_id = $2 WHERE user_id = $1`, [userId, dono.id]);
        // Entregas e momento podem colidir na chave: só migra o que não existir.
        await pool.query(
          `UPDATE seed_deliveries d SET user_id = $2 WHERE d.user_id = $1
            AND NOT EXISTS (SELECT 1 FROM seed_deliveries x WHERE x.user_id = $2 AND x.seed_id = d.seed_id)`,
          [userId, dono.id]);
        // Perfil e momento têm o user_id como chave: mover só funciona se o
        // destino não tiver o seu. O perfil do webapp é o mais recente (acabou
        // de sair da Abertura), então ele prevalece.
        for (const tabela of ['profiles', 'user_moment']) {
          await pool.query(
            `DELETE FROM ${tabela} WHERE user_id = $2
              AND EXISTS (SELECT 1 FROM ${tabela} WHERE user_id = $1)`, [userId, dono.id]);
          await pool.query(`UPDATE ${tabela} SET user_id = $2 WHERE user_id = $1`, [userId, dono.id]);
        }
        // O nome vindo do WhatsApp costuma ser o do perfil do aparelho; o do
        // onboarding é o que a pessoa escolheu. Este vence.
        await pool.query(
          `UPDATE users SET name = coalesce((SELECT name FROM users WHERE id = $1), name)
            WHERE id = $2`, [userId, dono.id]);
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
        void logEvent(idFinal, 'user_merged', { de: userId, motivo: 'telefone já existia' });
      } else if (!dono) {
        await pool.query(`UPDATE users SET phone_e164 = $2 WHERE id = $1`, [userId, e164]);
      }

      await pool.query(
        `UPDATE users SET wa_opt_in_at = coalesce(wa_opt_in_at, now()),
                          delivery_window = coalesce($2, delivery_window),
                          timezone = coalesce($3, timezone)
          WHERE id = $1`, [idFinal, janela ?? null, timezone ?? null]);
      void logEvent(idFinal, 'wa_opt_in', { window: janela ?? null, origem: 'webapp' });

      // Não é awaited: a primeira semente é um bônus, e a resposta do
      // onboarding não pode esperar a Meta nem quebrar se ela falhar.
      void entregarSeJaEstaNaJanela(idFinal);

      return res.json({ ok: true, userId: idFinal, merged: idFinal !== userId });
    } catch (err: any) {
      console.error('[wa/link]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao ligar o WhatsApp ao perfil.' });
    }
  });

  /** Opt-in e janela de horário — chamado pelo app ou por um fluxo de cadastro. */
  app.post('/whatsapp/opt-in', exigeToken, async (req, res) => {
    try {
      const { phone, window: janela, optIn = true, timezone } = req.body as
        { phone?: string; window?: string; optIn?: boolean; timezone?: string };
      const e164 = normalizePhone(phone ?? '');
      if (!e164) return res.status(400).json({ error: 'phone inválido' });
      if (janela && !JANELAS.includes(janela as Janela)) {
        return res.status(400).json({ error: `window deve ser um de: ${JANELAS.join(', ')}` });
      }
      const userId = await resolveUserByPhone(e164);
      await pool.query(
        `UPDATE users
            SET wa_opt_in_at = CASE WHEN $2 THEN coalesce(wa_opt_in_at, now()) ELSE NULL END,
                delivery_window = coalesce($3, delivery_window),
                timezone = coalesce($4, timezone)
          WHERE id = $1`,
        [userId, optIn, janela ?? null, timezone ?? null]);
      void logEvent(userId, optIn ? 'wa_opt_in' : 'wa_opt_out', { window: janela ?? null });
      if (optIn) void entregarSeJaEstaNaJanela(userId);
      return res.json({ ok: true, userId, optIn, window: janela ?? null });
    } catch (err: any) {
      console.error('[wa/opt-in]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao registrar a preferência.' });
    }
  });
}
