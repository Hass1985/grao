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
import { timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';
import { BASE_URL, horarioCurto } from './whatsapp.js';
import { metaConfigurada } from './meta.js';
import { TEM_ACESSO_SQL } from './acesso.js';

const TZ = 'America/Sao_Paulo';

/**
 * Preço unitário estimado do template Marketing no Brasil, em reais.
 *
 * Fica em variável de ambiente porque a Meta remarca por país e por período, e
 * um número cravado no código envelhece calado. O painel mostra o valor usado
 * junto do resultado, para o número nunca aparecer como se fosse fatura.
 */
const CUSTO_TEMPLATE = Number(process.env.WA_CUSTO_TEMPLATE_BRL ?? 0.35);

/**
 * Só o cabeçalho, só o GRAO_ADMIN_TOKEN, e comparação de tempo constante.
 *
 * Três coisas mudaram aqui, cada uma por um motivo:
 *
 *  1. `?token=` saiu. Um token na query string fica no log do Render, no
 *     histórico do navegador e no cabeçalho Referer de qualquer link clicado a
 *     partir da página. O painel já manda por cabeçalho — isto era só um resto.
 *
 *  2. A queda para GRAO_API_TOKEN saiu. Aquele token é do orquestrador externo
 *     que dispara /whatsapp/*: ele existe para uma máquina falar com outra, e
 *     não devia abrir a tela que lista pessoas, telefones e sinais de risco.
 *     Dois poderes diferentes, dois segredos diferentes.
 *
 *  3. A comparação virou timingSafeEqual. Comparar string com !== vaza o
 *     tamanho e o prefixo pelo tempo de resposta. É um ataque de laboratório na
 *     internet, mas o conserto custa quatro linhas.
 */
function exigeAdmin(req: Request, res: Response, next: NextFunction) {
  const esperado = process.env.GRAO_ADMIN_TOKEN;
  if (!esperado) return res.status(503).json({ error: 'GRAO_ADMIN_TOKEN não configurado' });
  const recebido = req.header('x-grao-token') ?? '';
  if (!igualEmTempoConstante(recebido, esperado)) {
    return res.status(401).json({ error: 'token inválido' });
  }
  next();
}

function igualEmTempoConstante(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  // timingSafeEqual exige o mesmo tamanho. Comparar o tamanho antes já vaza um
  // bit, e não tem jeito de esconder isso — o que importa é não vazar o
  // conteúdo, byte a byte, que é o que daria para explorar.
  return A.length === B.length && timingSafeEqual(A, B);
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
  brain_failed: '⚠ o cérebro falhou',
  devocional_lido: 'leu o devocional do dia',
  risco_detectado: '⚠ SINAL DE RISCO EMOCIONAL',
  memoria_guardada: 'o Grão guardou algo da vida dela',
  assinatura_criada: 'assinou',
  assinatura_cancelada: 'cancelou a assinatura',
  cobranca_avisada: 'foi avisada da cobrança de amanhã',
  pagamento_evento: 'evento de pagamento',
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
      (SELECT count(*) FROM subscriptions WHERE status IN ('trial','ativa')) assinaturas,
      (SELECT count(*) FROM subscriptions s WHERE ${TEM_ACESSO_SQL('s')}) acesso_completo,
      -- Atraso da entrega: a distância entre o horário que a pessoa escolheu e
      -- o minuto em que a mensagem saiu. É a métrica que traduz "o serviço
      -- estava de pé?" em um número que alguém olha todo dia. Enquanto o Render
      -- hibernava, ela ficava em 85 a 137 minutos; com o processo vivo, em 1.
      (SELECT round(avg(extract(epoch from (
                (d.sent_wa_at AT TIME ZONE u.timezone)::time - u.delivery_time))/60))
         FROM seed_deliveries d JOIN users u ON u.id = d.user_id
        WHERE d.sent_wa_at > now() - $1::interval
          AND u.delivery_time IS NOT NULL
          AND (d.sent_wa_at AT TIME ZONE u.timezone)::time >= u.delivery_time) atraso_medio,
      (SELECT round(max(extract(epoch from (
                (d.sent_wa_at AT TIME ZONE u.timezone)::time - u.delivery_time))/60))
         FROM seed_deliveries d JOIN users u ON u.id = d.user_id
        WHERE d.sent_wa_at > now() - $1::interval
          AND u.delivery_time IS NOT NULL
          AND (d.sent_wa_at AT TIME ZONE u.timezone)::time >= u.delivery_time) atraso_pior`,
    [janelaSql]);

  // --- pessoas, e o funil que sai delas ------------------------------------
  // Uma linha por pessoa com as etapas cumpridas; a soma vira o funil. Poderia
  // ser um COUNT por etapa, mas assim o mesmo SELECT alimenta a lista de
  // pessoas, e as duas visões nunca discordam.
  const pessoas = await q(`
    SELECT u.id, coalesce(u.name,'(sem nome)') nome, u.phone_e164,
           u.delivery_time::text delivery_time, u.created_at,
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

  // --- horários de entrega -------------------------------------------------
  // Agrupado por HORA, não pelo horário exato: com o horário livre, 250 pessoas
  // produzem dezenas de valores distintos e a lista deixa de responder a única
  // pergunta que importa aqui — em que parte do dia essa gente quer a semente.
  // O horário exato de cada pessoa aparece na seção Pessoas.
  const horarios = await q(`
    SELECT to_char(date_trunc('hour', delivery_time), 'HH24') || 'h' rotulo,
           count(*)::int n
      FROM users WHERE wa_opt_in_at IS NOT NULL
     GROUP BY date_trunc('hour', delivery_time)
     ORDER BY date_trunc('hour', delivery_time)`);

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
  // Falha do cérebro: a pergunta que o painel não sabia responder no dia em que
  // a chave da Anthropic ficou sem saldo. Sem isto, "a leitura emocional parou"
  // só aparece semanas depois, como "as sementes estão repetindo".
  // Risco emocional: o dado que precisa aparecer antes de qualquer métrica.
  // Se alguém escreveu que não aguenta mais, isso importa mais que o funil.
  const riscos = await q(`
    SELECT e.payload->>'nivel' nivel, e.payload->>'origem' origem,
           coalesce(u.name, '(sem nome)') nome, e.created_at
      FROM events e LEFT JOIN u_ren u ON u.id = e.user_id
     WHERE e.type = 'risco_detectado'
     ORDER BY e.id DESC LIMIT 20`.replace('u_ren', 'users'));

  const [falhaCerebro] = await q(`
    SELECT payload->>'onde' onde, payload->>'motivo' motivo,
           (payload->>'semSaldo')::boolean sem_saldo, created_at
      FROM events WHERE type = 'brain_failed' ORDER BY id DESC LIMIT 1`);
  const [leitura] = await q(`
    SELECT max(created_at) ultima, count(*)::int n FROM emotional_readings`);

  // --- a curadoria: ela está escolhendo, e está acertando? -----------------
  //
  // Duas perguntas diferentes e as duas importam. A primeira é mecânica: o
  // modelo respondeu, ou a entrega caiu na primeira candidata? A segunda é a
  // que decide se a curadoria vale o que custa: a pessoa disse que a semente
  // falou com ela?
  const [curadoria] = await q(`
    SELECT count(*)::int total,
           count(*) FILTER (WHERE (payload->>'porCuradoria')::boolean)::int por_modelo,
           avg((payload->>'confianca')::int) FILTER
             (WHERE (payload->>'porCuradoria')::boolean)::int confianca
      FROM events
     WHERE type = 'curadoria' AND created_at > now() - $1::interval`, [janelaSql]);

  const [avaliacao] = await q(`
    SELECT count(*)::int total,
           count(*) FILTER (WHERE util)::int falou
      FROM seed_feedback WHERE criado_em > now() - $1::interval`, [janelaSql]);

  const escolhasRecentes = await q(`
    SELECT e.payload->>'escolhida' semente, e.payload->>'familia' familia,
           e.payload->>'porque' porque, (e.payload->>'confianca')::int confianca,
           (e.payload->>'candidatas')::int candidatas,
           coalesce(u.name, '—') nome, e.created_at,
           (SELECT f.util FROM seed_feedback f
             WHERE f.user_id = e.user_id AND f.seed_id = e.payload->>'escolhida') util
      FROM events e LEFT JOIN users u ON u.id = e.user_id
     WHERE e.type = 'curadoria' AND e.payload->>'porque' IS NOT NULL
     ORDER BY e.id DESC LIMIT 12`);

  const [ultimoDisparo] = await q(`
    SELECT payload->>'enviadas' enviadas, payload->>'falhas' falhas,
           coalesce(payload->>'origem', 'cron') origem, created_at
      FROM events WHERE type = 'wa_dispatch' ORDER BY id DESC LIMIT 1`);
  const eventosRecentes = await q(`
    SELECT e.type, coalesce(u.name,'—') nome, e.created_at, e.payload
      FROM events e LEFT JOIN users u ON u.id = e.user_id
     ORDER BY e.id DESC LIMIT 40`);

  // Presença de configuração, nunca o valor. Um painel que mostra segredo
  // deixa de ser painel e vira vazamento.
  //
  // Três estados, não dois. Nem toda variável ausente é problema: PUBLIC_BASE_URL
  // tem um padrão no código que hoje aponta para o lugar certo, e marcá-la em
  // vermelho ao lado de um segredo que falta de verdade manda a pessoa caçar um
  // problema que não existe — foi exatamente o que aconteceu. 'padrao' é para
  // isso: funciona, mas está implícito.
  const estado = (v: boolean) => (v ? 'ok' : 'faltando');
  const config = [
    ['Chave da Anthropic', estado(!!process.env.ANTHROPIC_API_KEY), 'o cérebro emocional depende dela'],
    ['Banco de dados', estado(!!process.env.DATABASE_URL), 'Supabase'],
    ['Credenciais da Meta', estado(metaConfigurada()), 'envio pelo WhatsApp'],
    ['Segredo do webhook', estado(!!process.env.WA_APP_SECRET), 'valida a assinatura das mensagens recebidas'],
    ['Token do webhook', estado(!!process.env.WA_VERIFY_TOKEN), 'handshake da Meta'],
    ['Token do cron', estado(!!process.env.GRAO_API_TOKEN), 'disparo diário pelo GitHub Actions'],
    ['Token do painel', process.env.GRAO_ADMIN_TOKEN ? 'ok' : 'padrao',
      process.env.GRAO_ADMIN_TOKEN ? 'separado do token do cron' : 'usando o token do cron — melhor separar'],
    ['Template diário', process.env.WA_TEMPLATE_NAME ? 'ok' : 'padrao',
      process.env.WA_TEMPLATE_NAME || 'semente_do_dia (nome padrão do código)'],
    ['Transcrição de áudio', estado(!!process.env.STT_API_KEY),
      process.env.STT_API_KEY
        ? 'o botão de troca aceita áudio'
        : 'sem chave: a troca de sentimento só aceita texto'],
    ['Chave do Asaas', estado(!!process.env.ASAAS_API_KEY),
      process.env.ASAAS_API_KEY?.includes('_hmlg_')
        ? 'SANDBOX, não cobra de verdade'
        : process.env.ASAAS_API_KEY ? 'PRODUÇÃO, cobranças reais' : 'cobrança por Pix'],
    ['Token do webhook de pagamento', estado(!!process.env.ASAAS_WEBHOOK_TOKEN),
      'prova que o webhook veio mesmo do Asaas'],
    ['Contas (Supabase)', estado(!!process.env.SUPABASE_URL), 'login por Google e e-mail'],
    ['URL pública', process.env.PUBLIC_BASE_URL ? 'ok' : 'padrao',
      `imagem do preview do louvor · em uso: ${BASE_URL()}`],
    ['Origens liberadas (CORS)', process.env.CORS_ORIGINS ? 'ok' : 'aberto',
      process.env.CORS_ORIGINS
        ? `${process.env.CORS_ORIGINS.split(',').length} origem(ns) na lista`
        : 'sem lista, qualquer site pode chamar a API'],
  ].map(([rotulo, situacao, nota]) => ({ rotulo, situacao, nota }));

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
      acessoCompleto: num(resumo.acesso_completo),
      atrasoMedioMin: resumo.atraso_medio === null ? null : num(resumo.atraso_medio),
      atrasoPiorMin: resumo.atraso_pior === null ? null : num(resumo.atraso_pior),
    },
    funil,
    serie: serie.map((d: any) => ({
      dia: d.dia,
      novos: num(d.novos), entregas: num(d.entregas), plantios: num(d.plantios),
      ativos: num(d.ativos), mensagens: num(d.mensagens),
    })),
    horarios,
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
      return {
        nome: p.nome,
        telefone: mascarar(p.phone_e164),
        horario: horarioCurto(p.delivery_time),
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
      riscos: riscos.map((r: any) => ({
        nivel: r.nivel, origem: r.origem, nome: r.nome, quando: r.created_at,
      })),
      curadoria: {
        entregas: num(curadoria?.total),
        porModelo: num(curadoria?.por_modelo),
        confiancaMedia: curadoria?.confianca ?? null,
        avaliadas: num(avaliacao?.total),
        falaram: num(avaliacao?.falou),
        escolhas: escolhasRecentes.map((e: any) => ({
          semente: e.semente, familia: e.familia, porque: e.porque,
          confianca: e.confianca, candidatas: e.candidatas,
          nome: e.nome, quando: e.created_at, util: e.util,
        })),
      },
      cerebro: {
        ultimaLeitura: leitura?.ultima ?? null,
        leituras: num(leitura?.n),
        ultimaFalha: falhaCerebro ? {
          onde: falhaCerebro.onde,
          motivo: falhaCerebro.motivo,
          semSaldo: !!falhaCerebro.sem_saldo,
          quando: falhaCerebro.created_at,
        } : null,
      },
      ultimoDisparo: ultimoDisparo ? {
        origem: ultimoDisparo.origem,
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
