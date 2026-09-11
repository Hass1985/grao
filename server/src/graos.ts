// Os grãos e a escada.
//
// Duas coisas diferentes, de propósito, fazendo dois trabalhos diferentes:
//
//   GRÃOS  são o retorno imediato. Confirmou a leitura, ganhou. Disse se a
//          semente falou, ganhou. Servem para a pessoa VER que caminhar com o
//          app acumula alguma coisa — e um dia serão trocados na Loja.
//
//   NÍVEL  é o arco longo: Broto, Muda, Árvore, Semeador. Conta DIAS VIVIDOS,
//          não grãos, porque "um ano" significa alguma coisa e "2.000 pontos"
//          não significa nada.
//
// A regra que atravessa tudo: recompensar o que a pessoa viveu, nunca pontuá-la.
// Por isso nada aqui subtrai, nada expira e nada cai. Nível que se perde por
// pausa puniria alguém exatamente na semana em que ela mais precisou faltar —
// e é justo aí que um devocional não pode virar cobrança.

import { pool, logEvent } from './db.js';

/** Quanto vale cada gesto. Números redondos: a pessoa precisa conseguir contar de cabeça. */
export const GANHO = {
  leitura: 10,      // confirmar a leitura do devocional do dia
  sequencia: 5,     // bônus por emendar no dia anterior
  semente: 10,      // plantar a semente (assinante)
  avaliacao: 2,     // dizer se a semente falou — barato porque é pedido nosso
  resposta: 8,      // escrever o que a semente mexeu: é o gesto que alimenta a memória
  indicacao: 50,    // alguém entrou pelo seu convite e ficou
} as const;

export interface Nivel {
  id: string;
  nome: string;
  dias: number;
  graos: number;    // bônus ao alcançar
}

/**
 * A escada. Os três primeiros são plantas; o último é uma PESSOA — a virada de
 * quem recebe para quem semeia, e o nível de quem indica.
 */
export const NIVEIS: Nivel[] = [
  { id: 'broto', nome: 'Broto', dias: 7, graos: 50 },
  { id: 'muda', nome: 'Muda', dias: 30, graos: 200 },
  { id: 'arvore', nome: 'Árvore', dias: 100, graos: 500 },
  { id: 'semeador', nome: 'Semeador', dias: 365, graos: 2000 },
];

/**
 * Credita grãos. Repetir a mesma referência não credita de novo.
 *
 * Devolve quanto FOI creditado — zero quando já existia. Quem chama usa isso
 * para não anunciar na tela um ganho que não aconteceu.
 */
export async function creditar(
  userId: string,
  quantidade: number,
  motivo: string,
  referencia?: string | null,
): Promise<number> {
  if (quantidade <= 0) return 0;
  const { rowCount } = await pool.query(
    `INSERT INTO graos (user_id, quantidade, motivo, referencia)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, motivo, referencia) WHERE referencia IS NOT NULL
     DO NOTHING`,
    [userId, quantidade, motivo, referencia ?? null]);
  return rowCount ? quantidade : 0;
}

export interface ResumoGraos {
  saldo: number;
  diasVividos: number;      // dias distintos com leitura confirmada ou semente plantada
  acumulado: number;        // dias vividos + dias seguidos (a sequência conta dobrado)
  sequencia: number;
  nivel: Nivel | null;
  proximo: Nivel | null;
  faltam: number;           // quanto falta de acumulado para o próximo
}

/**
 * O acumulado que move a escada.
 *
 * Dia vivido é dia com leitura confirmada (gratuito) OU semente plantada
 * (assinante) — os dois planos sobem, senão o nível vira vitrine do que a
 * pessoa não tem.
 *
 * A sequência não é um contador à parte: cada dia que emenda no anterior é
 * contado DUAS vezes no acumulado. Quem caminha todo dia chega ao topo em
 * metade do tempo de quem caminha dia sim, dia não — sem que faltar tire nada
 * de ninguém.
 */
