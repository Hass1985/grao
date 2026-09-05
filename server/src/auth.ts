// Contas: validação do token do Supabase e fusão de identidades.
//
// Até aqui a identidade era um UUID aleatório no navegador. Limpou o cache,
// perdeu tudo. Com paywall isso deixa de ser inconveniente e vira buraco de
// negócio: bastava abrir uma aba anônima para virar um novo gratuito.
//
// O login em si acontece no APP, com o SDK do Supabase — Google, Apple,
// Facebook e e-mail/senha, sem nada disso passar por aqui. O backend só faz
// duas coisas: confere que o token é legítimo e liga a conta à pessoa que já
// existe no banco.
//
// Não guardamos senha, não vemos senha, e não implementamos OAuth. Escrever
// autenticação à mão é onde mais se erra em segurança, e um app que carrega
// convicção religiosa (dado sensível pela LGPD, art. 5º, II) não é lugar para
// experimentar.
//
// BIOMETRIA E 2FA já estão preparados por consequência desta escolha:
//  - biometria é do APARELHO (expo-local-authentication): protege a sessão
//    local, não passa pelo servidor, e liga sem tocar em nada aqui;
//  - 2FA é recurso do próprio Supabase (auth.mfa, TOTP). Quando ligado, o
//    token que chega aqui já vem com o segundo fator cumprido, e este arquivo
//    não muda uma linha.

import type { Express, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { pool, logEvent } from './db.js';

const URL_PROJETO = () => (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const SEGREDO_LEGADO = () => process.env.SUPABASE_JWT_SECRET ?? '';

export function authConfigurada(): boolean {
  return !!URL_PROJETO();
}

/**
 * As chaves públicas do projeto, buscadas uma vez e reaproveitadas.
 *
 * createRemoteJWKSet cuida do cache e da rotação sozinho. Recriar a cada
 * requisição faria uma ida à rede por login, e o Supabase rotaciona chave sem
 * avisar ninguém.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function chaves() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${URL_PROJETO()}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Tenta a chave assimétrica e, se falhar, o segredo compartilhado.
 *
 * Função à parte para o TypeScript conseguir estreitar o tipo: com try/catch
 * atribuindo a uma variável de fora, ele perde o rastro e infere `never`.
 */
async function verificar(token: string, emissor: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, chaves(), { issuer: emissor });
    return payload;
  } catch {
    // Projeto ainda no segredo compartilhado. O Supabase desaconselha esse
    // modelo justamente porque o mesmo segredo assina e verifica; fica só como
    // ponte para quem ainda não migrou.
    if (!SEGREDO_LEGADO()) return null;
    try {
      const chave = new TextEncoder().encode(SEGREDO_LEGADO());
      const { payload } = await jwtVerify(token, chave, { issuer: emissor });
      return payload;
    } catch {
      return null;
    }
  }
}

export interface Conta {
  uid: string;
  email: string | null;
  nome: string | null;
  provedor: string | null;
}

/**
 * Confere o token e devolve quem é.
 *
 * Tenta primeiro a chave assimétrica (JWKS), que é o caminho atual do
 * Supabase, e cai para o segredo compartilhado HS256 só se o projeto ainda
 * estiver no modelo antigo. Devolve null em qualquer falha: token vencido,
 * assinatura errada, emissor de outro projeto.
 */
export async function lerToken(token: string): Promise<Conta | null> {
  if (!token || !authConfigurada()) return null;
  const emissor = `${URL_PROJETO()}/auth/v1`;

  const dados = await verificar(token, emissor);
  if (!dados) return null;

  const sub = typeof dados.sub === 'string' ? dados.sub : null;
  if (!sub) return null;

  const meta = (dados.user_metadata ?? {}) as Record<string, any>;
  return {
    uid: sub,
    email: (dados.email as string) ?? meta.email ?? null,
    nome: meta.full_name ?? meta.name ?? null,
    provedor: (dados.app_metadata as any)?.provider ?? null,
  };
}

/**
 * Move tudo de um cadastro para outro e apaga o primeiro.
 *
 * Estava escrito duas vezes (na ligação do WhatsApp e agora aqui). Duas cópias
 * de uma fusão divergem na primeira tabela nova que alguém esquecer de
 * atualizar, e o sintoma seria histórico sumindo sem explicação.
 */
