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
import { readMessage, CONFIDENCE_TO_UPDATE, registrarFalhaDoCerebro } from './brain.js';
import { selectSeedForUser, getOrSelectTodaySeed, type SelectedSeed } from './seedSelector.js';
import { sendText, sendSeedNotice, metaConfigurada } from './meta.js';
import { TEM_ACESSO_SQL, acessoDoUsuario } from './acesso.js';

const client = new Anthropic();
const REPLY_MODEL = process.env.GRAO_BRAIN_MODEL || 'claude-haiku-4-5-20251001';

/**
 * HORÁRIO da entrega, escolhido pela própria pessoa.
 *
 * Substituiu as quatro janelas de 4 horas. A janela resolvia o buraco da
 * agenda, mas não a promessa: quem escolhia "Tarde" recebia às 15h mesmo que a
 * rotina só abrisse às 16h30. E aqui o horário pesa mais que num app comum —
 * a semente chega com o botão "Plantar", e só toca nele quem está disponível
 * na hora. Errar o horário não atrasa a leitura: cancela o gesto.
 *
 * O horário é sempre LOCAL, lido junto com users.timezone.
 */
const HORARIO_PADRAO = '07:00';

/**
 * Aceita "7:5", "07:05", "0705" e devolve "07:05". Null se não for horário.
 *
 * Permissivo na entrada de propósito: o campo vem de um seletor no app, mas
 * também de scripts e de clientes futuros, e recusar por causa de um zero à
 * esquerda faria alguém deixar de receber sem entender por quê.
 */
