// Aplica arquivos .sql no banco, na ordem passada. Uso: tsx scripts/apply-sql.ts a.sql b.sql
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pool } from '../src/db.js';
async function main() {
  for (const f of process.argv.slice(2)) {
    process.stdout.write(`aplicando ${f}… `);
    await pool.query(readFileSync(f, 'utf8'));
    console.log('✓');
  }
}
main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
