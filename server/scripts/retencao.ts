/**
 * O que a política de retenção apagaria hoje.
 *
 *   npm run retencao              # só conta
 *   npm run retencao -- --aplicar # executa agora
 *
 * Em produção isto roda sozinho, uma vez por dia, dentro da agenda. O script
 * existe para duas coisas: ver o efeito de um prazo antes de mudá-lo, e
 * aplicar na hora depois de mudar, sem esperar o ciclo.
 */
import 'dotenv/config';
import { pool } from '../src/db.js';
import { passarAFaxina, PRAZOS } from '../src/retencao.js';

const APLICAR = process.argv.includes('--aplicar');

(async () => {
  console.log('\n── prazos em vigor ' + '─'.repeat(40));
  console.log(`  trecho do sinal de risco   ${PRAZOS.trechoDeRisco()} dias   (o evento fica; só a frase sai)`);
  console.log(`  o que a pessoa falou       ${PRAZOS.fala()} dias`);
  console.log(`  leitura emocional          ${PRAZOS.leitura()} dias`);
  console.log(`  trilha de uso              ${PRAZOS.trilha()} dias`);
  console.log('\n  nunca expiram: o diário, o Campo, as memórias, os dias lidos\n');

  const r = await passarAFaxina(!APLICAR);
  const total = r.trechosApagados + r.falasApagadas + r.leiturasApagadas + r.eventosApagados;

  console.log('── ' + (APLICAR ? 'apagado agora' : 'apagaria hoje') + ' ' + '─'.repeat(38));
  console.log(`  ${String(r.trechosApagados).padStart(5)}  trechos de fala em sinais de risco`);
  console.log(`  ${String(r.falasApagadas).padStart(5)}  falas`);
  console.log(`  ${String(r.leiturasApagadas).padStart(5)}  leituras emocionais`);
  console.log(`  ${String(r.eventosApagados).padStart(5)}  eventos da trilha`);

  if (!total) {
    console.log('\n  Nada vencido. O produto tem menos tempo de vida que o prazo mais curto.\n');
  } else if (!APLICAR) {
    console.log('\n  Nada foi alterado. Acrescente --aplicar para executar.\n');
  } else {
    console.log('');
  }
  await pool.end();
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
