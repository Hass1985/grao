// Libera ou tira o acesso completo de alguém, na mão.
//
// Existe por uma razão prática do Trial: ninguém consegue pagar ainda, porque
// não há gateway ligado. Sem uma cortesia, todo testador viraria gratuito no
// 8º dia e passaria a avaliar um produto pela metade, sem oração, prática,
// louvor nem WhatsApp. O teste mediria o paywall, não o produto.
//
// Cortesia é uma situação de assinatura como outra qualquer, com prazo e
// registro, e não uma exceção escondida no código. Ela aparece no painel do
// mesmo jeito que uma assinatura paga, e vence sozinha.
//
// Uso:
//   npm run acesso                          → lista quem tem o quê
//   npm run acesso -- +5511999999999 90     → 90 dias de cortesia
//   npm run acesso -- +5511999999999 0      → tira o acesso

import 'dotenv/config';
import { pool } from '../src/db.js';
import { normalizePhone } from '../src/whatsapp.js';
import { TEM_ACESSO_SQL } from '../src/acesso.js';

const PRECO = { plantio: 1990, anual: 19900 } as const;

async function listar() {
  const { rows } = await pool.query(`
    SELECT coalesce(u.name, '(sem nome)') nome, u.phone_e164,
           s.plan, s.status, s.trial_ends_at,
           coalesce(${TEM_ACESSO_SQL('s')}, false) completo
      FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.phone_e164 IS NOT NULL OR s.user_id IS NOT NULL
     ORDER BY completo DESC, u.created_at DESC`);

  if (!rows.length) { console.log('Ninguém com telefone ou assinatura ainda.'); return; }
  console.log('ACESSO POR PESSOA\n');
  for (const r of rows as any[]) {
    const prazo = r.trial_ends_at
      ? new Date(r.trial_ends_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '—';
    console.log(
      `  ${r.completo ? '✓ COMPLETO' : '  gratuito '}  ${String(r.nome).padEnd(14)}` +
      `${String(r.phone_e164 ?? '').padEnd(16)} ${String(r.status ?? 'sem assinatura').padEnd(10)} até ${prazo}`);
  }
  console.log('\nPara liberar: npm run acesso -- <telefone> <dias>');
}

async function main() {
  const [alvo, diasBruto] = process.argv.slice(2);
  if (!alvo) { await listar(); return; }

  const fone = normalizePhone(alvo);
  if (!fone) { console.log(`✗ telefone inválido: ${alvo}`); process.exit(1); }

  const { rows: [u] } = await pool.query(
    `SELECT id, coalesce(name,'(sem nome)') nome FROM users WHERE phone_e164 = $1`, [fone]);
  if (!u) { console.log(`✗ ninguém cadastrado com ${fone}`); process.exit(1); }

  const dias = diasBruto === undefined ? 90 : Number(diasBruto);
  if (!Number.isFinite(dias) || dias < 0) { console.log('✗ dias inválido'); process.exit(1); }

  if (dias === 0) {
    await pool.query(
      `UPDATE subscriptions SET status = 'expirada', updated_at = now() WHERE user_id = $1`, [u.id]);
    console.log(`✓ acesso de ${u.nome} encerrado (volta a ser gratuito)`);
    return;
  }

  // ON CONFLICT porque quem passou pelo onboarding já tem a linha de trial: a
  // cortesia sobrescreve o prazo em vez de criar uma segunda assinatura.
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, price_cents, trial_ends_at)
          VALUES ($1, 'plantio', 'cortesia', $2, now() + ($3::int * interval '1 day'))
     ON CONFLICT (user_id) DO UPDATE
            SET status = 'cortesia',
                trial_ends_at = now() + ($3::int * interval '1 day'),
                updated_at = now()`,
    [u.id, PRECO.plantio, dias]);

  console.log(`✓ ${u.nome} com acesso completo por ${dias} dias`);
  console.log('  (aparece como "cortesia" no painel, e vence sozinho)');
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
