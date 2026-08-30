// Sanidade local dos rascunhos — sem chamar API, custo zero.
//
// Existe porque a auditoria por IA (content:audit) julga QUALIDADE, mas não
// protege contra o modelo devolver lixo estrutural: tags internas vazando para
// dentro do texto, campo truncado, placeholder. Isso já aconteceu duas vezes.
// Rode isto SEMPRE depois de content:generate e content:regen.
//
// Uso: npm run content:check

import 'dotenv/config';
import { pool } from '../src/db.js';

const FIELDS = ['reflection', 'prayer', 'practice'] as const;

export function looksCorrupt(s: string): string | null {
  const t = (s ?? '').trim();
  if (t.length < 20) return 'muito curto';
  if (/<\/?\w|antml|&lt;\//i.test(t)) return 'contém marcação/tag';
  if (/^placeholder$/i.test(t)) return 'placeholder';
  if (!/[.!?…][)\]"'”»]?$/.test(t)) return 'sem pontuação final (truncado?)';
  return null;
}

async function main() {
  const { rows: byStatus } = await pool.query(
    `SELECT status, count(*)::int n FROM content_drafts GROUP BY status ORDER BY status`);
  console.log('STATUS: ' + byStatus.map((r: any) => `${r.status}=${r.n}`).join(' · '));

  const { rows: flagged } = await pool.query(
    `SELECT seed_id, review_note FROM content_drafts
      WHERE status='draft' AND review_note IS NOT NULL ORDER BY seed_id`);
  console.log(`\nMarcados pela auditoria: ${flagged.length}`);
  flagged.forEach((r: any) => console.log(`  ⚠ ${r.seed_id} — ${r.review_note}`));

  const { rows: drafts } = await pool.query(
    `SELECT seed_id, reflection, prayer, practice FROM content_drafts
      WHERE status IN ('draft','approved') ORDER BY seed_id`);
  const broken = drafts
    .map((d: any) => ({
      seed_id: d.seed_id,
      problemas: FIELDS.map((f) => { const p = looksCorrupt(d[f]); return p ? `${f}: ${p}` : null; })
        .filter(Boolean) as string[],
    }))
    .filter((d) => d.problemas.length);

  console.log(`\nCorrompidos: ${broken.length}`);
  broken.forEach((b) => console.log(`  ✗ ${b.seed_id} — ${b.problemas.join('; ')}`));

  const limpos = drafts.length - broken.length - flagged.length;
  console.log(`\n${limpos} de ${drafts.length} prontos para publicar.`);
  if (broken.length) process.exitCode = 1;
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
