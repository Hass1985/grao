/**
 * Ajuda a ligar o canal de avisos no Telegram.
 *
 *   npm run telegram -- <token-do-bot>          # descobre o chat_id
 *   npm run telegram -- <token> <chat_id>       # manda um aviso de teste
 *
 * O chat_id é a única parte chata do Telegram: ele não aparece em lugar nenhum
 * da interface. O jeito de descobrir é mandar uma mensagem no grupo e perguntar
 * ao bot o que ele viu — que é o que este script faz.
 *
 * COMO CHEGAR ATÉ AQUI
 *
 *  1. No Telegram, fale com @BotFather → /newbot → dê um nome → ele devolve um
 *     token parecido com 8123456789:AAH...;
 *  2. crie um grupo com quem precisa ser avisado e adicione o bot nele;
 *  3. mande `/start@nome_do_bot` NO GRUPO — com a arroba e o nome de usuário
 *     do bot. ELE NÃO VAI RESPONDER, e está certo: este bot não conversa, só
 *     manda aviso. O `/start` serve para ele ENXERGAR o grupo, não para
 *     puxar papo;
 *  4. rode este script com o token.
 *
 * O passo 3 é assim por um motivo. Todo bot nasce com o modo privacidade
 * LIGADO, e nesse modo ele não recebe as mensagens comuns do grupo: só as
 * endereçadas a ele. Um "oi" solto não apareceria aqui.
 *
 * E é para continuar ligado. Desligar faria o bot receber tudo que as quatro
 * pessoas escreverem no grupo, para sempre, em troca de nada — ele só precisa
 * FALAR. Num trabalho que existe para reduzir exposição de dados, abrir a
 * leitura de um grupo inteiro por conveniência de configuração seria irônico.
 */
import 'dotenv/config';

const token = (process.argv[2] ?? process.env.ALERTA_TELEGRAM_TOKEN ?? '').trim();
const chatArg = (process.argv[3] ?? '').trim();

if (!token) {
  console.log('\nFalta o token do bot.\n');
  console.log('  npm run telegram -- 8123456789:AAH...\n');
  console.log('Pegue o token com o @BotFather no próprio Telegram (/newbot).\n');
  process.exit(1);
}

// O token de exemplo que anda na documentação e nas instruções. Ele tem o
// formato certo, então passaria na checagem abaixo e só falharia lá na Meta,
// com "Unauthorized" — que faz a pessoa procurar defeito num bot que ela nem
// chegou a criar. Um exemplo bom de copiar é um exemplo que será copiado.
const EXEMPLO = '8123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';
if (token === EXEMPLO) {
  console.log('\nEsse é o token de EXEMPLO, não o seu.\n');
  console.log('Ele não pertence a bot nenhum — está nas instruções só para mostrar o');
  console.log('formato. O seu vem do @BotFather, no Telegram:\n');
  console.log('  1. procure BotFather (o do selo azul) e toque em Iniciar');
  console.log('  2. mande /newbot');
  console.log('  3. responda o nome:     Grão — avisos');
  console.log('  4. responda o username: grao_avisos_bot   (tem que terminar em bot)');
  console.log('  5. ele responde "Use this token to access the HTTP API:" e o token vem');
  console.log('     na linha seguinte — é aquele que entra aqui.\n');
  process.exit(1);
}

// Um token do Telegram é <números>:<letras e números>. Conferir o formato
// AQUI evita uma ida à rede que voltaria com "Not Found" — que não diz nada
// a quem está configurando e manda a pessoa procurar erro no lugar errado.
if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.log(`\nIsto não parece um token: ${token.length > 24 ? token.slice(0, 12) + '…' : token}\n`);
  if (/^COLE|^SEU_|TOKEN$|^<.*>$/i.test(token)) {
    console.log('Você colou o exemplo em vez do token. Troque pelo que o @BotFather');
    console.log('devolveu depois do /newbot — ele se parece com isto:\n');
  } else {
    console.log('O do Telegram tem esta cara — números, dois-pontos, e uma parte longa:\n');
  }
  console.log('  8123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw\n');
  process.exit(1);
}

(async () => {
  // Modo 2: já tem o chat_id, então é só provar que chega.
  if (chatArg) {
    process.env.ALERTA_TELEGRAM_TOKEN = token;
    process.env.ALERTA_TELEGRAM_CHAT = chatArg;
    const { mandarNoTelegram } = await import('../src/alerta.js');
    const r = await mandarNoTelegram(
      '⚠️ Sinal de risco emocional (em demonstração)\n' +
      'Maria Clara · ••••4321 · nível atenção · veio de WhatsApp\n' +
      'O que foi dito está no painel: ' + (process.env.BASE_URL ?? 'https://grao-backend.onrender.com') + '/admin');
    console.log(r.ok
      ? '\nMandei. Confira o grupo — é assim que o aviso vai chegar.\n'
      : `\nNão chegou: ${r.erro}\n`);
    process.exit(r.ok ? 0 : 1);
  }

  // Modo 1: descobrir o chat_id.
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    signal: AbortSignal.timeout(20_000),
  });
  const j: any = await res.json().catch(() => ({}));

  if (!j.ok) {
    console.log(`\nO Telegram recusou: ${j.description ?? `HTTP ${res.status}`}\n`);
    console.log('Se diz "Unauthorized", o token está errado ou foi revogado.\n');
    process.exit(1);
  }

  const vistos = new Map<string, string>();
  for (const u of j.result ?? []) {
    const c = u.message?.chat ?? u.channel_post?.chat;
    if (c) vistos.set(String(c.id), `${c.title ?? c.first_name ?? 'sem nome'} (${c.type})`);
  }

  if (!vistos.size) {
    console.log('\nO bot ainda não viu nenhuma conversa.\n');
    console.log('  1. crie um grupo e adicione o bot nele;');
    console.log('  2. mande /start@nome_do_bot NO GRUPO — com a arroba e o nome de usuário;');
    console.log('  3. rode este comando de novo.\n');
    console.log('Se você mandou só um "oi", é por isso: o bot nasce com modo privacidade');
    console.log('ligado e não recebe mensagem comum de grupo, só as endereçadas a ele.');
    console.log('Deixe a privacidade ligada — ele só precisa falar, não ler o grupo.\n');
    console.log('E não espere resposta dele no grupo: este bot não conversa, só manda');
    console.log('aviso. O silêncio depois do /start é o comportamento certo.\n');
    return;
  }

  console.log('\nConversas que o bot enxerga:\n');
  for (const [id, nome] of vistos) console.log(`  ${id.padEnd(16)} ${nome}`);
  console.log('\nO de grupo começa com "-". Para provar que chega:\n');
  console.log(`  npm run telegram -- ${token.slice(0, 10)}… ${[...vistos.keys()].find((k) => k.startsWith('-')) ?? '<chat_id>'}\n`);
  console.log('Depois, no Render:\n');
  console.log('  ALERTA_TELEGRAM_TOKEN = o token');
  console.log('  ALERTA_TELEGRAM_CHAT  = o chat_id\n');
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
