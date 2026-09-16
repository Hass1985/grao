// Teste da máquina de estados da troca de sentimento.
//
// Roda com o envio à Meta DESLIGADO (sem WA_PHONE_NUMBER_ID), então nenhuma
// mensagem sai de verdade. O que se verifica aqui é o que costuma quebrar: os
// quatro estados por dia, a regra de uma semente por dia e a troca permanente
// do sentimento.
//
//   npm run wa:troca

import 'dotenv/config';

// Antes de qualquer import que leia a configuração da Meta.
delete process.env.WA_PHONE_NUMBER_ID;

const { pool } = await import('../src/db.js');
const { estadoDoDia, pedirRelato, receberRelato, responderForaDeFluxo, fecharDia } =
  await import('../src/trocaDeSentimento.js');
const { getMoment } = await import('../src/db.js');

let passou = 0, falhou = 0;
function confere(nome: string, ok: boolean, detalhe = '') {
  if (ok) { passou++; console.log(`  ✓ ${nome}`); }
  else { falhou++; console.log(`  ✗ ${nome}${detalhe ? '  — ' + detalhe : ''}`); }
}

async function main() {
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (name, phone_e164, timezone, delivery_time)
     VALUES ('Teste Troca', '+5511900000099', 'America/Sao_Paulo', '07:00')
     RETURNING id`);
  const id = u.id;
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, price_cents, trial_ends_at)
     VALUES ($1, 'plantio', 'cortesia', 1990, NULL)`, [id]);

  console.log('ESTADO INICIAL');
  let e = await estadoDoDia(id);
  confere('dia aberto', e.fechado === false);
  confere('nenhuma porta usada', e.porta === null);
  confere('não está esperando relato', e.aguardandoRelato === false);
  confere('fora de fluxo não enviado', e.foraDeFluxoEnviada === false);

  console.log('\nTOQUE EM "MEU SENTIMENTO MUDOU"');
  await pedirRelato(id, '+5511900000099');
  e = await estadoDoDia(id);
  confere('passou a esperar o relato', e.aguardandoRelato === true);
  confere('dia continua aberto', e.fechado === false);

  console.log('\nCHEGA O RELATO (texto)');
  const antes = await getMoment(id);
  const consumiu = await receberRelato(id, '+5511900000099', {
    type: 'text',
    text: { body: 'Estou muito ansioso, sem dormir, com medo de perder o emprego e as contas atrasando.' },
  });
  confere('a mensagem foi consumida pelo fluxo', consumiu === true);
  confere('a espera fecha mesmo com o envio falhando',
    (await estadoDoDia(id)).aguardandoRelato === false);
  const depois = await getMoment(id);
  confere('o sentimento foi trocado', depois !== antes, `antes=${antes} depois=${depois}`);
  confere('leu como ansiedade', depois === 'ansiedade', `leu ${depois}`);

  console.log('\nO DIA FECHA');
  // O envio falhou de propósito (Meta desligada), então fechamos na mão para
  // seguir testando o que vem depois do fechamento.
  await fecharDia(id, 'troca');
  e = await estadoDoDia(id);
  confere('dia fechado', e.fechado === true);
  confere('porta registrada como troca', e.porta === 'troca', `porta=${e.porta}`);

  console.log('\nREGRA CENTRAL: UMA SEMENTE POR DIA');
  const sementesAntes = (await pool.query(
    'SELECT count(*)::int n FROM seed_deliveries WHERE user_id = $1', [id])).rows[0].n;
  await pedirRelato(id, '+5511900000099');
  e = await estadoDoDia(id);
  confere('a segunda porta não reabre a espera', e.aguardandoRelato === false);
  const sementesDepois = (await pool.query(
    'SELECT count(*)::int n FROM seed_deliveries WHERE user_id = $1', [id])).rows[0].n;
  confere('nenhuma semente extra foi consumida', sementesAntes === sementesDepois,
    `antes=${sementesAntes} depois=${sementesDepois}`);

  console.log('\nTEXTO LIVRE FORA DO FLUXO');
  const r1 = await responderForaDeFluxo(id, '+5511900000099');
  confere('primeira mensagem é consumida', r1 === true);
  // O envio falha com a Meta desligada, então a marca não é gravada. Gravamos
  // na mão para testar o silêncio da segunda mensagem.
  await pool.query(
    `UPDATE users SET wa_fora_fluxo_em = (now() AT TIME ZONE timezone)::date WHERE id = $1`, [id]);
  e = await estadoDoDia(id);
  confere('marca de fora de fluxo gravada', e.foraDeFluxoEnviada === true);
  const r2 = await responderForaDeFluxo(id, '+5511900000099');
  confere('segunda mensagem consumida sem resposta', r2 === true);

  console.log('\nA TROCA É PERMANENTE');
  const { rows: [mom] } = await pool.query(
    `SELECT family, updated_at FROM user_moment WHERE user_id = $1`, [id]);
  confere('sentimento gravado, e não só em memória', mom?.family === 'ansiedade',
    `user_moment=${mom?.family ?? 'vazio'}`);

  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  console.log(`\n${passou} passaram, ${falhou} falharam`);
  if (falhou) process.exitCode = 1;
}

main()
  .catch((e) => { console.error('ERRO', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
