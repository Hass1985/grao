// Valida TODO o passage_pool contra bible_verses: cada referência precisa
// existir por inteiro (todos os versículos do intervalo). Custo zero de API.
// Uso: npm run content:validate-pool
import 'dotenv/config';
import { pool } from '../src/db.js';
async function main() {
  const { rows } = await pool.query(`SELECT id, family, book, chapter, verse_start, verse_end, reference FROM passage_pool ORDER BY family, reference`);
  let bad = 0;
  for (const p of rows) {
    const vEnd = p.verse_end ?? p.verse_start;
    const { rows: [r] } = await pool.query(
      `SELECT count(*)::int n FROM bible_verses WHERE book=$1 AND chapter=$2 AND verse BETWEEN $3 AND $4`,
      [p.book, p.chapter, p.verse_start, vEnd]);
    const expected = vEnd - p.verse_start + 1;
    if (r.n !== expected) { bad++; console.log(`  ✗ ${p.family} · ${p.reference}: esperava ${expected} versículo(s), achou ${r.n}`); }
  }
  const { rows: [t] } = await pool.query(`SELECT count(*)::int n, count(DISTINCT family)::int f FROM passage_pool`);
  console.log(`\n${t.n} passagens em ${t.f} famílias · ${bad === 0 ? 'todas válidas ✓' : bad + ' inválida(s)'}`);
  if (bad) process.exitCode = 1;
}
main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
