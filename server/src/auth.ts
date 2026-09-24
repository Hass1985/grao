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
import { normalizePhone } from './telefone.js';
import { TEM_ACESSO_SQL } from './acesso.js';
import { aplicarCortesias } from './cortesia.js';

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
  telefone: string | null;
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
  // O Supabase manda o telefone sem o "+" (5511999999999). normalizePhone é a
  // mesma função que o WhatsApp usa, para os dois lados gravarem a mesma string.
  const telefoneBruto = (dados.phone as string) || meta.phone || '';
  return {
    uid: sub,
    email: (dados.email as string) ?? meta.email ?? null,
    telefone: telefoneBruto ? normalizePhone(telefoneBruto) : null,
    nome: meta.full_name ?? meta.name ?? null,
    provedor: (dados.app_metadata as any)?.provider ?? null,
  };
}

/**
 * Apaga a identidade no Supabase — e-mail, telefone e senha.
 *
 * Sem isto, "excluir conta" apagava tudo que a pessoa VIVEU no Grão (relato,
 * leitura emocional, diário, entregas) e deixava intacto o cadastro dela em
 * auth.users. Quem pediu para ser esquecido continuava cadastrado, e ainda
 * conseguia logar — caindo num app vazio, sem entender por quê.
 *
 * Precisa da chave de serviço, que é a chave que pode tudo no projeto. Sem
 * ela, o resto da exclusão acontece do mesmo jeito e fica registrado o que
 * sobrou; fingir que apagou seria pior do que não apagar.
 */
