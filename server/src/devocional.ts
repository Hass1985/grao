// O devocional anual: o que o plano gratuito entrega.
//
// São dois produtos diferentes debaixo do mesmo app, e a distinção importa:
//
//  - DEVOCIONAL (grátis): 365 páginas fixas, uma por data. Igual para todo
//    mundo, sem motor, sem leitura emocional, sem histórico. A pessoa abre na
//    data de hoje e lê o dia dela. Custa zero de API.
//
//  - SEMENTE (assinante): escolhida pelo motor a partir do momento emocional
//    da pessoa, entregue no WhatsApp, com oração, prática e louvor.
//
// O gratuito não é uma versão capada da semente: é um material inteiro, com
// começo, meio e fim. Isso muda o que a assinatura vende — não é "desbloquear
// o resto", é passar de um livro para alguém que te acompanha.

import { pool } from './db.js';

export interface DiaDevocional {
  tipo: 'devocional';
  data: string;          // "2026-09-04", no fuso da pessoa
  title: string;
  body: string;
  verse: string;
  reference: string;
}

/**
 * O dia de hoje, no fuso da pessoa.
 *
 * O fuso não é detalhe: quem lê às 23h em Manaus e quem lê à mesma hora em
 * São Paulo estão em dias civis diferentes, e o devocional é indexado por
 * data. Sem isto, uma das duas leria a página de ontem.
 *
 * Usuário desconhecido cai no fuso de Brasília em vez de falhar: o devocional
 * é público por natureza, e não faz sentido exigir cadastro para ler a página
 * do dia.
 */
export async function devocionalDeHoje(userId?: string | null): Promise<DiaDevocional | null> {
  const { rows: [r] } = await pool.query(
    `WITH fuso AS (
       SELECT coalesce(
         (SELECT timezone FROM users WHERE id = $1), 'America/Sao_Paulo') tz
     ),
     hoje AS (SELECT (now() AT TIME ZONE (SELECT tz FROM fuso))::date d)
     SELECT v.title, v.body, v.verse, v.reference, (SELECT d FROM hoje)::text data
       FROM devotionals v, hoje
      WHERE v.month = extract(month from hoje.d)::int
        AND v.day = extract(day from hoje.d)::int`,
    [userId ?? null]);

  return r ? { tipo: 'devocional', ...r } : null;
}

/**
 * Os dias já passados do ano, para as telas de histórico.
 *
 * Sem isto o Campo e a Raiz ficariam vazios para quem é gratuito, já que essas
 * telas leem entregas do motor e o gratuito não tem nenhuma. Aqui o histórico
 * é o próprio calendário: as páginas que já vieram até hoje.
 */
export async function devocionaisAte(
  userId: string | null,
  limite: number,
): Promise<(DiaDevocional & { planted: boolean })[]> {
  const { rows } = await pool.query(
    `WITH fuso AS (
       SELECT coalesce(
         (SELECT timezone FROM users WHERE id = $1), 'America/Sao_Paulo') tz
     ),
     hoje AS (SELECT (now() AT TIME ZONE (SELECT tz FROM fuso))::date d),
     -- Os últimos N dias corridos a partir de hoje, para trás. generate_series
     -- resolve a virada de ano sozinho: 2 de janeiro devolve 31 de dezembro.
     dias AS (
       SELECT generate_series((SELECT d FROM hoje) - ($2::int - 1),
                              (SELECT d FROM hoje), interval '1 day')::date d
     )
     SELECT dias.d::text data, v.title, v.body, v.verse, v.reference
       FROM dias
       JOIN devotionals v
         ON v.month = extract(month from dias.d)::int
        AND v.day = extract(day from dias.d)::int
      ORDER BY dias.d DESC`,
    [userId ?? null, Math.min(Math.max(limite, 1), 366)]);

  return rows.map((r: any) => ({ tipo: 'devocional' as const, ...r, planted: false }));
}

/**
 * O endereço que vai no fim de todo texto compartilhado.
 *
 * O apex graoapp.com.br não resolve hoje (só o www), e um link quebrado num
 * compartilhamento é pior que nenhum link: a pessoa que recebeu tenta abrir,
 * não abre, e a impressão que fica é do Grão, não do DNS. Em variável de
 * ambiente para arrumar o dia em que o apex subir, sem publicar app de novo.
 */
const SITE = () => (process.env.GRAO_SITE_URL || 'https://www.graoapp.com.br').replace(/\/+$/, '');

/**
 * O texto que a pessoa manda para alguém.
 *
 * Montado no SERVIDOR de propósito. O compartilhamento é o canal de aquisição
 * mais barato que existe aqui, e ele evolui: muda o convite, muda o link,
 * entra uma campanha. Se o texto morasse no app, cada ajuste desses exigiria
 * publicar uma versão nova e esperar todo mundo atualizar.
 *
 * Ordem deliberada: a âncora bíblica primeiro. É ela que a pessoa quer mandar
 * para alguém, e é o que aparece na prévia de uma mensagem antes de abrir.
 */
export function textoCompartilhavel(d: {
  title: string; body: string; verse: string; reference: string;
}): string {
  // A semente não tem título; filtrar o vazio evita uma linha em branco solta
  // no meio da mensagem, que num WhatsApp parece texto cortado.
  return [
    `"${d.verse}"`,
    d.reference,
    '',
    d.title,
    d.body,
    '',
    'De Grão em Grão, devocional diário',
    SITE(),
  ].filter((l, i, todas) => l !== '' || todas[i - 1] !== '').join('\n');
}
