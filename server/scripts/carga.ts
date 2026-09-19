// Teste de carga da entrega diária.
//
// A pergunta que ele responde é uma só: se amanhã houver N assinantes pedindo
// a semente no mesmo horário, quanto tempo a última pessoa da fila espera?
//
// Cria assinantes sintéticos, roda a varredura DE VERDADE contra o banco de
// verdade — mesma consulta, mesma escolha de semente, mesma concorrência — e
// apaga tudo no fim. A única peça trocada é o envio à Meta, substituído por
// uma espera do tamanho da ida e volta real (medida antes). Mandar mensagem
// para números inventados seria gastar template e sujar a qualidade do número.
//
//   npm run carga              → 200 assinantes
//   npm run carga -- 1000      → mil
//   npm run carga -- 1000 16   → mil, com largura 16
//
// O banco é o de produção. Os usuários criados têm telefone na faixa
// +5599######## reservada para isto, nome "carga-" e são removidos no fim,
// inclusive se o teste falhar no meio.

import 'dotenv/config';
import { pool } from '../src/db.js';
import { TEM_ACESSO_SQL } from '../src/acesso.js';
import { getOrSelectTodaySeed } from '../src/seedSelector.js';

const MARCA = 'carga-';
const ms = (t: bigint) => Number(process.hrtime.bigint() - t) / 1e6;

/** Ida e volta real até a Graph API, medida uma vez e reusada como atraso. */
async function medirRede(): Promise<number> {
  const amostras: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t = process.hrtime.bigint();
    await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WA_PHONE_NUMBER_ID}?fields=id`,
      { headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` } },
    ).catch(() => null);
    amostras.push(ms(t));
  }
  amostras.sort((a, b) => a - b);
  return amostras[1];   // mediana das três
}

async function criar(n: number): Promise<void> {
  // Uma única inserção para n usuários: criar um por vez faria o preparo do
  // teste demorar mais que o teste.
  await pool.query(
    `INSERT INTO users (name, phone_e164, timezone, delivery_time, wa_opt_in_at)
     SELECT $1 || i, '+5599' || lpad(i::text, 8, '0'), 'America/Sao_Paulo',
            (now() AT TIME ZONE 'America/Sao_Paulo')::time - interval '5 minutes', now()
       FROM generate_series(1, $2) i`, [MARCA, n]);
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, price_cents, trial_ends_at)
     SELECT id, 'plantio', 'cortesia', 1990, NULL FROM users WHERE name LIKE $1`,
    [MARCA + '%']);
}

async function limpar(): Promise<number> {
  const r = await pool.query(`DELETE FROM users WHERE name LIKE $1`, [MARCA + '%']);
  return r.rowCount ?? 0;
}

async function main() {
  const n = Number(process.argv[2] ?? 200);
  const largura = Number(process.argv[3] ?? process.env.GRAO_LARGURA_ENTREGA ?? 8);
  if (!Number.isFinite(n) || n < 1 || n > 20000) {
    console.log('✗ quantidade inválida (1 a 20000)'); process.exit(1);
  }

  console.log(`TESTE DE CARGA · ${n} assinantes · largura ${largura}\n`);

  const rede = await medirRede();
  console.log(`  ida e volta até a Meta (mediana): ${rede.toFixed(0)} ms — usada como atraso simulado\n`);

  const sujeira = await limpar();
  if (sujeira) console.log(`  (${sujeira} usuário(s) de carga anterior removidos)\n`);

  let t = process.hrtime.bigint();
  await criar(n);
  console.log(`  preparo: ${n} assinantes criados em ${ms(t).toFixed(0)} ms`);

  try {
    // A MESMA consulta da agenda, palavra por palavra.
    t = process.hrtime.bigint();
    const { rows: usuarios } = await pool.query(
      `SELECT u.id, u.phone_e164, u.name,
              (u.wa_last_inbound_at > now() - interval '24 hours') janela_aberta
         FROM users u JOIN subscriptions s ON s.user_id = u.id
        WHERE ${TEM_ACESSO_SQL('s')}
          AND u.wa_opt_in_at IS NOT NULL AND u.phone_e164 IS NOT NULL
          AND ((now() AT TIME ZONE u.timezone)::time - u.delivery_time)
                BETWEEN interval '0' AND (3 * interval '1 hour')
          AND NOT EXISTS (
                SELECT 1 FROM seed_deliveries d WHERE d.user_id = u.id
                  AND d.sent_wa_at IS NOT NULL
                  AND (d.delivered_at AT TIME ZONE u.timezone)::date
                    = (now() AT TIME ZONE u.timezone)::date)`);
    const consultaMs = ms(t);
    console.log(`  consulta da agenda: ${usuarios.length} elegíveis em ${consultaMs.toFixed(0)} ms\n`);

    // A varredura, com a mesma mecânica de largura fixa da agenda.
    const inicio = process.hrtime.bigint();
    const tempos: number[] = [];
    let erros = 0;
    const fila = [...usuarios];

    const trabalhar = async () => {
      for (;;) {
        const u = fila.shift();
        if (!u) return;
        const t0 = process.hrtime.bigint();
        try {
          await getOrSelectTodaySeed(u.id);     // escolha real, grava entrega real
          await new Promise((r) => setTimeout(r, rede));  // no lugar do envio
          tempos.push(ms(t0));
        } catch {
          erros++;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(largura, usuarios.length) }, trabalhar));

    const total = ms(inicio);
    tempos.sort((a, b) => a - b);
    const p = (q: number) => tempos[Math.min(tempos.length - 1, Math.floor(tempos.length * q))] ?? 0;

    console.log('RESULTADO');
    console.log(`  tempo total                 ${(total / 1000).toFixed(1)} s`);
    console.log(`  vazão                       ${(usuarios.length / (total / 1000)).toFixed(1)} entregas/s`);
    console.log(`  por entrega  ·  mediana     ${p(0.5).toFixed(0)} ms`);
    console.log(`               ·  p95         ${p(0.95).toFixed(0)} ms`);
    console.log(`               ·  pior        ${p(1).toFixed(0)} ms`);
    console.log(`  erros                       ${erros}`);
    console.log('');
    console.log(`  A ÚLTIMA PESSOA DA FILA ESPERA ${(total / 1000 / 60).toFixed(1)} MINUTO(S)`);
    console.log('');
    console.log('  Projeção com esta mesma vazão:');
    for (const alvo of [1000, 5000, 10000]) {
      const seg = alvo / (usuarios.length / (total / 1000));
      console.log(`    ${String(alvo).padStart(6)} assinantes  →  ${(seg / 60).toFixed(1)} min`);
    }
  } finally {
    const apagados = await limpar();
    console.log(`\n  limpeza: ${apagados} assinantes sintéticos removidos`);
  }
  await pool.end();
}

main().catch(async (e) => {
  console.error('ERRO', e.message);
  await limpar().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
