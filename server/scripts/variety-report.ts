// Medidor de VARIEDADE — custo zero de API.
//
// A auditoria de IA julga repetição lendo; este script a quantifica por
// similaridade lexical (Jaccard de palavras significativas) entre práticas e
// entre aberturas de reflexão DENTRO de cada família. Pares muito parecidos
// são listados para o revisor decidir: reescrever ou apenas espaçar no
// calendário de entrega.
//
// Uso: npm run content:variety            (drafts + publicadas)
//      tsx scripts/variety-report.ts 0.5  (limiar customizado, padrão 0.45)

import 'dotenv/config';
import { pool } from '../src/db.js';

const THRESHOLD = Number(process.argv[2] ?? 0.45);

const STOP = new Set(('a o e de da do em um uma para pra com que no na se ao à seu sua você deus senhor hoje ' +
  'depois antes enquanto diga dizendo voz alta baixa baixinho frase palavra minuto minutos agora').split(' '));

function tokens(s: string): Set<string> {
  return new Set(
    (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

interface Row { seed_id: string; family: string; practice: string; opening: string }

async function main() {
  const { rows } = await pool.query<Row>(
    `SELECT seed_id, family, practice, left(reflection, 80) opening FROM (
       SELECT id seed_id, family, practice, reflection FROM seeds
       UNION ALL
       SELECT seed_id, family, practice, reflection FROM content_drafts WHERE status = 'draft'
     ) x ORDER BY family, seed_id`);

  const byFam = new Map<string, Row[]>();
  rows.forEach((r) => { (byFam.get(r.family) ?? byFam.set(r.family, []).get(r.family)!).push(r); });

  let pairs = 0;
  for (const [family, list] of byFam) {
    const dupes: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const pi = tokens(list[i].practice), oi = tokens(list[i].opening);
      for (let j = i + 1; j < list.length; j++) {
        const sp = jaccard(pi, tokens(list[j].practice));
        const so = jaccard(oi, tokens(list[j].opening));
        if (sp >= THRESHOLD) dupes.push(`prática  ${list[i].seed_id} ≈ ${list[j].seed_id} (${(sp * 100).toFixed(0)}%)`);
        if (so >= THRESHOLD) dupes.push(`abertura ${list[i].seed_id} ≈ ${list[j].seed_id} (${(so * 100).toFixed(0)}%)`);
      }
    }
    console.log(`${family}: ${list.length} sementes · ${dupes.length ? dupes.length + ' par(es) parecidos' : 'variedade ok ✓'}`);
    dupes.forEach((d) => console.log(`   ⚠ ${d}`));
    pairs += dupes.length;
  }
  console.log(`\n${rows.length} sementes analisadas · ${pairs} par(es) acima de ${(THRESHOLD * 100).toFixed(0)}% de similaridade`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
