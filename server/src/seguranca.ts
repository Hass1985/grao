// Segurança emocional: o detector que NÃO depende da IA.
//
// O Grão recebe o estado de espírito das pessoas por texto e por áudio aberto.
// Mais cedo ou mais tarde alguém relata sofrimento grave. Um devocional
// respondendo com versículo nessa hora é, na melhor das hipóteses, inútil.
//
// Até aqui quem detectava isso era o próprio modelo, pelo campo needs_care. O
// problema apareceu na prática: quando a chave da Anthropic ficou sem saldo, a
// leitura emocional parou por completo e ninguém teria sido detectado. A
// proteção mais importante do produto dependia justamente da peça mais frágil.
//
// Então a detecção passa a ter duas camadas independentes:
//
//   1. ESTA, determinística, em português, que roda sempre, mesmo com a API
//      fora do ar, e não custa nada;
//   2. o needs_care do modelo, que continua e pega o que a lista não prevê.
//
// Qualquer uma das duas basta para acionar. Elas se somam, nunca se substituem.
//
// SOBRE OS FALSOS POSITIVOS: são muito mais baratos que os falsos negativos.
// Alguém que não está em crise receber uma mensagem de cuidado, dizendo que
// existe ajuda, é no máximo um pouco estranho. Alguém em crise receber a
// prática do dia como se nada tivesse acontecido é o erro que não se desfaz.
// Na dúvida, esta lista aciona.

/** Gravidade do que foi dito. */
export type Risco = 'grave' | 'atencao' | 'nenhum';

/**
 * Frases que indicam intenção contra a própria vida.
 *
 * Escritas como a pessoa escreve no WhatsApp: sem acento, com gíria, no
 * presente. "\\b" nas bordas evita casar pedaço de outra palavra.
 */
const GRAVE: RegExp[] = [
  /\bn[ãa]o\s+quero\s+(mais\s+)?viver\b/i,
  /\bquero\s+morrer\b/i,
  /\bvou\s+me\s+matar\b/i,
  /\bme\s+matar\b/i,
  /\btirar\s+a\s+minha\s+vida\b/i,
  /\bacabar\s+com\s+(a\s+)?(minha\s+)?vida\b/i,
  /\bdar\s+um\s+fim\s+(em\s+)?(mim|nisso\s+tudo)\b/i,
  /\bn[ãa]o\s+vejo\s+sentido\s+em\s+viver\b/i,
  /\bpensando\s+em\s+(me\s+)?(matar|morrer)\b/i,
  /\bmelhor\s+(se\s+eu\s+)?(sumir|morrer|n[ãa]o\s+existir)\b/i,
  /\bsumir\s+de\s+vez\b/i,
  /\bme\s+(cortar|machucar|ferir)\b/i,
  /\bn[ãa]o\s+aguento\s+mais\s+viver\b/i,
  /\bqueria\s+(dormir\s+e\s+)?n[ãa]o\s+acordar\s+mais\b/i,
  /\bfaz\s+falta\s+pra\s+ningu[ée]m\b/i,
  /\bningu[ée]m\s+(ia\s+)?sentir(ia)?\s+minha\s+falta\b/i,
];

/**
 * Sofrimento intenso que ainda não é intenção declarada.
 *
 * Não interrompe o fluxo: a conversa segue, com o cérebro avisado de que o
 * cuidado importa mais que a profundidade. Serve também para a equipe
 * enxergar no painel antes de virar caso grave.
 */
const ATENCAO: RegExp[] = [
  /\bn[ãa]o\s+aguento\s+mais\b/i,
  /\bno\s+meu\s+limite\b/i,
  /\bt[ôo]\s+no\s+fundo\s+do\s+po[çc]o\b/i,
  /\bsem\s+for[çc]as?\s+pra\s+(nada|continuar)\b/i,
  /\bs[óo]\s+choro\b/i,
  /\bn[ãa]o\s+consigo\s+(mais\s+)?(levantar|sair\s+da\s+cama)\b/i,
  /\bdesesperad[oa]\b/i,
  /\bsem\s+esperan[çc]a\s+(nenhuma|alguma)\b/i,
  /\bperdi\s+(meu|minha)\s+(filh[oa]|m[ãa]e|pai|marido|esposa)\b/i,
  /\bvazio\s+por\s+dentro\b/i,
];