export async function apagarIdentidade(uid: string): Promise<boolean> {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave || !authConfigurada()) {
    console.warn(`[auth] identidade ${uid} NÃO apagada — SUPABASE_SERVICE_ROLE_KEY ausente`);
    return false;
  }
  try {
    const res = await fetch(`${URL_PROJETO()}/auth/v1/admin/users/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      signal: AbortSignal.timeout(15_000),
    });
    // 404 conta como sucesso: a identidade não está mais lá, que é o objetivo.
    if (res.ok || res.status === 404) return true;
    console.error(`[auth] Supabase recusou apagar ${uid}: ${res.status}`);
    return false;
  } catch (e: any) {
    console.error('[auth] falha ao apagar identidade:', e?.message || e);
    return false;
  }
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

  // As identidades vão PRIMEIRO, e por um motivo que não é de ordem estética:
  // `users` tem ON DELETE CASCADE em user_identities. Se a linha do cadastro
  // de origem for apagada antes, as identidades dele somem junto — e a pessoa
  // que entrava por aquela porta deixa de conseguir entrar, sem erro nenhum
  // que aponte para aqui. O ON CONFLICT cobre a identidade que já estiver no
  // destino (a mesma pessoa vinculada duas vezes).
  await pool.query(
    `INSERT INTO user_identities (auth_uid, user_id, provedor, email, telefone, criado_em, visto_em)
     SELECT auth_uid, $2, provedor, email, telefone, criado_em, visto_em
       FROM user_identities WHERE user_id = $1
     ON CONFLICT (auth_uid) DO UPDATE SET user_id = EXCLUDED.user_id`, [de, para]);

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

  // Lê, APAGA, e só então grava no que fica.
  //
  // A ordem importa: phone_e164 é UNIQUE. Copiar o telefone para o cadastro que
  // sobrevive com o outro ainda vivo estoura a restrição, e a fusão inteira é
  // desfeita. Não aparecia enquanto só o WhatsApp fundia (lá o telefone já
  // estava no destino); aparece agora, com quem cria conta pelo telefone.
  const { rows: [origem] } = await pool.query(
    `SELECT name, phone_e164, email, wa_opt_in_at FROM users WHERE id = $1`, [de]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [de]);
  if (origem) {
    await pool.query(
      `UPDATE users SET
         name = coalesce($2, name),
         phone_e164 = coalesce(phone_e164, $3),
         email = coalesce(email, $4),
         wa_opt_in_at = coalesce(wa_opt_in_at, $5)
       WHERE id = $1`,
      [para, origem.name, origem.phone_e164, origem.email, origem.wa_opt_in_at]);
  }
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
      // Esta identidade já pertence a alguém? Ver 026_identidades.sql: a
      // pergunta é feita à tabela de identidades, não a users.auth_uid, porque
      // a mesma pessoa pode ter entrado antes por outra porta.
      const { rows: [daConta] } = await pool.query(
        `SELECT user_id AS id FROM user_identities WHERE auth_uid = $1`, [conta.uid]);
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
        // Identidade nova. Antes de criar vínculo, procura um cadastro que já
        // seja desta pessoa por OUTRA porta — é o caso que partiu o cadastro
        // do Samir em dois: ele entrou por telefone primeiro e por Google
        // depois, e nada ligava as duas coisas.
        //
        // O e-mail serve de chave porque o Supabase só o entrega verificado.
        // O telefone é tratado mais abaixo, junto com a regra de assinatura.
        const { rows: [porEmail] } = conta.email
          ? await pool.query(
              `SELECT u.id FROM users u
                WHERE lower(u.email) = lower($1) AND u.id <> $2
                ORDER BY u.created_at LIMIT 1`, [conta.email, userId])
          : { rows: [] as any[] };

        if (porEmail) {
          if (doAparelho) { await fundirUsuarios(userId, porEmail.id); fundiu = true; }
          idFinal = porEmail.id;
        } else if (!doAparelho) {
          await pool.query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
        }

        await pool.query(
          `UPDATE users SET auth_uid = coalesce(auth_uid, $2),
                            email = coalesce($3, email),
                            name = coalesce(name, $4)
            WHERE id = $1`, [idFinal, conta.uid, conta.email, conta.nome]);
      }

      // Conta feita pelo telefone: é o MESMO número do WhatsApp. Pode já existir
      // um cadastro criado pela conversa lá, com o histórico de entregas e até a
      // assinatura. Sem juntar os dois, a pessoa entraria no app e veria a
      // primeira tela de sempre, enquanto o Grão continua mandando semente para
      // ela todo dia por outro cadastro.
      //
      // A fusão para no cadastro que tem plano pago. Enquanto o Supabase estiver
      // com a confirmação por código desligada, ninguém prova ser dono do
      // número: bastaria digitar o telefone de outra pessoa para herdar o
      // cadastro dela. Histórico de devocional é um estrago; assinatura ativa é
      // outro tamanho de estrago, e esse não corremos. O caso fica registrado
      // para aparecer no painel.
      if (conta.telefone) {
        const { rows: [doTelefone] } = await pool.query(
          `SELECT u.id, ${TEM_ACESSO_SQL('s')} AS pago
             FROM users u
             LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.phone_e164 = $1`, [conta.telefone]);

        if (doTelefone && doTelefone.id !== idFinal) {
          if (doTelefone.pago) {
            void logEvent(idFinal, 'telefone_em_uso',
              { telefone: conta.telefone, motivo: 'cadastro com plano ativo' });
          } else {
            await fundirUsuarios(doTelefone.id, idFinal);
            fundiu = true;
          }
        } else if (!doTelefone) {
          await pool.query(
            `UPDATE users SET phone_e164 = coalesce(phone_e164, $2) WHERE id = $1`,
            [idFinal, conta.telefone]);
        }
      }

      // Registra a identidade no cadastro que sobrou.
      //
      // Depois de todas as fusões, de propósito: antes disso `idFinal` ainda
      // podia mudar, e uma identidade apontando para um cadastro que some é
      // uma pessoa que não consegue mais entrar.
      //
      // O ON CONFLICT reaponta em vez de ignorar: se a identidade já existia
      // num cadastro que acabou de ser fundido para dentro de outro, o lugar
      // certo dela agora é o sobrevivente.
      await pool.query(
        `INSERT INTO user_identities (auth_uid, user_id, provedor, email, telefone, visto_em)
              VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (auth_uid) DO UPDATE
            SET user_id  = EXCLUDED.user_id,
                provedor = coalesce(EXCLUDED.provedor, user_identities.provedor),
                email    = coalesce(EXCLUDED.email, user_identities.email),
                telefone = coalesce(EXCLUDED.telefone, user_identities.telefone),
                visto_em = now()`,
        [conta.uid, idFinal, conta.provedor, conta.email, conta.telefone]);

      // A lista de cortesias é conferida AQUI, e não no cadastro, porque este é
      // o único ponto em que sabemos ao mesmo tempo quem a pessoa é e qual
      // cadastro sobrou depois das fusões. Quem está na lista entra com acesso
      // completo por qualquer porta: Google hoje, telefone amanhã.
      //
      // O e-mail do token pode vir vazio (conta feita por telefone), e o do
      // cadastro pode ter vindo de outra sessão. Vale a união dos dois.
      const { rows: [dono] } = await pool.query(
        `SELECT email, phone_e164 FROM users WHERE id = $1`, [idFinal]);
      const cortesia = await aplicarCortesias(idFinal, {
        email: conta.email ?? dono?.email ?? null,
        telefone: conta.telefone ?? dono?.phone_e164 ?? null,
      }).catch((e: any) => {
        // Cortesia não pode derrubar o login. Quem falhar aqui entra como
        // gratuito e o time libera pelo script; o contrário deixaria a pessoa
        // do lado de fora do app por causa de um mimo.
        console.error('[cortesia]', e?.message || e);
        return null;
      });

      void logEvent(idFinal, 'conta_vinculada', {
        provedor: conta.provedor, fundiu, porTelefone: !!conta.telefone,
      });
      return res.json({
        ok: true, userId: idFinal, merged: fundiu,
        email: conta.email, telefone: conta.telefone,
        cortesia: cortesia?.aplicada ?? false,
      });
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

    // Pela tabela de identidades: quem entrou por uma porta e tem o cadastro
    // ligado por outra continua sendo a mesma pessoa. Ver 026_identidades.sql.
    const { rows: [u] } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone_e164 IS NOT NULL AS "temWhatsapp"
         FROM user_identities i JOIN users u ON u.id = i.user_id
        WHERE i.auth_uid = $1`, [conta.uid]);
    return res.json({ conta, usuario: u ?? null });
  });
}
