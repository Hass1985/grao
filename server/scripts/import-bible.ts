// Importa a Bíblia COMPLETA (Bíblia Livre — tradução brasileira moderna,
// licença CC-BY 3.0 BR) para a tabela bible_verses, e valida que todas as
// referências do passage_pool existem de verdade no texto.
//
// Fonte: https://api.getbible.net/v2/livre.json (1 download, ~9 MB, 31k versos)
// Uso:   npm run content:bible

import 'dotenv/config';
import { pool } from '../src/db.js';

const SOURCE = 'https://api.getbible.net/v2/livre.json';
const TRANSLATION = 'BLIVRE';

interface GbVerse { chapter: number; verse: number; text: string }
interface GbChapter { chapter: number; verses: GbVerse[] }
interface GbBook { nr: number; name: string; chapters: GbChapter[] }

async function main() {
  console.log('Baixando a Bíblia Livre…');
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`download falhou: ${res.status}`);
  const data = await res.json() as { translation: string; distribution_license: string; books: GbBook[] };
  console.log(`✓ ${data.translation} · licença: ${data.distribution_license} · ${data.books.length} livros`);

  // idempotente: recarrega a tradução inteira
  await pool.query(`DELETE FROM bible_verses WHERE translation = $1`, [TRANSLATION]);

  let total = 0;
  for (const book of data.books) {
    // um INSERT por livro (lotes de ~500-2500 versos)
    const values: unknown[] = [];
    const rows: string[] = [];
    let i = 1;
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        rows.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, '${TRANSLATION}')`);
        values.push(book.nr, book.name, ch.chapter, v.verse, v.text.trim());
      }
    }
    await pool.query(
      `INSERT INTO bible_verses (book_nr, book, chapter, verse, text, translation) VALUES ${rows.join(',')}`,
      values
    );
    total += values.length / 5;
    if (book.nr % 11 === 0) console.log(`  … ${book.name} (${total} versos até aqui)`);
  }
  console.log(`✓ ${total} versículos importados`);

  // Validação: toda referência do pool precisa existir no texto.
  const { rows: missing } = await pool.query(`
    SELECT p.family, p.reference
      FROM passage_pool p
     WHERE NOT EXISTS (
       SELECT 1 FROM bible_verses b
        WHERE b.translation = $1 AND b.book = p.book
          AND b.chapter = p.chapter AND b.verse = p.verse_start)
        OR (p.verse_end IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM bible_verses b
        WHERE b.translation = $1 AND b.book = p.book
          AND b.chapter = p.chapter AND b.verse = p.verse_end))`,
    [TRANSLATION]);

  const { rows: [{ n: poolCount }] } = await pool.query(`SELECT count(*)::int n FROM passage_pool`);
  if (missing.length) {
    console.log(`\n✗ ${missing.length}/${poolCount} referências do pool NÃO batem com o texto:`);
    missing.forEach((m) => console.log(`  - [${m.family}] ${m.reference}`));
    process.exitCode = 2;
  } else {
    console.log(`✓ passage_pool 100% validado (${poolCount} referências existem no texto)`);
  }

  // amostra de sanidade
  const { rows: [s] } = await pool.query(
    `SELECT text FROM bible_verses WHERE translation=$1 AND book='Filipenses' AND chapter=4 AND verse=6`,
    [TRANSLATION]);
  console.log(`\namostra — Filipenses 4:6: "${s.text.slice(0, 90)}…"`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