export async function fundirUsuarios(de: string, para: string): Promise<void> {
  if (de === para) return;

  await pool.query(`UPDATE conversation_turns SET user_id = $2 WHERE user_id = $1`, [de, para]);
  await pool.query(`UPDATE emotional_readings SET user_id = $2 WHERE user_id = $1`, [de, para]);
  await pool.query(`UPDATE events SET user_id = $2 WHERE user_id = $1`, [de, para]);
  await pool.query(`UPDATE user_memories SET user_id = $2 WHERE user_id = $1`, [de, para]);

  // Entregas colidem na chave (mesma semente para o mesmo destino): só migra o
  // que ainda não existe do outro lado.
  await pool.query(
    `UPDATE seed_deliveries d SET user_id = $2 WHERE d.user_id = $1
      AND NOT EXISTS (SELECT 1 FROM seed_deliveries x WHERE x.user_id = $2 AND x.seed_id = d.seed_id)`,
    [de, para]);

  // Estas têm user_id como chave primária: só cabe uma. A do cadastro de
  // origem prevalece, porque é a mais recente (acabou de ser preenchida).
  for (const tabela of ['profiles', 'user_moment', 'subscriptions']) {
    await pool.query(
      `DELETE FROM ${tabela} WHERE user_id = $2 AND EXISTS (SELECT 1 FROM ${tabela} WHERE user_id = $1)`,
      [de, para]);
    await pool.query(`UPDATE ${tabela} SET user_id = $2 WHERE user_id = $1`, [de, para]);
  }

  await pool.query(
    `UPDATE users SET
       name = coalesce((SELECT name FROM users WHERE id = $1), name),
       phone_e164 = coalesce(phone_e164, (SELECT phone_e164 FROM users WHERE id = $1)),
       email = coalesce(email, (SELECT email FROM users WHERE id = $1)),
       wa_opt_in_at = coalesce(wa_opt_in_at, (SELECT wa_opt_in_at FROM users WHERE id = $1))
     WHERE id = $2`, [de, para]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [de]);
}

export function registerAuthRoutes(app: Express) {
  /**
   * Liga a conta recém-autenticada à pessoa que já existe no banco.
   *
   * Chamado logo depois do login, com o access token do Supabase. Devolve o id
   * que passa a valer: pode ser diferente do que o app tinha, e nesse caso o
   * app precisa gravar o novo, senão passa a consultar um cadastro apagado.
   *
   * Três cenários, nesta ordem:
   *  1. já existe cadastro com esta conta  → ele manda, e o do aparelho funde
   *     nele. É o caso de quem trocou de celular ou reinstalou;
   *  2. não existe                          → a conta gruda no cadastro atual
   *     do aparelho, preservando tudo que a pessoa já fez sem estar logada;
   *  3. o cadastro do aparelho não existe   → cria.
   */
  app.post('/auth/vincular', async (req: Request, res: Response) => {
    if (!authConfigurada()) return res.status(503).json({ error: 'SUPABASE_URL não configurada' });

    const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const { userId } = req.body as { userId?: string };
    if (!token) return res.status(401).json({ error: 'token ausente' });
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

    const conta = await lerToken(token);
    if (!conta) return res.status(401).json({ error: 'token inválido' });

    try {
      const { rows: [daConta] } = await pool.query(
        `SELECT id FROM users WHERE auth_uid = $1`, [conta.uid]);
      const { rows: [doAparelho] } = await pool.query(
        `SELECT id FROM users WHERE id = $1`, [userId]);

      let idFinal = userId;
      let fundiu = false;

      if (daConta && daConta.id !== userId) {
        // A conta já tem cadastro: ele vence, porque sobrevive à troca de
        // aparelho. O que estava no aparelho é migrado para dentro dele.
        if (doAparelho) { await fundirUsuarios(userId, daConta.id); fundiu = true; }
        idFinal = daConta.id;
      } else if (!daConta) {
        if (!doAparelho) {
          await pool.query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
        }
        await pool.query(
          `UPDATE users SET auth_uid = $2,
                            email = coalesce($3, email),
                            name = coalesce(name, $4)
            WHERE id = $1`, [userId, conta.uid, conta.email, conta.nome]);
      }

      void logEvent(idFinal, 'conta_vinculada', { provedor: conta.provedor, fundiu });
      return res.json({ ok: true, userId: idFinal, merged: fundiu, email: conta.email });
    } catch (err: any) {
      console.error('[auth/vincular]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao vincular a conta.' });
    }
  });

  /** Quem é o dono deste token. Serve para o app conferir a sessão. */
  app.get('/auth/eu', async (req: Request, res: Response) => {
    const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const conta = await lerToken(token);
    if (!conta) return res.status(401).json({ error: 'token inválido' });

    const { rows: [u] } = await pool.query(
      `SELECT id, name, email, phone_e164 IS NOT NULL AS "temWhatsapp"
         FROM users WHERE auth_uid = $1`, [conta.uid]);
    return res.json({ conta, usuario: u ?? null });
  });
}
