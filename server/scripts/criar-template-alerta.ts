/**
 * Cria o template `alerta_risco` na Meta e manda para revisão.
 *
 *   npm run template:alerta            # só mostra o que seria enviado
 *   npm run template:alerta -- --criar # cria de verdade
 *
 * Sem o --criar ele não toca em nada. Submeter template é uma ação que
 * aparece na conta da Meta e entra numa fila de revisão; não é coisa para
 * acontecer por engano ao rodar um script para "ver o que ele faz".
 *
 * POR QUE UTILITY, E NÃO MARKETING
 *
 * O template da semente só passou como Marketing — a Meta entendeu que uma
 * mensagem diária de conteúdo é divulgação, e é difícil discordar. Este aqui é
 * outra coisa: é um aviso operacional disparado por um evento, para o telefone
 * de quem opera o serviço. É o caso de manual de Utility. Se mesmo assim for
 * recusado, o caminho é reescrever o corpo, não trocar a categoria: um alerta
 * interno classificado como Marketing custaria 8x mais e ainda ficaria sujeito
 * a limite de marketing, que é o tipo de coisa que falha justamente no dia
 * movimentado.
 */
import 'dotenv/config';

const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA = (process.env.WA_BUSINESS_ACCOUNT_ID ?? '').trim();
const TOKEN = (process.env.WA_ACCESS_TOKEN ?? '').trim();
const NOME = (process.env.ALERTA_TEMPLATE ?? 'alerta_risco').trim();
const IDIOMA = (process.env.ALERTA_TEMPLATE_LANG ?? 'pt_BR').trim();

// Texto fixo em volta de cada variável, de propósito. A Meta recusa corpo que
// seja quase só variável, e também recusa variável colada no começo ou no fim.
const CORPO =
  'Sinal de risco emocional no Grão.\n\n' +
  'Pessoa: {{1}}\n' +
  'Nível: {{2}}\n' +
  'Onde: {{3}}\n\n' +
  'Abra o painel do Grão para ver o que foi dito. O trecho não viaja por aqui.';

const EXEMPLOS = [['Maria Clara', 'grave', 'WhatsApp']];

const definicao = {
  name: NOME,
  language: IDIOMA,
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      text: CORPO,
      example: { body_text: EXEMPLOS },
    },
  ],
};

(async () => {
  console.log('\n── O que será enviado para revisão ' + '─'.repeat(38));
  console.log(`  nome:      ${NOME}`);
  console.log(`  idioma:    ${IDIOMA}`);
  console.log(`  categoria: UTILITY\n`);
  console.log(CORPO.split('\n').map((l) => '  │ ' + l).join('\n'));
  console.log('\n  Com os exemplos preenchidos, a revisora da Meta lê:\n');
  console.log(
    CORPO.replace('{{1}}', EXEMPLOS[0][0]).replace('{{2}}', EXEMPLOS[0][1]).replace('{{3}}', EXEMPLOS[0][2])
      .split('\n').map((l) => '  │ ' + l).join('\n'));
  console.log('\n' + '─'.repeat(72) + '\n');

  if (process.argv[2] !== '--criar') {
    console.log('Nada foi enviado. Para criar de verdade:\n');
    console.log('  npm run template:alerta -- --criar\n');
    return;
  }

  if (!WABA || !TOKEN) {
    console.error('Faltam WA_BUSINESS_ACCOUNT_ID ou WA_ACCESS_TOKEN no .env.');
    process.exit(1);
  }

  const res = await fetch(`${GRAPH}/${WABA}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(definicao),
    signal: AbortSignal.timeout(30_000),
  });
  const j: any = await res.json().catch(() => ({}));

  if (!res.ok || j.error) {
    console.error('A Meta recusou a criação:');
    console.error('  ' + (j.error?.error_user_msg || j.error?.message || `HTTP ${res.status}`));
    // 100 com subcódigo 2388023 é nome repetido: o template já existe.
    if (j.error?.error_subcode === 2388023) {
      console.error('\n  Esse nome já existe nesta conta. Veja o status no Gerenciador do WhatsApp;');
      console.error('  se ele estiver reprovado, apague por lá antes de recriar.');
    }
    process.exit(1);
  }

  console.log(`Criado. id ${j.id}, status ${j.status ?? 'PENDING'}.`);
  console.log('\nA revisão costuma levar de minutos a algumas horas. Enquanto não for');
  console.log('aprovado, o envio falha com erro 132001 e o log registra — nada quebra.\n');
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
