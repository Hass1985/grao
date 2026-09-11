// A lista de quem entra com acesso completo sem pagar.
//
// Diferente do `npm run acesso`, que libera UM cadastro pelo telefone e só
// funciona se a pessoa já existir no banco, aqui a cortesia é registrada na
// identidade: e-mail ou número. Vale para quem ainda nem se cadastrou, e
// continua valendo se a pessoa trocar de porta de entrada — o servidor
// reaplica toda vez que ela vincula a conta.
//
// É o que sustenta os donos testando no fluxo real: acesso pago, sem pagar,
// sem depender de lembrar em qual dos cadastros eles entraram da última vez.
//
// Uso:
//   npm run cortesia                                       → lista
//   npm run cortesia -- add lucas@exemplo.com "Sócio"      → sem prazo
//   npm run cortesia -- add +5511999999999 90 "Imprensa"   → 90 dias
//   npm run cortesia -- remove lucas@exemplo.com           → tira da lista
//                                                            e encerra o acesso

import 'dotenv/config';
import { pool } from '../src/db.js';
import { normalizarIdentificador, aplicarCortesias } from '../src/cortesia.js';
import { TEM_ACESSO_SQL } from '../src/acesso.js';

async function listar() {
  const { rows } = await pool.query(`
    SELECT c.identificador, c.tipo, c.nota, c.dias, c.aplicada_em,
           u.name nome,
           coalesce(${TEM_ACESSO_SQL('s')}, false) completo,
           s.status, s.trial_ends_at
      FROM cortesias c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN subscriptions s ON s.user_id = c.user_id
     ORDER BY c.dias IS NULL DESC, c.criada_em`);

  if (!rows.length) {
    console.log('Nenhuma cortesia cadastrada.');
    console.log('\nPara cadastrar: npm run cortesia -- add <e-mail|telefone> [dias] ["nota"]');
    return;
  }

  console.log('CORTESIAS\n');
  for (const r of rows as any[]) {
    const prazo = r.dias === null
      ? 'sem prazo'
      : `${r.dias} dias`;
    const estado = !r.aplicada_em
      ? 'aguardando o primeiro login'
      : r.completo
        ? `ativa${r.trial_ends_at ? ' até ' + new Date(r.trial_ends_at).toLocaleDateString('pt-BR') : ''}`
        : `NÃO está valendo (assinatura ${r.status ?? 'ausente'})`;
    console.log(`  ${String(r.identificador).padEnd(32)} ${prazo.padEnd(10)} ${estado}`);
    console.log(`    ${r.nota ?? 'sem nota'}${r.nome ? '  ·  ' + r.nome : ''}`);
  }
  console.log(`\n${rows.length} na lista. O acesso é aplicado quando a pessoa vincula a conta.`);
}

/**
 * Cadastra e já tenta aplicar.
 *
 * Aplicar na hora importa: quase sempre a pessoa JÁ existe no banco (entrou,
 * viu o app pela metade e reclamou). Esperar o próximo login para liberar
 * transformaria "libera o acesso dele" em "peça para ele sair e entrar de novo".
 */
async function adicionar(bruto: string, resto: string[]) {
  const id = normalizarIdentificador(bruto);
  if (!id) { console.log(`✗ não parece e-mail nem telefone: ${bruto}`); process.exit(1); }

  const dias = resto.length && /^\d+$/.test(resto[0]) ? Number(resto[0]) : null;
  const nota = (dias === null ? resto : resto.slice(1)).join(' ').trim() || null;

  await pool.query(
    `INSERT INTO cortesias (identificador, tipo, nota, dias)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (identificador) DO UPDATE
            SET nota = coalesce(excluded.nota, cortesias.nota),
                dias = excluded.dias`,
    [id.identificador, id.tipo, nota, dias]);

  console.log(`✓ ${id.identificador} na lista (${dias === null ? 'sem prazo' : dias + ' dias'})`);

  const coluna = id.tipo === 'email' ? 'lower(email)' : 'phone_e164';
  const { rows } = await pool.query(
    `SELECT id, coalesce(name, '(sem nome)') nome FROM users WHERE ${coluna} = $1`,
    [id.identificador]);

  if (!rows.length) {
    console.log('  ainda não há cadastro com esse dado — vale no primeiro login');
    return;
  }
  for (const u of rows as any[]) {
    const r = await aplicarCortesias(u.id, {
      email: id.tipo === 'email' ? id.identificador : null,
      telefone: id.tipo === 'telefone' ? id.identificador : null,
    });
    console.log(r?.aplicada
      ? `  ✓ acesso completo liberado para ${u.nome} agora`
      : `  ⚠ ${u.nome} tem assinatura ATIVA — não mexi, quem paga continua pagante`);
  }
}

async function remover(bruto: string) {
  const id = normalizarIdentificador(bruto);
  if (!id) { console.log(`✗ não parece e-mail nem telefone: ${bruto}`); process.exit(1); }

  const { rows: [c] } = await pool.query(
    `DELETE FROM cortesias WHERE identificador = $1 RETURNING user_id`, [id.identificador]);
  if (!c) { console.log(`✗ ${id.identificador} não estava na lista`); return; }

  console.log(`✓ ${id.identificador} fora da lista`);

  // Tirar da lista sem encerrar o acesso deixaria a cortesia valendo para
  // sempre no cadastro, invisível para quem consulta a lista.
  if (c.user_id) {
    await pool.query(
      `UPDATE subscriptions SET status = 'expirada', updated_at = now()
        WHERE user_id = $1 AND status = 'cortesia'`, [c.user_id]);
    console.log('  acesso encerrado no cadastro (volta a ser gratuito)');
  }
}

async function main() {
  const [cmd, alvo, ...resto] = process.argv.slice(2);
  if (!cmd) return listar();
  if (cmd === 'add' && alvo) return adicionar(alvo, resto);
  if (cmd === 'remove' && alvo) return remover(alvo);
  console.log('Uso: npm run cortesia [-- add <e-mail|telefone> [dias] ["nota"] | remove <e-mail|telefone>]');
  process.exit(1);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
