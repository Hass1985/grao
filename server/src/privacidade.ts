// A política de privacidade, em endereço público.
//
// Ela já existia dentro do aplicativo, em src/screens/PrivacyPolicy.tsx, mas só
// dava para chegar nela DEPOIS de entrar — pelas configurações ou pela tela do
// WhatsApp. Isso não serve para duas coisas:
//
//  1. a Apple e o Google pedem uma URL pública na hora de publicar, e uma tela
//     dentro do app não é uma URL;
//  2. a pessoa precisa poder ler antes de criar conta. Consentimento dado sem
//     poder ler o que se está consentindo não é consentimento.
//
// ATENÇÃO — o texto está escrito duas vezes: aqui e em PrivacyPolicy.tsx. Os
// dois precisam dizer a mesma coisa, e hoje dizem. A maneira certa de resolver
// isso é o app buscar este conteúdo em vez de carregar o próprio; enquanto não
// for assim, quem mexer num tem que mexer no outro.

import type { Express, Request, Response } from 'express';

const ATUALIZADA_EM = 'setembro de 2026';
const CONTATO = 'privacidade@graoapp.com.br';

type Secao = { titulo: string; itens: string[] };

/** `**assim**` vira negrito. É o único enfeite que o texto precisa. */
function negrito(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const SECOES: Secao[] = [
  {
    titulo: 'O que a gente guarda',
    itens: [
      'Seu nome e número de WhatsApp, para te entregar a semente diária.',
      'O que você conta na conversa inicial e no dia a dia, inclusive sobre a sua fé e o seu momento. Isso é um dado sensível, e a gente trata com o cuidado que ele merece.',
      'Seu histórico de sementes (o que foi plantado), para montar o seu Campo e a sua Raiz.',
    ],
  },
  {
    titulo: 'Quando você grava um áudio',
    itens: [
      'Você pode falar em vez de escrever, e o caminho do áudio é diferente conforme onde você está. Vale a pena saber qual é qual.',
      '**No aplicativo**, quem transforma a sua fala em texto é o serviço de voz do próprio navegador do seu celular: do Google, se você usa Chrome, ou da Apple, se usa Safari. O áudio passa pelos servidores dessa empresa antes de virar texto, e até nós chega só o texto. O Grão não recebe nem guarda a gravação.',
      '**No WhatsApp**, é diferente, e a gente prefere dizer com todas as letras: o áudio que você manda chega até o Grão. A gente baixa esse áudio do WhatsApp e envia para um serviço de transcrição, que devolve o texto. Guardamos o texto; a gravação não fica com a gente depois disso.',
      'Nos dois casos, preferindo não usar a voz, é só escrever. A experiência é a mesma.',
    ],
  },
  {
    titulo: 'Pra que a gente usa',
    itens: [
      'Só para uma coisa: te conhecer melhor do que qualquer app já te conheceu, e com isso entregar a palavra, a oração e a prática que confortam a sua necessidade, do seu jeito.',
    ],
  },
  {
    titulo: 'O que a gente NÃO faz',
    itens: [
      'Não vendemos os seus dados.',
      'Não compartilhamos seu número ou suas conversas com terceiros.',
      'Não expomos publicamente nada do que você conta.',
    ],
  },
  {
    titulo: 'Quem mais encosta nos seus dados',
    itens: [
      'O Grão é feito de peças de outras empresas, e não dá para te contar o que guardamos sem te contar por onde isso passa. São estas, e nenhuma outra:',
      '**Supabase** guarda o banco de dados, em São Paulo. É onde o seu histórico fica.',
      '**Render** roda o servidor do Grão, nos Estados Unidos.',
      '**Anthropic** é a inteligência que lê o que você conta e escolhe a semente, também nos Estados Unidos.',
      '**Meta** entrega a mensagem no seu WhatsApp, e um serviço de transcrição converte o seu áudio em texto.',
      '**Asaas** processa o pagamento de quem assina, no Brasil. O seu cartão e o seu CPF vão direto para eles; o Grão não guarda nenhum dos dois.',
      'Parte desses serviços fica fora do Brasil, o que a LGPD chama de transferência internacional. Nenhum deles usa o que você conta para outra coisa que não seja entregar a sua semente.',
    ],
  },
  {
    titulo: 'Seus direitos (LGPD)',
    itens: [
      'A Lei Geral de Proteção de Dados (Lei 13.709/2018) trata convicção religiosa como dado pessoal sensível. Por isso, você tem controle total:',
      'Acessar e corrigir seus dados a qualquer momento.',
      'Ajustar o seu momento nas configurações, quando a fase mudar.',
      'Pedir a exclusão completa dos seus dados, e a gente apaga tudo.',
      'Retirar o consentimento quando quiser.',
    ],
  },
  {
    titulo: 'Segurança',
    itens: [
      'O acesso ao banco é restrito e passa só pelo nosso servidor: o aplicativo no seu celular não fala direto com o banco. Cada pedido ao servidor precisa provar quem você é, e as chaves que dão acesso à inteligência e ao pagamento nunca ficam no seu aparelho.',
    ],
  },
  {
    titulo: 'Por quanto tempo guardamos',
    itens: [
      'Enquanto a sua conta existir. Você pode pedir a exclusão a qualquer momento nas configurações, e aí apagamos o seu cadastro, o seu histórico, o que você contou e a sua identidade de login — tudo de uma vez, sem cópia guardada.',
    ],
  },
  {
    titulo: 'Contato',
    itens: [
      `Dúvidas sobre seus dados? Fale com a gente em ${CONTATO}. Respondemos com o mesmo cuidado que você tem com a sua fé.`,
    ],
  },
];

function pagina(): string {
  const corpo = SECOES.map((s) => {
    const itens = s.itens.map((t) => `<p>${negrito(esc(t))}</p>`).join('\n      ');
    return `    <section>\n      <h2>${esc(s.titulo)}</h2>\n      ${itens}\n    </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacidade e dados · Grão</title>
<meta name="description" content="O que o Grão guarda, por onde isso passa e o que você pode pedir a qualquer momento.">
<meta name="robots" content="index,follow">
<style>
  :root{--fundo:#F7F3EA;--texto:#3A3227;--fraco:#6B6153;--destaque:#B4762A;--linha:#E4DBC9}
  *{box-sizing:border-box}
  body{margin:0;background:var(--fundo);color:var(--texto);
       font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:38rem;margin:0 auto;padding:3rem 1.25rem 5rem}
  h1{font-size:1.75rem;line-height:1.25;margin:0 0 .25rem}
  .atualizada{color:var(--fraco);font-size:.9rem;margin:0 0 2rem}
  .abertura{background:#fff;border:1px solid var(--linha);border-radius:14px;
            padding:1.25rem;margin:0 0 2.5rem}
  .abertura p{margin:0}
  .abertura strong{display:block;margin-bottom:.5rem}
  section{margin:0 0 2rem}
  h2{font-size:1.05rem;letter-spacing:.02em;text-transform:uppercase;
     color:var(--destaque);margin:0 0 .6rem}
  p{margin:0 0 .6rem;color:var(--fraco)}
  p strong{color:var(--texto)}
  footer{border-top:1px solid var(--linha);padding-top:1.5rem;margin-top:3rem;
         color:var(--fraco);font-size:.9rem;text-align:center}
  @media (prefers-color-scheme:dark){
    :root{--fundo:#1F1A14;--texto:#F0E9DC;--fraco:#B3A895;--linha:#3A3227}
    .abertura{background:#2A231B;border-color:#3A3227}
  }
</style>
</head><body>
<main>
  <h1>Privacidade e dados</h1>
  <p class="atualizada">Última atualização: ${ATUALIZADA_EM}</p>

  <div class="abertura">
    <p><strong>Aqui você pode se abrir com tranquilidade.</strong>
    O que você compartilha com o Grão, sua fé, o que sente, o que tem pedido a Deus,
    fica guardado só entre você e o Grão, protegido, e serve apenas para escolher a
    semente certa pra você. Nunca vendemos, nunca expomos, e você pode apagar tudo
    quando quiser.</p>
  </div>

${corpo}

  <footer>Grão · uma semente por dia 🌱</footer>
</main>
</body></html>`;
}

export function registerPrivacidadeRoutes(app: Express) {
  app.get('/privacidade', (_req: Request, res: Response) => {
    // Cache curto: é um documento que muda pouco, mas quando muda é porque
    // alguma coisa deixou de ser verdade — e aí ninguém pode ficar vendo a
    // versão velha por uma semana.
    res.set('Cache-Control', 'public, max-age=3600').type('html').send(pagina());
  });

  /**
   * A mesma coisa em JSON, para o aplicativo passar a ler daqui um dia e as
   * duas cópias do texto virarem uma só.
   */
  app.get('/privacidade.json', (_req: Request, res: Response) => {
    res.json({ atualizadaEm: ATUALIZADA_EM, contato: CONTATO, secoes: SECOES });
  });
}
