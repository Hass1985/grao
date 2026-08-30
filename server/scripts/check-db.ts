// Testa a DATABASE_URL do .env sem revelar a senha. Uso: npm run db:check
//
// Serve para confirmar uma troca de senha: se a conexão abre e as tabelas
// respondem, a string está correta — sem precisar imprimir a credencial.

import 'dotenv/config';
import { pool } from '../src/db.js';

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) { console.log('✗ DATABASE_URL não configurada.'); process.exit(1); }

  const u = new URL(url);
  console.log(`alvo: ${u.hostname}:${u.port || '5432'}${u.pathname} (usuário ${u.username})`);

  const t0 = Date.now();
  const { rows: [{ agora }] } = await pool.query('SELECT now() agora');
  console.log(`✓ conectou em ${Date.now() - t0}ms · hora do servidor: ${agora.toISOString()}`);

  const { rows: [c] } = await pool.query(
    `SELECT (SELECT count(*) FROM seeds)::int sementes,
            (SELECT count(*) FROM content_drafts WHERE status='draft')::int rascunhos,
            (SELECT count(*) FROM bible_verses)::int versiculos,
            (SELECT count(*) FROM musics)::int musicas`);
  console.log(`✓ dados intactos: ${c.sementes} sementes · ${c.rascunhos} rascunhos · ${c.versiculos} versículos · ${c.musicas} músicas`);
}

main().catch((e) => {
  console.error(`✗ falhou: ${e.message}`);
  if (/password|authentication/i.test(e.message)) {
    console.error('  → senha errada ou não codificada. Rode: bash scripts/set-db-password.sh');
  }
  process.exit(1);
}).finally(() => pool.end());
