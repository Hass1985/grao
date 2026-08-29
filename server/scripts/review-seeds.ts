// Revisão humana dos rascunhos — o portão de qualidade do conteúdo.
// NADA chega ao usuário sem passar por aqui.
//
// Uso:
//   npm run content:review                     → lista rascunhos pendentes
//   tsx scripts/review-seeds.ts show s-fe-3    → mostra um rascunho completo
//   tsx scripts/review-seeds.ts approve s-fe-3 s-paz-4 …   → aprova E publica
//   tsx scripts/review-seeds.ts reject s-fe-3 "motivo"     → rejeita com nota
//   tsx scripts/review-seeds.ts approve-all    → aprova E publica todos sem ⚠

import 'dotenv/config';
import { pool } from '../src/db.js';

const [cmd = 'list', ...args] = process.argv.slice(2);

async function publish(seedId: string): Promise<boolean> {
  const { rows: [d] } = await pool.query(
    `SELECT d.*, m.title mt, m.artist ma, m.spotify_url ms, m.youtube_url my
       FROM content_drafts d LEFT JOIN musics m ON m.id = d.music_id
      WHERE d.seed_id = $1 AND d.status IN ('draft','approved')`, [seedId]);
  if (!d) { console.log(`✗ ${seedId}: não encontrado ou já publicado/rejeitado`); return false; }
  await pool.query(
    `INSERT INTO seeds (id, family, type, passage, reference, reflection, prayer, practice, music_title, music_artist, music_spotify, music_youtube)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
       family=EXCLUDED.family, type=EXCLUDED.type, passage=EXCLUDED.passage, reference=EXCLUDED.reference,
       reflection=EXCLUDED.reflection, prayer=EXCLUDED.prayer, practice=EXCLUDED.practice,
       music_title=EXCLUDED.music_title, music_artist=EXCLUDED.music_artist,
       music_spotify=EXCLUDED.music_spotify, music_youtube=EXCLUDED.music_youtube`,
    [d.seed_id, d.family, d.type, d.passage, d.reference, d.reflection, d.prayer, d.practice,
     d.mt ?? null, d.ma ?? null, d.ms ?? null, d.my ?? null]);
  await pool.query(
    `UPDATE content_drafts SET status='published', reviewed_at=now() WHERE seed_id=$1`, [seedId]);
  console.log(`✓ publicado: ${seedId} (${d.family}/${d.type} · ${d.reference})`);
  return true;
}

async function main() {
  if (cmd === 'list') {
    const { rows } = await pool.query(
      `SELECT seed_id, family, type, reference, review_note,
              left(reflection, 70) preview
         FROM content_drafts WHERE status='draft' ORDER BY family, seed_id`);
    if (!rows.length) { console.log('Nenhum rascunho pendente. Gere com: npm run content:generate'); return; }
    console.log(`${rows.length} rascunho(s) pendente(s):\n`);
    rows.forEach((r: any) =>
      console.log(`  ${r.seed_id}  [${r.family}/${r.type}] ${r.reference}${r.review_note ? '  ⚠ ' + r.review_note : ''}\n     "${r.preview}…"`));
    console.log(`\nVer completo:  tsx scripts/review-seeds.ts show <seed_id>`);
    console.log(`Aprovar:       tsx scripts/review-seeds.ts approve <seed_id> [<seed_id>…]`);
    console.log(`Aprovar tudo:  tsx scripts/review-seeds.ts approve-all   (pula os marcados com ⚠)`);
  }

  else if (cmd === 'show') {
    const { rows: [d] } = await pool.query(
      `SELECT d.*, m.title mt, m.artist ma FROM content_drafts d
        LEFT JOIN musics m ON m.id = d.music_id WHERE d.seed_id = $1`, [args[0]]);
    if (!d) { console.log('não encontrado'); return; }
    console.log(`── ${d.seed_id} · ${d.family}/${d.type} · status: ${d.status} ──`);
    console.log(`\n"${d.passage}"\n— ${d.reference}`);
    console.log(`\nREFLEXÃO: ${d.reflection}`);
    console.log(`\nORAÇÃO:   ${d.prayer}`);
    console.log(`\nPRÁTICA:  ${d.practice}`);
    console.log(`\n♪ ${d.mt ?? '—'} — ${d.ma ?? ''}`);
    if (d.review_note) console.log(`\n⚠ ${d.review_note}`);
  }

  else if (cmd === 'approve') {
    for (const id of args) await publish(id);
  }

  else if (cmd === 'reject') {
    const [id, ...noteParts] = args;
    await pool.query(
      `UPDATE content_drafts SET status='rejected', review_note=$2, reviewed_at=now() WHERE seed_id=$1`,
      [id, noteParts.join(' ') || 'rejeitado na revisão']);
    console.log(`✗ rejeitado: ${id}`);
  }

  else if (cmd === 'approve-all') {
    const { rows } = await pool.query(
      `SELECT seed_id FROM content_drafts WHERE status='draft' AND review_note IS NULL ORDER BY seed_id`);
    let n = 0;
    for (const r of rows) { if (await publish(r.seed_id)) n++; }
    console.log(`\n${n} sementes publicadas.`);
    const { rows: flagged } = await pool.query(
      `SELECT seed_id, review_note FROM content_drafts WHERE status='draft'`);
    if (flagged.length) {
      console.log(`${flagged.length} ficaram para revisão manual (⚠):`);
      flagged.forEach((f: any) => console.log(`  ${f.seed_id}: ${f.review_note}`));
    }
  }

  else console.log('comandos: list · show <id> · approve <id…> · reject <id> [nota] · approve-all');

  // resumo de saúde ao final
  if (cmd === 'approve' || cmd === 'approve-all') {
    const { rows } = await pool.query(`SELECT * FROM v_content_health`);
    console.log('\nsaúde do conteúdo:');
    rows.forEach((r: any) =>
      console.log(`  ${r.family}: ${r.publicadas} publicadas · ${r.rascunhos} rascunhos · ${r.passagens_no_pool} passagens · ${r.musicas} músicas`));
  }
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
