/**
 * Cria o template `semente_plantada` na Meta e manda para revisão.
 *
 *   npm run template:plantada            # só mostra o que seria enviado
 *   npm run template:plantada -- --criar # cria de verdade
 *
 * PARA QUEM É ESTE TEMPLATE
 *
 * Para quem plantou a semente pelo APLICATIVO antes do horário do WhatsApp.
 * Ela continua tendo direito de receber no canal dela — é onde fica o registro
 * —, mas os dois botões do template normal não fazem mais sentido: plantar já
 * foi feito, e a troca do dia se fechou junto.
 *
 * POR QUE UM BOTÃO, E NÃO NENHUM
 *
 * Foi ideia do Lucas, e é melhor do que a minha (que era um template sem botão
 * nenhum). A razão é a janela de 24 horas: ela abre quando a PESSOA toca em
 * algo. Sem botão, só caberia no template o que entra em 1024 caracteres sem
 * quebra de linha nas variáveis — versículo, referência e reflexão — e oração,
 * prática e louvor ficariam de fora. Com o botão, o toque abre a janela e a
 * semente INTEIRA sai em seguida como texto livre, de graça.
 *
 * O rótulo é "Ver minha semente", não "Plantar": quem recebe esta mensagem já
 * plantou uma hora atrás, e convidar a plantar de novo soaria como se o
 * produto não tivesse registrado o primeiro gesto — que é exatamente a
 * impressão que este trabalho todo existe para eliminar.
 */
import 'dotenv/config';

const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA = (process.env.WA_BUSINESS_ACCOUNT_ID ?? '').trim();
const TOKEN = (process.env.WA_ACCESS_TOKEN ?? '').trim();
const NOME = (process.env.WA_TEMPLATE_PLANTADA ?? 'semente_plantada').trim();
const IDIOMA = (process.env.WA_TEMPLATE_LANG ?? 'pt_BR').trim();
export const BOTAO_VER = 'Ver minha semente';

// Mesmas duas variáveis do template diário, na mesma ordem: nome e referência.
// Manter a forma facilita a vida de quem for comparar os dois no Gerenciador.
// O nome vem DENTRO da frase, não abrindo a mensagem.
//
// Não é gosto: a Meta recusou a primeira versão com "As variáveis não podem
// estar no início ou no fim do modelo". Faz sentido do lado dela — um template
// que é só variável nas pontas é difícil de revisar. Aqui a troca até melhorou
// a leitura, porque a primeira coisa que a pessoa vê passou a ser a notícia.
const CORPO =
  'Sua semente de hoje já está plantada, {{1}} 🌱\n\n' +
  'Ela foi escolhida para o seu momento, e hoje traz {{2}}.\n\n' +
  'Toque abaixo para ler.';

const EXEMPLOS = [['Samir', 'Jeremias 29:11']];

const definicao = {
  name: NOME,
  language: IDIOMA,
  category: 'MARKETING',
  components: [
    { type: 'BODY', text: CORPO, example: { body_text: EXEMPLOS } },
    { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: BOTAO_VER }] },
  ],
};

(async () => {
  console.log('\n── O que será enviado para revisão ' + '─'.repeat(38));
  console.log(`  nome:      ${NOME}`);
  console.log(`  idioma:    ${IDIOMA}`);
  console.log(`  categoria: MARKETING  (a mesma do semente_do_dia_v3)\n`);
  const lido = CORPO.replace('{{1}}', EXEMPLOS[0][0]).replace('{{2}}', EXEMPLOS[0][1]);
  console.log(lido.split('\n').map((l) => '  │ ' + l).join('\n'));
  console.log('  │');
  console.log(`  │ [ ${BOTAO_VER} ]`);
  console.log('\n' + '─'.repeat(72) + '\n');

  if (process.argv[2] !== '--criar') {
    console.log('Nada foi enviado. Para criar de verdade:\n');
    console.log('  npm run template:plantada -- --criar\n');
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
    if (j.error?.error_subcode === 2388023) {
      console.error('\n  Esse nome já existe nesta conta. Veja o status no Gerenciador do WhatsApp.');
    }
    process.exit(1);
  }

  console.log(`Criado. id ${j.id}, status ${j.status ?? 'PENDING'}.`);
  console.log('\nEnquanto não for aprovado, quem plantar pelo app e estiver fora da');
  console.log('janela de 24h fica sem a mensagem daquele dia — o log registra como');
  console.log('wa_entrega_adiada, e nada quebra.\n');
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
