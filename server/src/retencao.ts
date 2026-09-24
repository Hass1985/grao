// Retenção: o que o Grão esquece, e quando.
//
// Até aqui nada expirava. Não por decisão, por omissão — e omissão em dado
// pessoal sensível é uma decisão tomada por inércia. A LGPD pede que se guarde
// o necessário pelo tempo necessário, e "para sempre" nunca é a resposta para
// o pedaço de fala que acionou um detector de risco.
//
// O CRITÉRIO
//
// Cada coisa fica pelo tempo que ela SERVE para alguma coisa, e sai quando
// vira só acervo:
//
//   o trecho do risco     30 dias   existe para alguém agir agora. Passado o
//                                   mês, é a frase mais delicada que aquela
//                                   pessoa já nos disse, guardada sem uso
//   a fala e a leitura    1 ano     é a matéria-prima das memórias. Depois de
//                                   destilada em user_memories, o bruto pesa
//                                   mais do que serve
//   a trilha de uso       180 dias  o painel olha 30 dias; o resto é histórico
//
// O QUE NÃO SAI NUNCA
//
//   respostas          o diário é dela, e o produto promete que dá para reler
//   seed_deliveries    é o Campo — apagar seria apagar o que ela plantou
//   user_memories      é o que faz o Grão lembrar; é o produto
//   devotional_reads   é a sequência de dias vividos
//
// Do risco, o EVENTO fica para sempre e só o `trecho` sai. O painel continua
// contando quantos sinais houve e quando; o que deixa de existir é a frase.

import { pool, logEvent } from './db.js';

const dias = (nome: string, padrao: number) => {
  const v = Number(process.env[nome]);
  return Number.isFinite(v) && v > 0 ? Math.trunc(v) : padrao;
};

export const PRAZOS = {
  trechoDeRisco: () => dias('RETENCAO_TRECHO_DIAS', 30),
  fala: () => dias('RETENCAO_FALA_DIAS', 365),
  leitura: () => dias('RETENCAO_LEITURA_DIAS', 365),
  trilha: () => dias('RETENCAO_EVENTOS_DIAS', 180),
};

export interface Faxina {
  trechosApagados: number;
  falasApagadas: number;
  leiturasApagadas: number;
  eventosApagados: number;
}

/**
 * `ensaio` conta o que sairia sem apagar nada. É o modo do script; a agenda
 * chama com false.
 */
export async function passarAFaxina(ensaio = false): Promise<Faxina> {
  const r: Faxina = {
    trechosApagados: 0, falasApagadas: 0, leiturasApagadas: 0, eventosApagados: 0,
  };

  // 1. O trecho do risco. O evento permanece; só o campo some.
  //
  // `- 'trecho'` remove a chave do jsonb. Guardar `trecho: null` diria "não
  // havia trecho", que é diferente de "havia e nós apagamos" — e a segunda é
  // a verdade.
  {
    const sql = ensaio
      ? `SELECT count(*)::int n FROM events
          WHERE type = 'risco_detectado' AND payload ? 'trecho'
            AND created_at < now() - ($1 || ' days')::interval`
      : `WITH alvo AS (
           SELECT id FROM events
            WHERE type = 'risco_detectado' AND payload ? 'trecho'
              AND created_at < now() - ($1 || ' days')::interval)
         UPDATE events e SET payload = (e.payload - 'trecho') || '{"trecho_expirado": true}'::jsonb
           FROM alvo WHERE e.id = alvo.id
         RETURNING 1`;
    const q = await pool.query(sql, [PRAZOS.trechoDeRisco()]);
    r.trechosApagados = ensaio ? q.rows[0].n : q.rowCount ?? 0;
  }

  // 2. O que a pessoa falou.
  {
    const sql = ensaio
      ? `SELECT count(*)::int n FROM conversation_turns
          WHERE created_at < now() - ($1 || ' days')::interval`
      : `DELETE FROM conversation_turns
          WHERE created_at < now() - ($1 || ' days')::interval RETURNING 1`;
    const q = await pool.query(sql, [PRAZOS.fala()]);
    r.falasApagadas = ensaio ? q.rows[0].n : q.rowCount ?? 0;
  }

  // 3. As leituras emocionais.
  {
    const sql = ensaio
      ? `SELECT count(*)::int n FROM emotional_readings
          WHERE created_at < now() - ($1 || ' days')::interval`
      : `DELETE FROM emotional_readings
          WHERE created_at < now() - ($1 || ' days')::interval RETURNING 1`;
    const q = await pool.query(sql, [PRAZOS.leitura()]);
    r.leiturasApagadas = ensaio ? q.rows[0].n : q.rowCount ?? 0;
  }

  // 4. A trilha de uso — menos o risco, que tem regra própria acima e fica.
  {
    const sql = ensaio
      ? `SELECT count(*)::int n FROM events
          WHERE type <> 'risco_detectado'
            AND created_at < now() - ($1 || ' days')::interval`
      : `DELETE FROM events
          WHERE type <> 'risco_detectado'
            AND created_at < now() - ($1 || ' days')::interval RETURNING 1`;
    const q = await pool.query(sql, [PRAZOS.trilha()]);
    r.eventosApagados = ensaio ? q.rows[0].n : q.rowCount ?? 0;
  }

  return r;
}

/**
 * Uma faxina por dia, chamada pela agenda.
 *
 * Só registra evento quando apagou alguma coisa. Uma linha por dia dizendo
 * "nada a fazer" durante o primeiro ano do produto afogaria o log justamente
 * onde alguém procuraria por problema.
 */
export async function faxinaDiaria(): Promise<void> {
  try {
    const r = await passarAFaxina(false);
    const total = r.trechosApagados + r.falasApagadas + r.leiturasApagadas + r.eventosApagados;
    if (!total) return;
    console.log(`[retencao] ${r.trechosApagados} trechos · ${r.falasApagadas} falas · ` +
      `${r.leiturasApagadas} leituras · ${r.eventosApagados} eventos`);
    // user_id null: é faxina do sistema, não de uma pessoa.
    void logEvent(null as any, 'retencao_aplicada', r as any).catch(() => {});
  } catch (e: any) {
    console.error('[retencao] falhou:', e?.message || e);
  }
}
