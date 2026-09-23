// Identidade nas rotas de usuário.
//
// Até aqui o `:userId` da URL era tratado como prova de que a pessoa é ela
// mesma. Não é: o UUID trafega no aplicativo, aparece em log e em print, fica
// gravado no aparelho e não é segredo de ninguém. Quem tivesse um lia o relato,
// a leitura emocional e o diário de outra pessoa — e podia apagar a conta dela
// ou mandar a semente para outro WhatsApp.
//
// A peça difícil já existia: auth.ts valida o token do Supabase por JWKS. Aqui
// só se fecha o circuito — o token diz quem é, o banco diz qual cadastro é
// dessa pessoa, e a rota só roda se for o mesmo que a URL pediu.
//
// Registrado com app.param, não como argumento de cada rota. São 26 hoje e a
// próxima que alguém escrever também vai passar por aqui: o jeito de esquecer
// uma não existe. É a diferença entre uma trava e uma convenção.

import type { Request, Response, NextFunction } from 'express';
import { lerToken } from './auth.js';
import { pool } from './db.js';

/**
 * Três modos, porque virar a chave de uma vez derruba quem está usando.
 *
 *  desligado   não confere nada. Só para destravar uma emergência.
 *  observando  confere, registra quem chegou sem identidade e DEIXA PASSAR.
 *  exigindo    recusa.
 *
 * O padrão é `observando`: subir este arquivo não muda o que ninguém vê, e o
 * log responde em um dia se ainda sobrou chamada velha em algum aparelho.
 */
export type Modo = 'desligado' | 'observando' | 'exigindo';

export function modoAtual(): Modo {
  const v = (process.env.AUTH_ROTAS ?? '').trim().toLowerCase();
  return v === 'desligado' || v === 'exigindo' ? v : 'observando';
}

function bearer(req: Request): string {
  return (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

/** O cadastro desta conta do Supabase, ou null se ela nunca foi vinculada. */
async function cadastroDaConta(uid: string): Promise<string | null> {
  const { rows: [u] } = await pool.query(
    `SELECT id FROM users WHERE auth_uid = $1`, [uid]);
  return u?.id ?? null;
}

type Recusa = { status: number; codigo: string; motivo: string; userId?: string };

async function conferir(req: Request, alvo: string): Promise<Recusa | null> {
  const token = bearer(req);
  if (!token) return { status: 401, codigo: 'sem_token', motivo: 'token ausente' };

  const conta = await lerToken(token);
  if (!conta) return { status: 401, codigo: 'token_invalido', motivo: 'token inválido ou vencido' };

  const dono = await cadastroDaConta(conta.uid);
  if (!dono) {
    // Logou, mas o cadastro ainda não foi ligado à conta. O aplicativo resolve
    // chamando /auth/vincular; devolver um código próprio evita que ele trate
    // isso como "token ruim" e mande a pessoa fazer login de novo.
    return { status: 403, codigo: 'sem_cadastro', motivo: 'conta ainda não vinculada' };
  }

  if (dono !== alvo) {
    // O id certo vai junto de propósito. Quem chegou até aqui já provou ser
    // dono do token, então não há o que esconder — e o aplicativo consegue se
    // corrigir sozinho em vez de ficar tentando com um id que ficou velho
    // depois de uma fusão de contas feita em outro aparelho.
    return { status: 403, codigo: 'id_divergente', motivo: 'o token é de outro cadastro', userId: dono };
  }

  return null;
}

async function aplicar(req: Request, res: Response, next: NextFunction, alvo: string) {
  const modo = modoAtual();
  if (modo === 'desligado') return next();

  let recusa: Recusa | null;
  try {
    recusa = await conferir(req, alvo);
  } catch (e: any) {
    // Banco fora ou JWKS inacessível. Em observação isso não pode virar erro
    // para a pessoa; exigindo, não dá para deixar passar sem conferir.
    console.error('[identidade] falha ao conferir:', e?.message || e);
    if (modo === 'observando') return next();
    return res.status(503).json({ error: 'não foi possível conferir a identidade' });
  }

  if (!recusa) return next();

  if (modo === 'observando') {
    // Uma linha por recusa, com a rota como ela foi escrita (`/state/:userId`,
    // não o UUID) para dar para contar por rota no log do Render.
    console.warn(
      `[identidade] passaria ${recusa.codigo} — ${req.method} ${req.route?.path ?? req.path}`);
    return next();
  }

  return res.status(recusa.status).json({
    error: recusa.motivo,
    codigo: recusa.codigo,
    ...(recusa.userId ? { userId: recusa.userId } : {}),
  });
}

/**
 * Callback de app.param('userId'). Roda depois de a rota casar e antes do
 * handler, em toda rota que tenha `:userId` — das 26 de hoje às que vierem.
 */
export function donoDoUserId(
  req: Request, res: Response, next: NextFunction, alvo: string,
) {
  return aplicar(req, res, next, alvo);
}

/**
 * O mesmo, para as rotas que recebem o userId no CORPO em vez da URL.
 *
 * São duas: /onboarding/turn e /onboarding/opening. Elas não casam com
 * app.param e por isso precisam ser marcadas à mão — e são justamente as que
 * chamam o modelo, ou seja, as que custam dinheiro por chamada.
 */
export function donoNoCorpo(req: Request, res: Response, next: NextFunction) {
  const alvo = (req.body as any)?.userId;
  if (typeof alvo !== 'string' || !alvo) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }
  return aplicar(req, res, next, alvo);
}