async function diasDaEscada(userId: string) {
  const { rows: [r] } = await pool.query(
    `WITH fuso AS (
       SELECT coalesce((SELECT timezone FROM users WHERE id = $1), 'America/Sao_Paulo') tz
     ),
     dias AS (
       SELECT DISTINCT d FROM (
         SELECT data d FROM devotional_reads WHERE user_id = $1
         UNION
         SELECT (e.delivered_at AT TIME ZONE (SELECT tz FROM fuso))::date
           FROM seed_deliveries e
          WHERE e.user_id = $1 AND e.planted
       ) t
     )
     SELECT count(*)::int total,
            count(*) FILTER (
              WHERE EXISTS (SELECT 1 FROM dias b WHERE b.d = dias.d - 1)
            )::int emendados
       FROM dias`,
    [userId]);
  const total = r?.total ?? 0;
  const emendados = r?.emendados ?? 0;
  return { total, acumulado: total + emendados };
}

/** Sequência atual: dias seguidos até hoje, ou até ontem se hoje ainda não veio. */
async function sequenciaAtual(userId: string): Promise<number> {
  const { rows: [r] } = await pool.query(
    `WITH fuso AS (
       SELECT coalesce((SELECT timezone FROM users WHERE id = $1), 'America/Sao_Paulo') tz
     ),
     hoje AS (SELECT (now() AT TIME ZONE (SELECT tz FROM fuso))::date d),
     dias AS (
       SELECT DISTINCT d FROM (
         SELECT data d FROM devotional_reads WHERE user_id = $1
         UNION
         SELECT (e.delivered_at AT TIME ZONE (SELECT tz FROM fuso))::date
           FROM seed_deliveries e WHERE e.user_id = $1 AND e.planted
       ) t
     ),
     ilhas AS (
       SELECT d, d - (row_number() OVER (ORDER BY d))::int grupo FROM dias
     ),
     blocos AS (SELECT grupo, count(*)::int n, max(d) fim FROM ilhas GROUP BY grupo)
     SELECT coalesce((SELECT n FROM blocos
                       WHERE fim >= (SELECT d FROM hoje) - 1
                       ORDER BY fim DESC LIMIT 1), 0) sequencia`,
    [userId]);
  return r?.sequencia ?? 0;
}

/**
 * O retrato completo, e o único lugar que credita o bônus de marco.
 *
 * Creditar aqui, e não no momento em que o dia é confirmado, deixa o sistema
 * se consertar sozinho: se um crédito falhar por rede ou reinício, a próxima
 * abertura da tela repõe. A chave única impede que reponha duas vezes.
 */
export async function resumoDeGraos(userId: string): Promise<ResumoGraos> {
  const [{ total, acumulado }, sequencia] = await Promise.all([
    diasDaEscada(userId),
    sequenciaAtual(userId),
  ]);

  const alcancados = NIVEIS.filter((n) => acumulado >= n.dias);
  const nivel = alcancados.length ? alcancados[alcancados.length - 1] : null;
  const proximo = NIVEIS.find((n) => acumulado < n.dias) ?? null;

  for (const n of alcancados) {
    const creditado = await creditar(userId, n.graos, 'marco', n.id);
    if (creditado) void logEvent(userId, 'nivel_alcancado', { nivel: n.id, dias: n.dias, graos: n.graos });
  }

  const { rows: [s] } = await pool.query(
    `SELECT coalesce(sum(quantidade), 0)::int saldo FROM graos WHERE user_id = $1`, [userId]);

  return {
    saldo: s?.saldo ?? 0,
    diasVividos: total,
    acumulado,
    sequencia,
    nivel,
    proximo,
    faltam: proximo ? Math.max(0, proximo.dias - acumulado) : 0,
  };
}

/**
 * Credita a leitura do dia, com o bônus de sequência quando emenda no anterior.
 * Devolve quanto entrou de fato — zero se o dia já estava creditado.
 */
export async function creditarLeitura(
  userId: string,
  data: string,
  emendou: boolean,
): Promise<number> {
  const base = await creditar(userId, GANHO.leitura, 'leitura', data);
  const bonus = emendou ? await creditar(userId, GANHO.sequencia, 'sequencia', data) : 0;
  return base + bonus;
}

/** Extrato recente, para a tela explicar de onde veio cada grão. */
export async function extratoDeGraos(userId: string, limite = 12) {
  const { rows } = await pool.query(
    `SELECT quantidade, motivo, referencia, criado_em
       FROM graos WHERE user_id = $1 ORDER BY id DESC LIMIT $2`,
    [userId, Math.min(Math.max(limite, 1), 50)]);
  return rows;
}
