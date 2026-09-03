// Painel de controle do Grão.
//
// Uma página só, servida pelo próprio backend, lendo o mesmo Postgres. Sem
// Metabase, sem Amplitude, sem mais uma conta para manter: no Trial o custo de
// operar uma ferramenta a mais é maior do que o que ela entrega, e todo dado
// interessante já está em `events`, `seed_deliveries` e `users`.
//
// Divisão deliberada: TODA a leitura acontece aqui, em uma única resposta
// (/admin/api/painel). A página é burra — busca uma vez e desenha as oito
// seções a partir do mesmo objeto. Assim dá para conferir qualquer número
// abrindo o JSON, sem ler JavaScript, e trocar de seção não custa viagem.
//
// ACESSO: exige token. Aqui tem nome, telefone e ritmo devocional de gente
// real — pela LGPD, convicção religiosa é dado SENSÍVEL (art. 5º, II). O ideal
// é um GRAO_ADMIN_TOKEN próprio; na falta dele aceitamos o GRAO_API_TOKEN para
// o painel não nascer inacessível, e a página avisa quando está nesse modo.

import type { Express, Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { pool } from './db.js';
import { JANELA_INFO, type Janela } from './whatsapp.js';
import { metaConfigurada } from './meta.js';

const TZ = 'America/Sao_Paulo';

/**
 * Preço unitário estimado do template Marketing no Brasil, em reais.
 *
 * Fica em variável de ambiente porque a Meta remarca por país e por período, e
 * um número cravado no código envelhece calado. O painel mostra o valor usado
 * junto do resultado, para o número nunca aparecer como se fosse fatura.
 */
const CUSTO_TEMPLATE = Number(process.env.WA_CUSTO_TEMPLATE_BRL ?? 0.35);

function exigeAdmin(req: Request, res: Response, next: NextFunction) {
  const esperado = process.env.GRAO_ADMIN_TOKEN || process.env.GRAO_API_TOKEN;
  if (!esperado) return res.status(503).json({ error: 'GRAO_ADMIN_TOKEN não configurado' });
  const recebido = req.header('x-grao-token') || String(req.query.token ?? '');
  if (recebido !== esperado) return res.status(401).json({ error: 'token inválido' });
  next();
}

/** Telefone parcialmente oculto: dá para reconhecer quem é sem expor o número. */
function mascarar(e164: string | null): string | null {
  if (!e164) return null;
  return e164.length > 8 ? `${e164.slice(0, 6)}•••••${e164.slice(-2)}` : e164;
}

const num = (v: any) => Number(v ?? 0);

/** Etapas do funil, na ordem. Mesma leitura do script `npm run funil`. */
const ETAPAS: { chave: string; rotulo: string }[] = [
  { chave: 'abriu', rotulo: 'Abriu o app' },
  { chave: 'abertura', rotulo: 'Contou o que está vivendo' },
  { chave: 'perfil', rotulo: 'Cérebro montou o perfil' },
  { chave: 'whatsapp', rotulo: 'Ligou o WhatsApp' },
  { chave: 'semente', rotulo: 'Recebeu a primeira semente' },
  { chave: 'plantou', rotulo: 'Tocou em Plantar' },
];

/** Tradução dos tipos de evento para a linha do tempo. */
const EVENTOS: Record<string, string> = {
  onboarding_done: 'concluiu a Abertura',
  wa_opt_in: 'ligou o WhatsApp',
  wa_opt_out: 'desligou o WhatsApp',
  seed_announced: 'recebeu o aviso da semente',
  seed_delivered: 'recebeu a semente',
  seed_planted: 'tocou em Plantar',
  message_in: 'escreveu no WhatsApp',
  moment_changed: 'momento emocional atualizado',
  musica_aberta: 'abriu o louvor',
  plan_selected: 'escolheu o plano',
  user_merged: 'cadastros fundidos',
  wa_send_failed: 'falha no envio',
  wa_dispatch: 'disparo automático',
};

async function montarPainel(dias: number) {
  const q = async (sql: string, params: any[] = []) => (await pool.query(sql, params)).rows;
  const janelaSql = `${dias} days`;

  // --- números do topo -----------------------------------------------------
  const [resumo] = await q(`
    SELECT
      (SELECT count(*) FROM users) usuarios,
      (SELECT count(*) FROM users
        WHERE created_at > now() - $1::interval) usuarios_periodo,
      (SELECT count(*) FROM users
        WHERE wa_opt_in_at IS NOT NULL AND phone_e164 IS NOT NULL) com_whatsapp,
      (SELECT count(DISTINCT user_id) FROM events
        WHERE created_at > now() - interval '7 days' AND user_id IS NOT NULL) ativos_7d,
      (SELECT count(*) FROM seed_deliveries d JOIN users u ON u.id = d.user_id
        WHERE (d.delivered_at AT TIME ZONE u.timezone)::date
            = (now() AT TIME ZONE u.timezone)::date) sementes_hoje,
      (SELECT count(*) FROM seed_deliveries
        WHERE delivered_at > now() - $1::interval) entregas,
      (SELECT count(*) FROM seed_deliveries
        WHERE delivered_at > now() - $1::interval AND planted) plantios,
      (SELECT count(*) FROM subscriptions WHERE status IN ('trial','ativa')) assinaturas`,
    [janelaSql]);

  // --- pessoas, e o funil que sai delas ------------------------------------
  // Uma linha por pessoa com as etapas cumpridas; a soma vira o funil. Poderia
  // ser um COUNT por etapa, mas assim o mesmo SELECT alimenta a lista de
  // pessoas, e as duas visões nunca discordam.
  const pessoas = await q(`
    SELECT u.id, coalesce(u.name,'(sem nome)') nome, u.phone_e164, u.delivery_window,
           u.created_at,
           EXISTS (SELECT 1 FROM conversation_turns t
                    WHERE t.user_id = u.id AND t.role = 'user') abertura,
           EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id) perfil,
           (u.phone_e164 IS NOT NULL AND u.wa_opt_in_at IS NOT NULL) whatsapp,
           EXISTS (SELECT 1 FROM seed_deliveries d WHERE d.user_id = u.id) semente,
           EXISTS (SELECT 1 FROM seed_deliveries d
                    WHERE d.user_id = u.id AND d.planted) plantou,
           (SELECT count(*) FROM seed_deliveries d WHERE d.user_id = u.id) entregas,
           (SELECT count(DISTINCT (d.delivered_at AT TIME ZONE u.timezone)::date)
              FROM seed_deliveries d WHERE d.user_id = u.id) dias_ativos,
           (SELECT max(created_at) FROM events e WHERE e.user_id = u.id) ultima_atividade,
           (SELECT p.emotional_hint FROM profiles p WHERE p.user_id = u.id) familia,
           (SELECT s.plan FROM subscriptions s WHERE s.user_id = u.id) plano,
           (SELECT s.status FROM subscriptions s WHERE s.user_id = u.id) plano_status
      FROM users u
     ORDER BY u.created_at DESC`);

  const total = pessoas.length || 1;
  const funil = ETAPAS.map(({ chave, rotulo }) => {
    const n = chave === 'abriu' ? pessoas.length : pessoas.filter((p: any) => p[chave]).length;
    return { chave, rotulo, n, pct: Math.round((n / total) * 100) };
  });

  // --- série diária --------------------------------------------------------
  // generate_series garante os dias VAZIOS. Sem eles o gráfico mente: um dia
  // sem entrega nenhuma simplesmente sumiria, e a linha pareceria contínua.
  const serie = await q(`
    WITH d AS (
      SELECT generate_series(
        (now() AT TIME ZONE $1)::date - ($2::int - 1),
        (now() AT TIME ZONE $1)::date, '1 day')::date dia)
    -- ::text porque o driver devolve a coluna date como Date do JavaScript, e
    -- a conversão para string vira "Thu Sep 03" — inútil no gráfico.
    SELECT d.dia::text dia,
      (SELECT count(*) FROM users u
        WHERE (u.created_at AT TIME ZONE $1)::date = d.dia) novos,
      (SELECT count(*) FROM seed_deliveries s
        WHERE (s.delivered_at AT TIME ZONE $1)::date = d.dia) entregas,
      (SELECT count(*) FROM seed_deliveries s
        WHERE (s.delivered_at AT TIME ZONE $1)::date = d.dia AND s.planted) plantios,
      (SELECT count(DISTINCT e.user_id) FROM events e
        WHERE (e.created_at AT TIME ZONE $1)::date = d.dia AND e.user_id IS NOT NULL) ativos,
      (SELECT count(*) FROM events e
        WHERE e.type = 'message_in'
          AND (e.created_at AT TIME ZONE $1)::date = d.dia) mensagens
      FROM d ORDER BY d.dia`, [TZ, dias]);

  // --- janelas de entrega --------------------------------------------------
  const janelasBrutas = await q(`
    SELECT coalesce(delivery_window, '(não definida)') janela, count(*)::int n
      FROM users WHERE wa_opt_in_at IS NOT NULL
     GROUP BY 1 ORDER BY 2 DESC`);
  const janelas = janelasBrutas.map((r: any) => {
    const info = JANELA_INFO[r.janela as Janela];
    return {
      janela: r.janela,
      rotulo: info?.rotulo ?? r.janela,
      faixa: info ? `${info.inicio}h – ${info.fim}h` : '—',
      n: r.n,
    };
  });

  // --- planos --------------------------------------------------------------
  const planos = await q(`
    SELECT plan, status, count(*)::int n, sum(price_cents)::bigint cents
      FROM subscriptions GROUP BY 1, 2 ORDER BY 1, 2`);
  // Receita recorrente mensal: o anual entra dividido por 12, senão um único
  // assinante anual faria o mês parecer dez vezes melhor do que foi.
  const mrrCents = planos
    .filter((p: any) => ['trial', 'ativa'].includes(p.status))
    .reduce((s: number, p: any) => s + (p.plan === 'anual' ? num(p.cents) / 12 : num(p.cents)), 0);
  const trialsTerminando = await q(`
    SELECT coalesce(u.name,'(sem nome)') nome, s.plan, s.trial_ends_at
      FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE s.status = 'trial' AND s.trial_ends_at IS NOT NULL
       AND s.trial_ends_at < now() + interval '3 days'
     ORDER BY s.trial_ends_at LIMIT 10`);

  // --- whatsapp ------------------------------------------------------------
  const [wa] = await q(`
    SELECT
      (SELECT count(*) FROM events WHERE type = 'seed_announced'
        AND created_at > now() - $1::interval) avisos,
      (SELECT count(*) FROM events WHERE type = 'seed_delivered'
        AND created_at > now() - $1::interval
        AND payload->>'gratuita' = 'true') gratuitas,
      (SELECT count(*) FROM events WHERE type = 'wa_send_failed'
        AND created_at > now() - $1::interval) falhas,
      (SELECT count(*) FROM events WHERE type = 'message_in'
        AND created_at > now() - $1::interval) recebidas,
      (SELECT count(*) FROM events WHERE type = 'seed_planted'
        AND created_at > now() - $1::interval) plantados,
      (SELECT count(*) FROM users
        WHERE wa_last_inbound_at > now() - interval '24 hours') janela_aberta_agora`,
    [janelaSql]);
  const falhasRecentes = await q(`
    SELECT coalesce(u.name,'?') nome, e.payload->>'details' motivo, e.created_at
      FROM events e LEFT JOIN users u ON u.id = e.user_id
     WHERE e.type = 'wa_send_failed' ORDER BY e.id DESC LIMIT 6`);

  // --- conteúdo ------------------------------------------------------------
  const familias = await q(`
    SELECT s.family rotulo, count(*)::int n
      FROM seed_deliveries d JOIN seeds s ON s.id = d.seed_id
     WHERE d.delivered_at > now() - $1::interval
     GROUP BY 1 ORDER BY 2 DESC`, [janelaSql]);
  const tipos = await q(`
    SELECT s.type rotulo, count(*)::int n
      FROM seed_deliveries d JOIN seeds s ON s.id = d.seed_id
     WHERE d.delivered_at > now() - $1::interval
     GROUP BY 1 ORDER BY 2 DESC`, [janelaSql]);
  const topSementes = await q(`
    SELECT s.id, s.reference, s.family, count(*)::int n,
           count(*) FILTER (WHERE d.planted)::int plantadas
      FROM seed_deliveries d JOIN seeds s ON s.id = d.seed_id
     GROUP BY 1, 2, 3 ORDER BY 4 DESC, 1 LIMIT 10`);
  const louvores = await q(`
    SELECT payload->>'titulo' rotulo, count(*)::int n
      FROM events WHERE type = 'musica_aberta' AND payload->>'titulo' IS NOT NULL
     GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
  // "Estoque" = quantas sementes INÉDITAS restam para a pessoa que já viu mais.
  // É o número que diz quando a base de 380 acaba para alguém.
  const [estoque] = await q(`
    SELECT (SELECT count(*) FROM seeds)::int total,
           (SELECT count(*) FROM seeds WHERE gesture IS NOT NULL)::int com_gesto,
           coalesce((SELECT (SELECT count(*) FROM seeds) - count(*)
                       FROM seed_deliveries d GROUP BY d.user_id
                      ORDER BY count(*) DESC LIMIT 1),
                    (SELECT count(*) FROM seeds))::int menor_restante`);

  // --- engajamento ---------------------------------------------------------
  // Quantos DIAS distintos cada pessoa recebeu semente. Num devocional é a
  // medida honesta de hábito: uma pessoa com 12 dias vale mais que doze
  // pessoas com 1 dia, e a média sozinha esconde essa diferença.
  const faixas = [
    { rotulo: 'nenhum dia', teste: (d: number) => d === 0 },
    { rotulo: '1 dia', teste: (d: number) => d === 1 },
    { rotulo: '2 a 3 dias', teste: (d: number) => d >= 2 && d <= 3 },
    { rotulo: '4 a 7 dias', teste: (d: number) => d >= 4 && d <= 7 },
    { rotulo: '8 dias ou mais', teste: (d: number) => d >= 8 },
  ];
  const engajamento = faixas.map((f) => ({
    rotulo: f.rotulo,
    n: pessoas.filter((p: any) => f.teste(num(p.dias_ativos))).length,
  }));

  // --- sistema -------------------------------------------------------------
  const [ultimoDisparo] = await q(`
    SELECT payload->>'window' janela, payload->>'enviadas' enviadas,
           payload->>'falhas' falhas, created_at
      FROM events WHERE type = 'wa_dispatch' ORDER BY id DESC LIMIT 1`);
  const eventosRecentes = await q(`
    SELECT e.type, coalesce(u.name,'—') nome, e.created_at, e.payload
      FROM events e LEFT JOIN users u ON u.id = e.user_id
     ORDER BY e.id DESC LIMIT 40`);

  // Presença de configuração, nunca o valor. Um painel que mostra segredo
  // deixa de ser painel e vira vazamento.
  const config = [
    ['Chave da Anthropic', !!process.env.ANTHROPIC_API_KEY, 'o cérebro emocional depende dela'],
    ['Banco de dados', !!process.env.DATABASE_URL, 'Supabase'],
    ['Credenciais da Meta', metaConfigurada(), 'envio pelo WhatsApp'],
    ['Segredo do webhook', !!process.env.WA_APP_SECRET, 'valida a assinatura das mensagens recebidas'],
    ['Token do webhook', !!process.env.WA_VERIFY_TOKEN, 'handshake da Meta'],
    ['Token do cron', !!process.env.GRAO_API_TOKEN, 'disparo diário pelo GitHub Actions'],
    ['Token do painel', !!process.env.GRAO_ADMIN_TOKEN, 'separado do token do cron'],
    ['URL pública', !!process.env.PUBLIC_BASE_URL, 'imagem do preview do louvor'],
    ['Origens liberadas (CORS)', !!process.env.CORS_ORIGINS, 'sem isso o webapp publicado não conversa com o backend'],
  ].map(([rotulo, ok, nota]) => ({ rotulo, ok, nota }));

  return {
    geradoEm: new Date().toISOString(),
    periodoDias: dias,
    tokenDedicado: !!process.env.GRAO_ADMIN_TOKEN,
    resumo: {
      usuarios: num(resumo.usuarios),
      usuariosPeriodo: num(resumo.usuarios_periodo),
      comWhatsapp: num(resumo.com_whatsapp),
      ativos7d: num(resumo.ativos_7d),
      sementesHoje: num(resumo.sementes_hoje),
      entregas: num(resumo.entregas),
      plantios: num(resumo.plantios),
      taxaPlantio: num(resumo.entregas)
        ? Math.round((num(resumo.plantios) / num(resumo.entregas)) * 100) : 0,
      assinaturas: num(resumo.assinaturas),
    },
    funil,
    serie: serie.map((d: any) => ({
      dia: d.dia,
      novos: num(d.novos), entregas: num(d.entregas), plantios: num(d.plantios),
      ativos: num(d.ativos), mensagens: num(d.mensagens),
    })),
    janelas,
    engajamento,
    planos: {
      linhas: planos.map((p: any) => ({ plan: p.plan, status: p.status, n: p.n })),
      mrrReais: mrrCents / 100,
      trialsTerminando: trialsTerminando.map((t: any) => ({
        nome: t.nome, plan: t.plan, termina: t.trial_ends_at,
      })),
      // A honestidade que o painel precisa carregar: sem gateway ligado,
      // "assinatura" é intenção declarada, não dinheiro entrando.
      cobrancaAtiva: false,
    },
    whatsapp: {
      avisos: num(wa.avisos),
      gratuitas: num(wa.gratuitas),
      falhas: num(wa.falhas),
      recebidas: num(wa.recebidas),
      plantados: num(wa.plantados),
      janelaAbertaAgora: num(wa.janela_aberta_agora),
      custoUnitario: CUSTO_TEMPLATE,
      custoEstimado: Number((num(wa.avisos) * CUSTO_TEMPLATE).toFixed(2)),
      falhasRecentes: falhasRecentes.map((f: any) => ({
        nome: f.nome, motivo: f.motivo, quando: f.created_at,
      })),
    },
    conteudo: {
      familias, tipos, louvores,
      topSementes: topSementes.map((s: any) => ({
        id: s.id, reference: s.reference, family: s.family, n: s.n, plantadas: s.plantadas,
      })),
      estoqueTotal: num(estoque.total),
      comGesto: num(estoque.com_gesto),
      menorRestante: num(estoque.menor_restante),
    },
    pessoas: pessoas.map((p: any) => {
      const parou = ETAPAS.find(({ chave }) => chave !== 'abriu' && !p[chave]);
      const info = JANELA_INFO[p.delivery_window as Janela];
      return {
        nome: p.nome,
        telefone: mascarar(p.phone_e164),
        janela: info?.rotulo ?? null,
        etapa: parou ? parou.rotulo : 'Ciclo completo',
        completo: !parou,
        entregas: num(p.entregas),
        diasAtivos: num(p.dias_ativos),
        familia: p.familia,
        plano: p.plano ? `${p.plano} · ${p.plano_status}` : null,
        criadoEm: p.created_at,
        ultimaAtividade: p.ultima_atividade,
      };
    }),
    sistema: {
      config,
      ultimoDisparo: ultimoDisparo ? {
        janela: JANELA_INFO[ultimoDisparo.janela as Janela]?.rotulo ?? ultimoDisparo.janela,
        enviadas: num(ultimoDisparo.enviadas),
        falhas: num(ultimoDisparo.falhas),
        quando: ultimoDisparo.created_at,
      } : null,
      eventos: eventosRecentes.map((e: any) => ({
        tipo: e.type,
        rotulo: EVENTOS[e.type] ?? e.type,
        nome: e.nome,
        quando: e.created_at,
        detalhe: e.payload?.family || e.payload?.window || e.payload?.titulo
          || e.payload?.plan || e.payload?.seedId || null,
      })),
    },
  };
}

export function registerAdminRoutes(app: Express) {
  // A página em si não traz dado nenhum — só o esqueleto. Quem exige token é o
  // /admin/api/painel, abaixo. Assim o login acontece na própria tela, sem
  // precisar colar o token na URL (onde ele ficaria no histórico do navegador).
  app.get('/admin', (_req: Request, res: Response) => {
    // no-store: a página muda a cada ajuste do painel, e o cache de 7 dias do
    // express.static (que também a serve, em /admin.html) deixaria a versão
    // velha na tela sem explicação.
    res.set('Cache-Control', 'no-store')
      .sendFile(path.resolve('public/admin.html'));
  });

  app.get('/admin/api/painel', exigeAdmin, async (req: Request, res: Response) => {
    // Faixa fechada: um período gigante viraria varredura em cima de
    // generate_series, e nenhuma pergunta do Trial precisa de mais de um ano.
    const bruto = Number(req.query.dias ?? 30);
    const dias = Number.isFinite(bruto) ? Math.min(Math.max(Math.trunc(bruto), 7), 365) : 30;
    try {
      res.set('Cache-Control', 'no-store').json(await montarPainel(dias));
    } catch (err: any) {
      console.error('[admin]', err?.message || err);
      res.status(500).json({ error: 'Falha ao montar o painel.', detalhe: err?.message });
    }
  });
}
