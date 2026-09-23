/**
 * Mostra o que o time receberia quando o detector de risco dispara.
 *
 *   npm run alerta
 *
 * Sobe um receptor aqui mesmo, aponta o ALERTA_WEBHOOK_URL para ele e dispara
 * os casos. Nada é enviado para fora, e nenhum evento é gravado: serve para
 * conferir o formato e a trava de repetição antes de plugar o Slack de verdade.
 */
import 'dotenv/config';
import http from 'node:http';
import { pool } from '../src/db.js';

const PORTA = 4555;

(async () => {
  // Com uma URL no argumento, manda UM aviso de verdade para lá — é assim que
  // se confere se o Slack (ou o Discord, ou o n8n) está mesmo recebendo, antes
  // de descobrir isso no dia em que alguém precisar.
  //
  //   npm run alerta -- https://hooks.slack.com/services/...
  const destino = process.argv[2];
  if (destino) {
    process.env.ALERTA_WEBHOOK_URL = destino;
    process.env.BASE_URL = process.env.BASE_URL || 'https://grao-backend.onrender.com';
    const { avisarRisco } = await import('../src/alerta.js');
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE name IS NOT NULL ORDER BY created_at LIMIT 1`);
    if (!rows[0]) { console.log('Nenhum cadastro com nome no banco.'); await pool.end(); return; }
    await avisarRisco(rows[0].id, { nivel: 'atencao', origem: 'teste de configuração', teste: true });
    console.log('\nMandei um aviso marcado como demonstração. Confira o canal.\n');
    await pool.end();
    return;
  }

  const recebidos: any[] = [];
  const servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (c) => (corpo += c));
    req.on('end', () => {
      try { recebidos.push(JSON.parse(corpo)); } catch { recebidos.push({ cru: corpo }); }
      res.writeHead(200).end('ok');
    });
  });
  await new Promise<void>((ok) => servidor.listen(PORTA, ok));

  process.env.ALERTA_WEBHOOK_URL = `http://localhost:${PORTA}/`;
  process.env.BASE_URL = process.env.BASE_URL || 'https://grao-backend.onrender.com';

  // Importado DEPOIS da variável: o módulo lê a URL a cada chamada, mas deixar
  // explícito evita que alguém "melhore" isso para uma constante de topo e o
  // teste passe a não enviar nada, em silêncio.
  const { avisarRisco } = await import('../src/alerta.js');

  const { rows } = await pool.query(
    `SELECT id, name FROM users WHERE name IS NOT NULL ORDER BY created_at LIMIT 2`);
  if (rows.length < 2) {
    console.log('Preciso de dois cadastros com nome no banco para este teste.');
    servidor.close(); await pool.end(); return;
  }
  const [a, b] = rows;

  console.log('\nDisparando…\n');
  await avisarRisco(a.id, { nivel: 'grave', origem: 'WhatsApp' });
  await avisarRisco(a.id, { nivel: 'atencao', origem: 'resposta escrita' }); // deve ser engolido
  await avisarRisco(b.id, { nivel: 'atencao', origem: 'abertura', teste: true });

  await new Promise((r) => setTimeout(r, 400));

  console.log(`Avisos que chegariam ao time: ${recebidos.length} (o 2º é da mesma pessoa em menos de 30 min, e não deve aparecer)\n`);
  recebidos.forEach((m, i) => {
    console.log(`── aviso ${i + 1} ` + '─'.repeat(46));
    console.log(m.text);
    console.log('');
  });

  const temTrecho = recebidos.some((m) => JSON.stringify(m).match(/trecho/i));
  console.log(temTrecho
    ? '⚠  ALGUM AVISO CARREGA O TRECHO DA FALA — isso não pode sair daqui.'
    : '✓  Nenhum aviso carrega o trecho da fala. O contexto fica no painel.');

  servidor.close();
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
