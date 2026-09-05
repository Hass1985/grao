// Carrega o devocional anual no banco, a partir do JSON extraído do PDF.
//
// O JSON fica versionado em db/devocional-anual.json de propósito: o PDF é a
// fonte editorial, mas o parser dele tem escolhas (onde termina o título, onde
// começa a referência bíblica) que não dá para refazer de cabeça. Guardar o
// resultado revisado, e não só o PDF, é o que torna a importação repetível.
//
// Idempotente: rodar de novo atualiza o texto do dia em vez de duplicar.
//
// Uso: npm run content:devocional

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pool } from '../src/db.js';

interface Dia {
  mes: number; dia: number; titulo: string;
  corpo: string; versiculo: string; referencia: string; bissexto?: boolean;
}

async function main() {
  const dias: Dia[] = JSON.parse(readFileSync('db/devocional-anual.json', 'utf-8'));

  const faltando = dias.filter((d) => !d.titulo || !d.corpo || !d.versiculo || !d.referencia);
  if (faltando.length) {
    console.log(`✗ ${faltando.length} dia(s) incompletos no JSON — importação abortada`);
    for (const d of faltando.slice(0, 5)) console.log(`   ${d.dia}/${d.mes}`);
    process.exit(1);
  }

  let novos = 0, atualizados = 0;
  for (const d of dias) {
    const { rows: [r] } = await pool.query(
      `INSERT INTO devotionals (month, day, title, body, verse, reference)
            VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (month, day) DO UPDATE
              SET title = excluded.title, body = excluded.body,
                  verse = excluded.verse, reference = excluded.reference
       RETURNING (xmax = 0) AS inserido`,
      [d.mes, d.dia, d.titulo, d.corpo, d.versiculo, d.referencia]);
    r.inserido ? novos++ : atualizados++;
  }

  const { rows: [c] } = await pool.query(`SELECT count(*)::int n FROM devotionals`);
  console.log(`${novos} novo(s), ${atualizados} atualizado(s) · ${c.n} dias no banco`);

  // Confere a cobertura no próprio banco, não só no arquivo: é o banco que o
  // app consulta, e uma linha que falhou em silêncio vira tela vazia num dia
  // qualquer do ano.
  const { rows: buracos } = await pool.query(`
    WITH esperado AS (
      SELECT extract(month from d)::int m, extract(day from d)::int dia
        FROM generate_series(date '2024-01-01', date '2024-12-31', interval '1 day') d
    )
    SELECT m, dia FROM esperado e
     WHERE NOT EXISTS (SELECT 1 FROM devotionals v WHERE v.month = e.m AND v.day = e.dia)
     ORDER BY m, dia`);
  console.log(buracos.length
    ? `✗ faltam ${buracos.length} dia(s): ${buracos.slice(0, 8).map((b: any) => `${b.dia}/${b.m}`).join(', ')}`
    : '✓ ano completo, 29 de fevereiro incluído');
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
