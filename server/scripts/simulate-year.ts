// Prova a garantia do calendário: simula um ano de entregas e FALHA se
// encontrar repetição.
//
// Três invariantes, verificadas em todos os dias simulados:
//  1. nenhuma semente entregue duas vezes ao mesmo usuário;
//  2. nenhum GESTO repetido dentro da janela mínima;
//  3. nenhum par marcado como semelhante dentro da janela mínima.
//
// A simulação usa o seletor REAL (selectSeedForUser), não uma cópia da lógica —
// senão provaria apenas que a simulação concorda consigo mesma. As entregas
// ficam num usuário descartável, apagado ao final.
//
// Uso: npm run content:simulate           (365 dias, 1 usuário)
//      tsx scripts/simulate-year.ts 365 5 (365 dias, 5 usuários)

import 'dotenv/config';
import { pool, deleteUserData, setMomentBySystem } from '../src/db.js';
import { selectSeedForUser } from '../src/seedSelector.js';

const DIAS = Number(process.argv[2] ?? 365);
const USUARIOS = Number(process.argv[3] ?? 1);
const JANELA_MINIMA = 5; // requisito de produto

const FAMILIAS = ['ansiedade', 'paz', 'esperança', 'propósito', 'gratidão',
  'fé', 'solidão', 'luto', 'culpa', 'alegria'];

interface Entrega { dia: number; seedId: string; family: string; gesture: string | null }

async function simularUsuario(n: number): Promise<{ falhas: string[]; entregas: Entrega[] }> {
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (name, phone_e164) VALUES ('simulação', $1) RETURNING id`,
    [`+55sim${Date.now()}${n}`]);
  const userId: string = u.id;

  const falhas: string[] = [];
  const entregas: Entrega[] = [];

  // Pares semelhantes, carregados uma vez.
  const { rows: simRows } = await pool.query(`SELECT seed_id, similar_id FROM seed_similar`);
  const semelhantes = new Set(simRows.map((r: any) => `${r.seed_id}|${r.similar_id}`));

  try {
    for (let dia = 0; dia < DIAS; dia++) {
      // O momento emocional muda ao longo do ano, como na vida real.
      if (dia % 11 === 0) await setMomentBySystem(userId, FAMILIAS[dia % FAMILIAS.length]);

      // Faz o relógio andar: empurra TODO o histórico um dia para trás antes
      // de escolher. Assim a entrega anterior fica sempre a 1 dia de distância,
      // a retrasada a 2, e a janela de proteção do seletor — que é avaliada
      // contra now() — enxerga o calendário fictício corretamente.
      //
      // Sem isso o teste passa vazio: todas as entregas simuladas ficam no
      // passado distante, a janela nunca contém nada e nada é filtrado.
      await pool.query(
        `UPDATE seed_deliveries SET delivered_at = delivered_at - interval '1 day'
          WHERE user_id = $1`, [userId]);

      const seed = await selectSeedForUser(userId);
      if (!seed) { falhas.push(`dia ${dia}: seletor não devolveu semente`); break; }

      const { rows: [meta] } = await pool.query(`SELECT gesture FROM seeds WHERE id = $1`, [seed.id]);
      const atual: Entrega = { dia, seedId: seed.id, family: seed.family, gesture: meta?.gesture ?? null };

      // 1. semente repetida
      const jaVista = entregas.find((e) => e.seedId === atual.seedId);
      if (jaVista) falhas.push(`dia ${dia}: ${atual.seedId} repetida (já entregue no dia ${jaVista.dia})`);

      // 2 e 3. repetição dentro da janela
      for (const e of entregas) {
        if (dia - e.dia >= JANELA_MINIMA) continue;
        if (atual.gesture && e.gesture === atual.gesture) {
          falhas.push(`dia ${dia}: gesto "${atual.gesture}" repetido ${dia - e.dia} dia(s) após ${e.seedId} (${atual.seedId})`);
        }
        if (semelhantes.has(`${e.seedId}|${atual.seedId}`)) {
          falhas.push(`dia ${dia}: ${atual.seedId} é semelhante a ${e.seedId}, entregue ${dia - e.dia} dia(s) antes`);
        }
      }

      entregas.push(atual);
    }
  } finally {
    await deleteUserData(userId);
  }
  return { falhas, entregas };
}

async function main() {
  const { rows: [pre] } = await pool.query(
    `SELECT count(*)::int total, count(*) FILTER (WHERE gesture IS NULL)::int sem_gesto FROM seeds`);
  console.log(`Base: ${pre.total} sementes · ${pre.sem_gesto} sem gesto etiquetado`);
  if (pre.sem_gesto) console.log('⚠ sementes sem gesto não participam da garantia — rode npm run content:gestures\n');

  console.log(`Simulando ${DIAS} dias × ${USUARIOS} usuário(s), janela mínima de ${JANELA_MINIMA} dias…\n`);

  let totalFalhas = 0;
  for (let n = 0; n < USUARIOS; n++) {
    const { falhas, entregas } = await simularUsuario(n);
    const familias = new Set(entregas.map((e) => e.family)).size;
    const gestos = new Set(entregas.map((e) => e.gesture).filter(Boolean)).size;
    console.log(`usuário ${n + 1}: ${entregas.length} entregas · ${familias} famílias · ${gestos} gestos distintos · ${falhas.length ? falhas.length + ' FALHA(S)' : 'sem repetição ✓'}`);
    falhas.slice(0, 10).forEach((f) => console.log(`   ✗ ${f}`));
    if (falhas.length > 10) console.log(`   … e mais ${falhas.length - 10}`);
    totalFalhas += falhas.length;
  }

  console.log(`\n${'═'.repeat(60)}`);
  if (totalFalhas) {
    console.log(`✗ GARANTIA VIOLADA: ${totalFalhas} ocorrência(s)`);
    process.exitCode = 1;
  } else {
    console.log(`✓ GARANTIA CUMPRIDA: ${DIAS} dias sem semente repetida, sem gesto repetido em menos de ${JANELA_MINIMA} dias e sem par semelhante próximo.`);
  }
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
