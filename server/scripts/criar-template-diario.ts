/**
 * TENTATIVA FRACASSADA, guardada porque o porquê vale mais que o script.
 *
 * Cria `semente_do_dia_v4` na Meta pedindo UTILITY. Ela aprova como MARKETING
 * de qualquer forma — ver "O RESULTADO" mais abaixo antes de rodar de novo.
 *
 *   npm run template:diario            # só mostra o que seria enviado
 *   npm run template:diario -- --criar # cria de verdade
 *
 * POR QUE UM v4
 *
 * O v3 está aprovado e funcionando — e classificado como MARKETING. A Meta
 * limita quantas mensagens de marketing uma pessoa recebe, e o limite aparece
 * como o erro 131049: "This message was not delivered to maintain healthy
 * ecosystem engagement". Medido numa pessoa só, em 24 horas: 192 recusas.
 *
 * Um devocional que a pessoa pediu, cujo horário ela escolheu e que ela pode
 * desligar quando quiser não é marketing — é o serviço que ela assinou. Essa é
 * a definição de UTILITY da própria Meta: mensagem sobre uma transação ou
 * assinatura combinada.
 *
 * O QUE MUDOU NO TEXTO, E POR QUÊ
 *
 * O v3 dizia "Toque em Plantar para receber a reflexão, a prática e o louvor".
 * Listar o que vem dentro é descrever um benefício, e descrever benefício é o
 * que faz um classificador ler promoção. O v4 diz o que a mensagem é — a
 * entrega de hoje chegou, aqui está a leitura — e deixa o conteúdo para o
 * conteúdo.
 *
 * O 🌱 fica. Ele não é o que pesa na classificação, e é a assinatura visual do
 * produto no único lugar onde a pessoa vê o Grão antes de abrir.
 *
 * OS DOIS BOTÕES SÃO IGUAIS AO v3, E ISSO NÃO É DETALHE
 *
 * O webhook reconhece a porta pelo RÓTULO do botão (ver portaTocada, em
 * metaWebhook.ts): "Meu sentimento mudou" vira troca, qualquer outro vira
 * plantar. Mantendo os dois rótulos, nenhuma linha de código muda quando o
 * template for trocado — é só apontar WA_TEMPLATE_DIARIO para o v4.
 *
 * O RESULTADO: NÃO FUNCIONOU, E O MOTIVO IMPORTA
 *
 * Submetido em 05/10/2026 pedindo UTILITY. A Meta aprovou na hora e classificou
 * como MARKETING assim mesmo — sem recusar, sem avisar. Eu tinha escrito aqui
 * que omitir `allow_category_change` faria a discordância virar recusa. Está
 * errado: ela sobrepõe em silêncio de qualquer jeito.
 *
 * E o texto não é a causa. Pela definição da Meta, UTILITY é mensagem
 * disparada por uma AÇÃO que a pessoa acabou de tomar — confirmação de pedido,
 * aviso de entrega, cobrança, alerta de conta. O critério é "ela está
 * esperando exatamente esta informação por causa de algo que acabou de fazer".
 *
 * A semente diária não é isso. É conteúdo recorrente, em horário agendado,
 * sem ação imediata que a dispare. Na taxonomia da Meta isso é MARKETING por
 * natureza, não por redação — reescrever não resolve, e tentar de novo com
 * outras palavras é gastar tempo contra um classificador que está certo
 * segundo as regras dele.
 *
 * O QUE PROVAVELMENTE ERA O PROBLEMA DE VERDADE
 *
 * O limite de frequência pode ter sido em boa parte auto-infligido: o laço de
 * reenvio mandava ~180 tentativas de template por dia para o MESMO número.
 * Isso foi corrigido (ver agenda.ts, TENTATIVAS_MAXIMAS). Antes de procurar
 * outro caminho, vale observar alguns dias com no máximo três tentativas.
 *
 * Este arquivo fica como registro. O v4 existe na Meta, como MARKETING, e NÃO
 * deve ser usado: trocar o v3 por ele não mudaria nada.
 */
import 'dotenv/config';

const GRAPH = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.WA_ACCESS_TOKEN ?? '';
const WABA = process.env.WA_BUSINESS_ACCOUNT_ID ?? '';

const TEMPLATE = {
  name: 'semente_do_dia_v4',
  language: 'pt_BR',
  category: 'UTILITY',
  parameter_format: 'NAMED',
  components: [
    {
      type: 'BODY',
      text:
        'Olá {{nome}}, sua semente de hoje está pronta 🌱\n\n' +
        'A leitura é {{referencia}}.\n\n' +
        'Toque em Plantar para abrir. Se o seu momento mudou, me conta antes.',
      example: {
        body_text_named_params: [
          { param_name: 'nome', example: 'Marcos' },
          { param_name: 'referencia', example: 'João 6:20' },
        ],
      },
    },
    { type: 'FOOTER', text: 'Grão · uma semente por dia' },
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Plantar' },
        // Igual ao v3, palavra por palavra: é por este rótulo que o webhook
        // sabe que a porta é a troca de sentimento.
        { type: 'QUICK_REPLY', text: 'Meu sentimento mudou' },
      ],
    },
  ],
};

async function main() {
  if (!TOKEN || !WABA) {
    console.log('✗ WA_ACCESS_TOKEN ou WA_BUSINESS_ACCOUNT_ID ausentes no .env');
    process.exit(1);
  }

  const criar = process.argv.includes('--criar');
  console.log(`\n${TEMPLATE.name} · ${TEMPLATE.category} · ${TEMPLATE.language}\n`);
  const corpo = TEMPLATE.components.find((c) => c.type === 'BODY') as { text: string };
  console.log(corpo.text.replace(/^/gm, '  '));
  console.log(`\n  [Plantar]  [Meu sentimento mudou]\n`);

  if (!criar) {
    console.log('Ensaio. Para criar de verdade: npm run template:diario -- --criar\n');
    return;
  }

  const res = await fetch(`${GRAPH}/${WABA}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(TEMPLATE),
  });
  const j: any = await res.json();

  if (!res.ok || j.error) {
    console.log(`✗ a Meta recusou: ${j?.error?.message ?? res.status}`);
    if (j?.error?.error_user_msg) console.log(`  ${j.error.error_user_msg}`);
    process.exit(1);
  }

  console.log(`✓ enviado para revisão · id ${j.id} · categoria ${j.category ?? '(não informada)'}`);
  if (j.category && j.category !== 'UTILITY') {
    console.log(`\n⚠ a Meta classificou como ${j.category}, não UTILITY.`);
    console.log('  Trocar para este template não resolveria o limite de frequência.');
  }
  console.log('\nA revisão costuma levar de minutos a algumas horas.');
  console.log('Quando aprovar, aponte WA_TEMPLATE_DIARIO para semente_do_dia_v4 no Render.');
}

main().catch((e) => { console.error('ERRO', e?.message || e); process.exit(1); });
