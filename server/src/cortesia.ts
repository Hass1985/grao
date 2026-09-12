// Acesso completo por identidade.
//
// A cortesia é uma situação de assinatura como outra qualquer — aparece no
// painel, tem registro, e o resto do sistema não sabe que ela existe. A única
// diferença é como ela chega: em vez de vir de um pagamento, vem de uma lista
// de e-mails e telefones que o time mantém pelo `npm run cortesia`.
//
// Ela é aplicada no momento em que a pessoa vincula a conta, que é o único
// instante em que o servidor sabe, ao mesmo tempo, quem ela é (e-mail e
// telefone do token) e qual cadastro é dela depois das fusões. Aplicar antes
// seria aplicar no cadastro errado.

import { pool, logEvent } from './db.js';
import { normalizePhone } from './telefone.js';

/** Preço registrado junto com a cortesia, só para o painel somar direito. */
const PRECO_PLANTIO = 1990;

export interface Identidade {
  email?: string | null;
  telefone?: string | null;
}

/** E-mail vira minúsculo, telefone vira E.164. Guardar e buscar pelo mesmo formato. */
export function normalizarIdentificador(
  bruto: string,
): { identificador: string; tipo: 'email' | 'telefone' } | null {
  const v = bruto.trim();
  if (!v) return null;
  if (v.includes('@')) {
    const email = v.toLowerCase();
    return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) ? { identificador: email, tipo: 'email' } : null;
  }
  const fone = normalizePhone(v);
  return fone ? { identificador: fone, tipo: 'telefone' } : null;
}

/**
 * Confere a lista e libera, se a pessoa estiver nela.
 *
 * Devolve `null` quando não há cortesia — o caminho de longe mais comum, e por
 * isso a consulta é uma só, com os dois identificadores de uma vez.
 *
 * Nunca sobrescreve uma assinatura ATIVA: quem paga de verdade continua
 * pagante no nosso registro e no do Asaas. Rebaixar um pagante para cortesia
 * desligaria a conciliação com o gateway e a cobrança seguiria correndo por
 * fora, invisível para nós.
 */
export async function aplicarCortesias(
  userId: string,
  identidade: Identidade,
): Promise<{ aplicada: boolean; semPrazo: boolean; terminaEm: string | null } | null> {
  const chaves = [
    identidade.email ? identidade.email.trim().toLowerCase() : null,
    identidade.telefone ? normalizePhone(identidade.telefone) : null,
  ].filter(Boolean) as string[];
  if (!chaves.length) return null;

  // Quem não tem prazo vence primeiro na ordenação: se a pessoa está na lista
  // duas vezes (pelo e-mail com prazo e pelo telefone sem), vale a mais generosa.
  // `NOT pausada` é o que faz a pausa existir de verdade: esta função roda a
  // cada login, então sem o filtro o acesso completo voltaria sozinho na
  // próxima vez que a pessoa entrasse.
  const { rows: [c] } = await pool.query(
    `SELECT identificador, dias, nota
       FROM cortesias
      WHERE identificador = ANY($1::text[])
        AND NOT pausada
      ORDER BY dias IS NULL DESC, dias DESC
      LIMIT 1`,
    [chaves]);
  if (!c) return null;

  const { rows: [atual] } = await pool.query(
    `SELECT status FROM subscriptions WHERE user_id = $1`, [userId]);
  if (atual?.status === 'ativa') return null;

  const { rows: [s] } = await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, price_cents, trial_ends_at)
          VALUES ($1, 'plantio', 'cortesia', $2,
                  CASE WHEN $3::int IS NULL THEN NULL
                       ELSE now() + ($3::int * interval '1 day') END)
     ON CONFLICT (user_id) DO UPDATE
            SET status = 'cortesia',
                trial_ends_at = CASE WHEN $3::int IS NULL THEN NULL
                                     ELSE now() + ($3::int * interval '1 day') END,
                updated_at = now()
     RETURNING trial_ends_at`,
    [userId, PRECO_PLANTIO, c.dias]);

  await pool.query(
    `UPDATE cortesias SET aplicada_em = now(), user_id = $2 WHERE identificador = $1`,
    [c.identificador, userId]);

  void logEvent(userId, 'cortesia_aplicada', { por: c.identificador, nota: c.nota, dias: c.dias });

  return {
    aplicada: true,
    semPrazo: c.dias === null,
    terminaEm: s?.trial_ends_at ?? null,
  };
}
