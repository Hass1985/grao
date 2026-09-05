// Quem tem acesso completo, e o que sobra para quem não tem.
//
// O modelo: no gratuito a pessoa lê o versículo e a reflexão. Oração, prática
// e louvor são a curadoria, e é o que ela assina. O WhatsApp é do plano pago
// por inteiro: quem não assina simplesmente não entra no canal.
//
// A regra mora AQUI, num lugar só, porque ela é consultada de três lugares que
// não podem discordar: a tela do app, o histórico e a entrega diária. Espalhar
// a condição por três consultas é como o produto acaba liberando por um
// caminho o que bloqueia no outro.
//
// E ela é aplicada no SERVIDOR, não na tela. Se /seed/today devolvesse a
// semente inteira e só o app escondesse, o conteúdo estaria a um F12 de
// distância — o paywall seria decorativo.

import { pool } from './db.js';

/**
 * Situações que valem como acesso completo.
 *
 *  - `ativa`    — assinante pagante (quando houver gateway ligado).
 *  - `trial`    — os 7 dias prometidos na tela de planos, enquanto não vencem.
 *  - `cortesia` — liberado na mão: testadores do Trial, convidados, imprensa.
 *                 Existe porque durante o Trial ninguém consegue pagar (não há
 *                 gateway), e sem isto todo testador viraria gratuito no 8º dia
 *                 e avaliaria um produto pela metade.
 */
export type SituacaoAssinatura = 'ativa' | 'trial' | 'cortesia' | 'cancelada' | 'expirada';

export interface Acesso {
  completo: boolean;
  situacao: SituacaoAssinatura | 'nenhuma';
  plano: string | null;
  /** Quando o acesso temporário termina (trial ou cortesia). */
  terminaEm: string | null;
}

/** Condição SQL reutilizável. O `alias` é o da tabela subscriptions na consulta. */
export const TEM_ACESSO_SQL = (alias = 's') =>
  `(${alias}.status = 'ativa'
    OR (${alias}.status IN ('trial', 'cortesia')
        AND (${alias}.trial_ends_at IS NULL OR ${alias}.trial_ends_at > now())))`;

export async function acessoDoUsuario(userId: string): Promise<Acesso> {
  const { rows: [s] } = await pool.query(
    `SELECT plan, status, trial_ends_at, ${TEM_ACESSO_SQL()} completo
       FROM subscriptions s WHERE user_id = $1`, [userId]);

  if (!s) return { completo: false, situacao: 'nenhuma', plano: null, terminaEm: null };
  return {
    completo: !!s.completo,
    situacao: s.status,
    plano: s.plan,
    terminaEm: s.trial_ends_at ?? null,
  };
}

/** O que a semente vira para quem não assina. */
export interface ParteBloqueada {
  prayer: boolean;
  practice: boolean;
  music: boolean;
}

/**
 * Remove do objeto o que é do plano pago.
 *
 * Devolve `null` no lugar do texto, e não uma string vazia: vazio se confunde
 * com "essa semente não tem oração", e o app precisa saber a diferença para
 * mostrar o convite em vez de um espaço em branco.
 */
export function limitarSemente<T extends {
  prayer: string; practice: string;
  music: { title?: string; artist?: string; spotifyUrl?: string; youtubeUrl?: string };
}>(seed: T, completo: boolean) {
  if (completo) {
    return { ...seed, completa: true, bloqueado: null as ParteBloqueada | null };
  }
  return {
    ...seed,
    prayer: null,
    practice: null,
    music: null,
    completa: false,
    bloqueado: { prayer: true, practice: true, music: true } as ParteBloqueada,
  };
}