/**
 * Negações que REBAIXAM o alarme de grave para atenção. Nunca o zeram.
 *
 * Este foi um erro meu no primeiro desenho, e o teste pegou. Quem escreve "já
 * pensei em me matar mas não faria isso" está revelando ideação suicida: a
 * negação diz que não há plano AGORA, não que está tudo bem. Tratar isso como
 * "nenhum risco" seria pior do que não ter detector nenhum, porque daria a
 * impressão de que o produto olhou e não viu nada.
 *
 * Então a negação evita a interrupção com o texto de crise (que soaria
 * desproporcional para quem acabou de dizer que não faria), mas mantém o caso
 * marcado, visível no painel e tratado com cuidado na resposta.
 */
const DESARMA: RegExp[] = [
  /\bn[ãa]o\s+quero\s+morrer\b/i,
  /\bn[ãa]o\s+penso\s+mais\s+(nisso|em\s+morrer)\b/i,
  /\bjamais\s+faria\s+isso\b/i,
  /\bn[ãa]o\s+faria\s+isso\b/i,
  /\bnunca\s+(faria|pensei)\s+(isso|nisso)\b/i,
];

export interface Leitura {
  risco: Risco;
  /** O trecho que acionou, para o log e para o painel. Nunca vai ao usuário. */
  trecho: string | null;
}

/**
 * Lê o texto em busca de sinal de risco. Sem rede, sem IA, sem custo.
 */
export function avaliarRisco(texto: string): Leitura {
  const t = (texto ?? '').normalize('NFC');
  if (!t.trim()) return { risco: 'nenhum', trecho: null };

  const desarmado = DESARMA.some((re) => re.test(t));

  for (const re of GRAVE) {
    const m = re.exec(t);
    if (m) return { risco: desarmado ? 'atencao' : 'grave', trecho: m[0] };
  }
  for (const re of ATENCAO) {
    const m = re.exec(t);
    if (m) return { risco: 'atencao', trecho: m[0] };
  }
  return { risco: 'nenhum', trecho: null };
}

/**
 * A resposta para o caso grave. Texto FIXO, escrito por gente.
 *
 * Não passa pelo modelo de propósito, por três razões: funciona com a API fora
 * do ar, que é justamente quando a proteção some; não corre o risco de sair
 * uma frase infeliz no pior momento possível; e não promete nada.
 *
 * O que ela faz, e o que evita:
 *  - acolhe sem dramatizar e sem dizer "eu entendo como você se sente";
 *  - não manda versículo nem prática: isso soaria como responder ao pedido de
 *    socorro com o conteúdo do dia;
 *  - dá o CVV com número, gratuidade e horário, porque "procure ajuda" sem
 *    telefone não ajuda ninguém;
 *  - aponta uma pessoa de confiança concreta, não uma instituição abstrata;
 *  - termina em aberto, para a conversa continuar se ela quiser.
 */
export function respostaDeCuidado(nome?: string | null): string {
  const abertura = nome ? `${nome}, obrigado por me dizer isso.` : 'Obrigado por me dizer isso.';
  return [
    abertura,
    '',
    'O que você está sentindo é sério, e você não precisa atravessar isso sozinho.',
    '',
    'Fala com alguém em quem você confia ainda hoje: uma pessoa da sua casa, ' +
    'seu pastor, alguém que te queira bem e possa estar perto de você agora.',
    '',
    'E existe gente preparada para ouvir a qualquer hora, de graça: o CVV atende ' +
    'no *188*, 24 horas por dia, todos os dias. A ligação não custa nada.',
    '',
    'Eu vou continuar aqui. Se quiser me contar mais, eu te escuto.',
  ].join('\n');
}
