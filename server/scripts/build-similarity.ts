// Calcula os pares de sementes SEMELHANTES e grava em seed_similar.
//
// O seletor usa essa tabela para nunca entregar duas sementes parecidas dentro
// da janela de proteção (ver COOLDOWN_DIAS em seedSelector.ts). É o que faz a
// garantia de espaçamento existir de fato, e não só como recomendação.
//
// Similaridade = Jaccard sobre palavras significativas, calculado separadamente
// para a PRÁTICA (o gesto que a pessoa executa) e para a ABERTURA da reflexão
// (as primeiras palavras que ela lê). São os dois pontos onde a repetição
// aparece para o usuário.
//
// O limiar é deliberadamente mais baixo que o da auditoria (0.45): aqui um
// falso positivo custa barato — só adia uma semente — enquanto um falso
// negativo entrega repetição para o usuário.
//
// Uso: npm run content:similarity        (limiar 0.30)
//      tsx scripts/build-similarity.ts 0.25

import 'dotenv/config';
import { pool } from '../src/db.js';

const LIMIAR = Number(process.argv[2] ?? 0.3);

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

async function main() {
  const { rows } = await pool.query<{ id: string; family: string; practice: string; opening: string }>(
    `SELECT id, family, practice, left(reflection, 80) opening FROM seeds ORDER BY family, id`);

  const porFamilia = new Map<string, typeof rows>();
  rows.forEach((r) => { (porFamilia.get(r.family) ?? porFamilia.set(r.family, []).get(r.family)!).push(r); });

  const pares: Array<{ a: string; b: string; score: number; motivo: string }> = [];

  for (const [, lista] of porFamilia) {
    const tk = lista.map((s) => ({ p: tokens(s.practice), o: tokens(s.opening) }));
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const sp = jaccard(tk[i].p, tk[j].p);
        const so = jaccard(tk[i].o, tk[j].o);
        // guarda o maior dos dois: basta um dos eixos repetir para incomodar
        const [score, motivo] = sp >= so ? [sp, 'pratica'] : [so, 'abertura'];
        if (score >= LIMIAR) pares.push({ a: lista[i].id, b: lista[j].id, score, motivo });
      }
    }
  }

  await pool.query('TRUNCATE seed_similar');
  for (const p of pares) {
    // grava nos dois sentidos: o seletor consulta por lookup direto
    await pool.query(
      `INSERT INTO seed_similar (seed_id, similar_id, score, motivo) VALUES ($1,$2,$3,$4), ($2,$1,$3,$4)
       ON CONFLICT DO NOTHING`,
      [p.a, p.b, p.score, p.motivo]);
  }

  const { rows: [t] } = await pool.query(
    `SELECT count(*)::int linhas, count(DISTINCT seed_id)::int sementes FROM seed_similar`);
  console.log(`${pares.length} par(es) acima de ${(LIMIAR * 100).toFixed(0)}% · ${t.linhas} linhas · ${t.sementes} sementes envolvidas`);

  // maior grau: quantas semelhantes uma única semente tem. Se for alto demais,
  // a janela de proteção pode ficar sem candidatos.
  const { rows: grau } = await pool.query(
    `SELECT seed_id, count(*)::int n FROM seed_similar GROUP BY seed_id ORDER BY n DESC LIMIT 5`);
  if (grau.length) {
    console.log('\nsementes com mais semelhantes:');
    grau.forEach((g: any) => console.log(`  ${g.seed_id}: ${g.n}`));
  }

  pares.sort((x, y) => y.score - x.score);
  console.log('\npares mais fortes:');
  pares.slice(0, 8).forEach((p) =>
    console.log(`  ${(p.score * 100).toFixed(0)}% ${p.motivo}: ${p.a} ≈ ${p.b}`));
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