export function normalizarHorario(bruto: string | undefined | null): string | null {
  if (!bruto) return null;
  const texto = String(bruto).trim();
  let h: number, m: number;

  // Com separador, quem manda é ele: "7:5" são 7h05, e adivinhar pela
  // quantidade de dígitos leria 75 e recusaria.
  const comSeparador = /^(\d{1,2})\s*[:h.]\s*(\d{1,2})?$/i.exec(texto);
  if (comSeparador) {
    h = +comSeparador[1];
    m = +(comSeparador[2] ?? 0);
  } else {
    const digitos = texto.replace(/\D/g, '');
    if (digitos.length === 3) { h = +digitos.slice(0, 1); m = +digitos.slice(1); }
    else if (digitos.length === 4) { h = +digitos.slice(0, 2); m = +digitos.slice(2); }
    else if (digitos.length === 1 || digitos.length === 2) { h = +digitos; m = 0; }
    else return null;
  }

  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Traduz a janela antiga para horário.
 *
 * O webapp publicado continua no ar enquanto o build novo não sobe, e ele
 * manda `window`, não `time`. Sem esta tradução o opt-in dele passaria a
 * gravar nada e a pessoa ficaria sem receber EM SILÊNCIO — a falha mais cara
 * que já tivemos aqui.
 *
 * Cada janela vira o horário em que ela de fato disparava, não o começo da
 * faixa: quem escolheu "Amanhecer" já recebia 7h.
 */
const JANELA_PARA_HORARIO: Record<string, string> = {
  dawn: '07:00',
  morning: '07:00',      // faixa que existiu entre 8h e 10h, ver 009_janelas.sql
  noon: '11:00',
  afternoon: '15:00',
  evening: '19:00',
};

/**
 * Horário a gravar, a partir do que o cliente mandou.
 *
 * Devolve null quando veio algo que não dá para interpretar, para o endpoint
 * recusar com 400 em vez de gravar um horário que ninguém escolheu.
 */
export function horarioDeEntrada(
  time?: string | null,
  window?: string | null,
): { horario: string | null; erro?: string } {
  if (time) {
    const h = normalizarHorario(time);
    return h ? { horario: h } : { horario: null, erro: 'time deve estar no formato HH:MM' };
  }
  if (window) {
    const h = JANELA_PARA_HORARIO[window];
    return h ? { horario: h } : { horario: null, erro: 'window desconhecida' };
  }
  return { horario: null };   // nada informado: mantém o que já estava
}

/** "07:05:00" (como o Postgres devolve) → "07:05". */
export function horarioCurto(bruto: string | null | undefined): string | null {
  return bruto ? String(bruto).slice(0, 5) : null;
}

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
/**
 * URL pública do backend. Vai dentro do link do louvor e da og:image que o
 * rastreador do WhatsApp busca de fora — por isso não pode ser localhost.
 *
 * O padrão aponta para o Render de hoje, então a variável só passa a importar
 * quando o backend mudar de endereço. Definida aqui e importada pelos outros
 * módulos: duas cópias desta linha divergiriam no dia da mudança, e o link da
 * música continuaria mandando todo mundo para o endereço antigo.
 */
export const BASE_URL = () =>
  (process.env.PUBLIC_BASE_URL || 'https://grao-backend.onrender.com').replace(/\/+$/, '');

export function formatSeed(
  seed: SelectedSeed,
  nome?: string | null,
  completa = true,
): string {
  const saudacao = nome ? `${nome}, sua semente de hoje 🌱` : 'Sua semente de hoje 🌱';
  const partes = [
    saudacao,
    '',
    `_"${seed.passage}"_`,
    // Sem travessão: ele é a marca registrada de texto de IA, e aparecia em
    // TODA mensagem, logo abaixo do versículo. O itálico já separa a citação
    // da referência.
    `_${seed.reference}_`,
    '',
    `*Reflexão*\n${seed.reflection}`,
  ];

  // O canal é do plano pago, então em tese ninguém chega aqui sem assinatura.
  // O corte existe mesmo assim porque um caminho escapa do filtro: quem manda
  // mensagem direto para o número e pede a semente. Deixar a curadoria sair
  // por essa porta anularia o paywall inteiro.
  if (!completa) {
    partes.push('',
      'A oração, a prática e o louvor de hoje fazem parte do plano completo.',
      'Assine para receber a semente inteira todos os dias. 🌱');
    return partes.join('\n');
  }

  partes.push(
    '',
    `*Oração*\n${seed.prayer}`,
    '',
    `*Prática de hoje*\n${seed.practice}`,
  );
  if (seed.music.title) {
    // O link passa pela nossa página-ponte para o preview do WhatsApp mostrar
    // o Grão, e não a miniatura borrada do Spotify.
    const artista = seed.music.artist ? `, ${seed.music.artist}` : '';
    partes.push('', `🎵 *${seed.music.title}*${artista}`);
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
  // A semente do dia pode JÁ ter sido escolhida pelo app. Nesse caso mandamos
  // a mesma: app e WhatsApp precisam mostrar a mesma coisa, e sortear outra
  // aqui gastaria duas das 380 no mesmo dia.
  const escolha = await getOrSelectTodaySeed(u.id);
  if (!escolha) return { ok: false, erro: 'sem semente disponível' };
  const { seed, jaExistia } = escolha;

  const aberta = !!u.janela_aberta;
  const r = aberta
    ? await sendText(u.phone_e164, formatSeed(seed, u.name ?? undefined))
    : await sendSeedNotice(u.phone_e164, { name: u.name ?? '', reference: seed.reference });

  if (r.ok) {
    // sent_wa_at é o que impede o reenvio. Marcado na entrega DE HOJE desta
    // pessoa, não na última linha da tabela: com o app escolhendo a semente
    // antes, "a última linha" nem sempre é a do dia.
    await pool.query(
      `UPDATE seed_deliveries d SET sent_wa_at = now()${aberta ? ', planted = true' : ''}
         FROM users u
        WHERE d.user_id = $1 AND u.id = d.user_id
          AND (d.delivered_at AT TIME ZONE u.timezone)::date
            = (now() AT TIME ZONE u.timezone)::date`, [u.id]);
    void logEvent(u.id, aberta ? 'seed_delivered' : 'seed_announced',
      { seedId: seed.id, family: seed.family, source: origem, gratuita: aberta });
    return { ok: true, seedId: seed.id };
  }

  void logEvent(u.id, 'wa_send_failed', { details: r.erro, source: origem });
  // Desfaz APENAS o que este envio criou. Se a semente já tinha sido escolhida
  // pelo app, ela é da pessoa: apagar tiraria da tela Hoje uma semente que ela
  // talvez já tenha lido. Fica gravada, com sent_wa_at nulo, e a próxima
  // varredura tenta mandar de novo.
  if (!jaExistia) {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM seed_deliveries
          WHERE id = (SELECT max(id) FROM seed_deliveries
                       WHERE user_id = $1 AND seed_id = $2 AND sent_wa_at IS NULL
                         AND planted = false)`, [u.id, seed.id]);
      if (rowCount) console.warn(`[wa] entrega desfeita para ${u.phone_e164} — a semente volta para a fila`);
    } catch (e: any) {
      console.error('[wa] erro ao desfazer entrega:', e?.message || e);
    }
  }
  return { ok: false, erro: r.erro };
}

/**
 * Primeira semente logo depois do opt-in, quando o horário escolhido JÁ passou
 * hoje.
 *
 * Sem isto, quem liga o WhatsApp depois do próprio horário fica até o dia
 * seguinte sem nenhum sinal de que a integração funcionou — e conclui que não
 * funcionou. Foi o que aconteceu no teste do Samir.
 *
 * Aqui, ao contrário da agenda, NÃO existe limite de atraso: a pessoa acabou
 * de pedir para receber, e mostrar que funciona vale mais do que respeitar um
 * horário que ela ainda nem viu acontecer. Quem liga antes do horário não
 * recebe nada agora — a agenda entrega na hora que ela pediu, que é o certo.
 *
 * Falha de propósito em silêncio — é um bônus, não pode derrubar o opt-in.
 */
export async function entregarSeJaPassouOHorario(userId: string): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const { rows: [u] } = await pool.query(
      `SELECT u.id, u.phone_e164, u.name,
              (u.wa_last_inbound_at > now() - interval '24 hours') janela_aberta
         FROM users u
         JOIN subscriptions s ON s.user_id = u.id
        WHERE u.id = $1
          AND ${TEM_ACESSO_SQL('s')}
          AND u.wa_opt_in_at IS NOT NULL
          AND u.phone_e164 IS NOT NULL
          AND (now() AT TIME ZONE u.timezone)::time >= u.delivery_time
          AND NOT EXISTS (
                SELECT 1 FROM seed_deliveries d
                 WHERE d.user_id = u.id
                   AND d.sent_wa_at IS NOT NULL
                   AND (d.delivered_at AT TIME ZONE u.timezone)::date
                     = (now() AT TIME ZONE u.timezone)::date)`, [userId]);

    if (!u) return false;
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
- NUNCA use travessão (—). Ele é a marca registrada de texto escrito por máquina, e num devocional isso destrói a confiança: a pessoa não sabe nomear o que estranhou, mas sente que não foi gente que escreveu. Use vírgula, dois-pontos ou ponto final.
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

  // A resposta genérica é o piso, nunca o alvo: quem escreveu merece resposta
  // ancorada no que disse. Mas SILÊNCIO é pior que genérico, e era o que
  // acontecia quando a API caía: a exceção subia, o webhook registrava o erro
  // no log e a pessoa ficava sem nenhuma resposta.
  const RESERVA = { resposta: 'Recebi sua mensagem e estou aqui com você. 🌱', quer_semente: false };
  try {
    const res = await client.messages.create({
      model: REPLY_MODEL,
      max_tokens: 600,
      system: [{ type: 'text', text: REPLY_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [REPLY_TOOL as any],
      tool_choice: { type: 'tool', name: 'responder' },
      messages: [{ role: 'user', content: `Mensagem dela: "${texto}"${leituraTxt}${ctx}` }],
    });
    const tu = res.content.find((b) => b.type === 'tool_use');
    if (!tu || tu.type !== 'tool_use') return RESERVA;
    return tu.input as { resposta: string; quer_semente: boolean };
  } catch (err: any) {
    registrarFalhaDoCerebro('resposta no WhatsApp', err);
    return RESERVA;
  }
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
      const limite = Math.min(Number(req.query.limit ?? 200), 500);

      // Não recebe mais janela: quem decide é o horário de cada pessoa, e a
      // condição é a mesma da agenda interna (agenda.ts) — as duas não podem
      // discordar sobre quem está na hora de receber.
      const { rows: usuarios } = await pool.query(
        `SELECT u.id, u.phone_e164, u.name
           FROM users u
           JOIN subscriptions s ON s.user_id = u.id
          WHERE ${TEM_ACESSO_SQL('s')}
            AND u.wa_opt_in_at IS NOT NULL
            AND u.phone_e164 IS NOT NULL
            AND (now() AT TIME ZONE u.timezone)::time >= u.delivery_time
            AND NOT EXISTS (
                  SELECT 1 FROM seed_deliveries d
                   WHERE d.user_id = u.id
                     AND d.sent_wa_at IS NOT NULL
                     AND (d.delivered_at AT TIME ZONE u.timezone)::date
                       = (now() AT TIME ZONE u.timezone)::date)
          LIMIT $1`, [limite]);

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
      return res.json({ total: entregas.length, entregas });
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
      const { phone, time, window: janela, timezone } = req.body as
        { phone?: string; time?: string; window?: string; timezone?: string };

      const e164 = normalizePhone(phone ?? '');
      if (!e164) return res.status(400).json({ error: 'phone inválido' });
      // `time` é o campo novo; `window` ainda chega do webapp publicado, e é
      // traduzido para horário. Sem isso o opt-in do build velho gravaria nada
      // e a pessoa ficaria sem receber, em silêncio.
      const { horario, erro } = horarioDeEntrada(time, janela);
      if (erro) return res.status(400).json({ error: erro });

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
                          delivery_time = coalesce($2::time, delivery_time),
                          timezone = coalesce($3, timezone)
          WHERE id = $1`, [idFinal, horario, timezone ?? null]);
      void logEvent(idFinal, 'wa_opt_in', { time: horario, origem: 'webapp' });

      // Não é awaited: a primeira semente é um bônus, e a resposta do
      // onboarding não pode esperar a Meta nem quebrar se ela falhar.
      void entregarSeJaPassouOHorario(idFinal);

      return res.json({ ok: true, userId: idFinal, merged: idFinal !== userId, time: horario });
    } catch (err: any) {
      console.error('[wa/link]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao ligar o WhatsApp ao perfil.' });
    }
  });

  /** Opt-in e horário de entrega — chamado pelo app ou por um fluxo de cadastro. */
  app.post('/whatsapp/opt-in', exigeToken, async (req, res) => {
    try {
      const { phone, time, window: janela, optIn = true, timezone } = req.body as
        { phone?: string; time?: string; window?: string; optIn?: boolean; timezone?: string };
      const e164 = normalizePhone(phone ?? '');
      if (!e164) return res.status(400).json({ error: 'phone inválido' });
      const { horario, erro } = horarioDeEntrada(time, janela);
      if (erro) return res.status(400).json({ error: erro });
      const userId = await resolveUserByPhone(e164);
      await pool.query(
        `UPDATE users
            SET wa_opt_in_at = CASE WHEN $2 THEN coalesce(wa_opt_in_at, now()) ELSE NULL END,
                delivery_time = coalesce($3::time, delivery_time),
                timezone = coalesce($4, timezone)
          WHERE id = $1`,
        [userId, optIn, horario, timezone ?? null]);
      void logEvent(userId, optIn ? 'wa_opt_in' : 'wa_opt_out', { time: horario });
      if (optIn) void entregarSeJaPassouOHorario(userId);
      return res.json({ ok: true, userId, optIn, time: horario });
    } catch (err: any) {
      console.error('[wa/opt-in]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao registrar a preferência.' });
    }
  });
}
