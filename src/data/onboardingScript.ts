// Roteiro da conversa inicial do Grão.
// Cada opção carrega pesos ocultos: vak (canal sensorial) e ocean (Big Five).
// Nada disso é exibido ao usuário, a conversa é só uma conversa.

export interface VakDelta {
  v?: number; // visual
  a?: number; // auditivo
  k?: number; // sinestésico
}

export interface OceanDelta {
  O?: number; // abertura
  C?: number; // conscienciosidade
  E?: number; // extroversão
  A?: number; // amabilidade
  N?: number; // neuroticismo
}

export interface ChipOption {
  label: string;
  vak?: VakDelta;
  ocean?: OceanDelta;
}

export interface Question {
  id: string;
  text: string; // {name} é substituído pelo nome da pessoa
  options?: ChipOption[]; // sem options = resposta livre obrigatória
  acks: string[]; // validações breves (1 frase), sorteadas
}

export const INTRO_MESSAGES = [
  'Oi. Eu sou o Grão. 🌱',
  'Antes de qualquer semente, eu queria te conhecer, do jeito que um irmão conhece outro. O que você me contar fica guardado só entre a gente.',
  'Pra começar: como você gosta de ser chamado?',
];

export const NAME_ACK = 'Prazer, {name}.';

export const DEFLECTION = 'Pra te conhecer melhor do que qualquer app já te conheceu.';

export const VAGUE_FOLLOWUPS = [
  'Fica à vontade, pode ser qualquer coisinha que vier.',
  'Não precisa caprichar na resposta. O que vier primeiro serve.',
];

export const QUESTIONS: Question[] = [
  {
    id: 'perto_de_deus',
    text: 'Me conta uma coisa: quando você lembra de um momento em que sentiu Deus perto, o que vem primeiro?',
    options: [
      { label: 'Uma cena, um lugar que eu vejo até hoje', vak: { v: 2 }, ocean: { O: 1 } },
      { label: 'Um louvor, uma palavra que ficou ecoando', vak: { a: 2 } },
      { label: 'Uma paz no corpo, um aperto bom no peito', vak: { k: 2 } },
    ],
    acks: ['Que lindo isso.', 'Dá pra sentir daqui.'],
  },
  {
    id: 'culto',
    text: 'E no culto, o que mais te toca?',
    options: [
      { label: 'Ver a igreja reunida, as mãos levantadas', vak: { v: 2 }, ocean: { E: 1 } },
      { label: 'O louvor, a voz, os instrumentos', vak: { a: 2 } },
      { label: 'A hora de fechar os olhos e orar', vak: { k: 2 }, ocean: { E: -1 } },
    ],
    acks: ['Entendo demais.', 'Esse momento tem outro peso, né.'],
  },
  {
    id: 'biblia',
    text: 'Quando você abre a Bíblia, como gosta de ler?',
    options: [
      { label: 'Marcando, sublinhando, colorindo', vak: { v: 1 }, ocean: { C: 1 } },
      { label: 'Ouvindo em áudio enquanto acompanho', vak: { a: 2 } },
      { label: 'Copiando à mão, no meu ritmo', vak: { k: 1 }, ocean: { C: 1 } },
    ],
    acks: ['Cada um tem seu jeito com a Palavra.', 'Gosto disso.'],
  },
  {
    id: 'momento_favorito',
    text: 'Como é o seu momento favorito do dia?',
    options: [
      { label: 'De manhã cedo, antes de todo mundo acordar', ocean: { C: 1, E: -1 } },
      { label: 'À noite, quando tudo aquieta', ocean: { E: -1 } },
      { label: 'No meio do movimento, com gente por perto', ocean: { E: 1 } },
    ],
    acks: ['Esse horário diz muito sobre você.', 'Também acho esse momento especial.'],
  },
  {
    id: 'recarrega',
    text: 'Depois de um dia pesado, o que recarrega você?',
    options: [
      { label: 'Um canto quieto, só meu', ocean: { E: -1 } },
      { label: 'Conversar com alguém que eu amo', ocean: { E: 1, A: 1 } },
      { label: 'Sair, caminhar, respirar', vak: { k: 1 }, ocean: { E: 1 } },
    ],
    acks: ['Faz sentido.', 'Todo mundo precisa disso, né.'],
  },
  {
    id: 'acalma',
    text: 'E nos dias difíceis, o que mais te acalma?',
    options: [
      { label: 'Olhar o céu, o mar, uma paisagem', vak: { v: 2 }, ocean: { N: -1 } },
      { label: 'Uma música ou uma voz amiga', vak: { a: 2 } },
      { label: 'Um abraço apertado', vak: { k: 2 }, ocean: { A: 1 } },
    ],
    acks: ['Guardei isso.', 'Que bom que você sabe o que te acalma.'],
  },
  {
    id: 'aprender',
    text: 'Quando alguém te ensina algo novo, o que funciona melhor pra você?',
    options: [
      { label: 'Me mostrando, vendo eu entendo na hora', vak: { v: 2 } },
      { label: 'Me explicando com calma, de voz', vak: { a: 2 } },
      { label: 'Me deixando tentar com as minhas mãos', vak: { k: 2 } },
    ],
    acks: ['Anotado aqui no coração.', 'Boa, cada cabeça funciona de um jeito.'],
  },
  {
    id: 'orar',
    text: 'E quando você ora, como costuma ser?',
    options: [
      { label: 'Imagino as cenas, visualizo cada pedido', vak: { v: 2 }, ocean: { O: 1 } },
      { label: 'Converso em voz alta, como com um amigo', vak: { a: 2 }, ocean: { E: 1 } },
      { label: 'Em silêncio, só sentindo a presença', vak: { k: 2 }, ocean: { E: -1 } },
    ],
    acks: ['Oração é isso, cada um no seu jeito.', 'Que intimidade boa.'],
  },
  {
    id: 'louvor',
    text: 'Que tipo de louvor te alcança mais fundo?',
    options: [
      { label: 'Letra que parece escrita pra mim', vak: { a: 1 }, ocean: { O: 1 } },
      { label: 'Melodia que arrepia, mesmo sem letra', vak: { k: 1, a: 1 } },
      { label: 'Ver o louvor acontecendo ao vivo', vak: { v: 2 } },
    ],
    acks: ['Louvor certo na hora certa muda um dia inteiro.', 'Conheço bem essa sensação.'],
  },
  {
    id: 'planejar',
    text: 'Você é mais de planejar o dia ou de sentir o momento?',
    options: [
      { label: 'Lista feita, tudo no lugar', ocean: { C: 2 } },
      { label: 'Um pouco dos dois', ocean: {} },
      { label: 'Vou sentindo, o dia me leva', ocean: { C: -1, O: 1 } },
    ],
    acks: ['Bom saber.', 'Cada ritmo tem sua beleza.'],
  },
  {
    id: 'novidade',
    text: 'Coisa nova te anima ou te cansa?',
    options: [
      { label: 'Anima! Adoro descobrir', ocean: { O: 2, E: 1 } },
      { label: 'Depende do dia', ocean: {} },
      { label: 'Prefiro o que já conheço e confio', ocean: { O: -1, C: 1 } },
    ],
    acks: ['Entendi você.', 'Isso me ajuda a te acompanhar melhor.'],
  },
  {
    id: 'magoa',
    text: 'Quando alguém te magoa, o que você costuma fazer?',
    options: [
      { label: 'Guardo pra não brigar', ocean: { A: 1, N: 1 } },
      { label: 'Falo na hora, resolvo logo', ocean: { E: 1, A: -1 } },
      { label: 'Me afasto um tempo pra digerir', ocean: { E: -1 } },
    ],
    acks: ['Obrigado por dividir isso.', 'É humano demais isso.'],
  },
  {
    id: 'preocupacao',
    text: 'Sua cabeça costuma correr na frente com preocupação?',
    options: [
      { label: 'Demais, vivo ensaiando o futuro', ocean: { N: 2 } },
      { label: 'Às vezes, quando aperta', ocean: { N: 1 } },
      { label: 'Consigo entregar rápido e seguir', ocean: { N: -1 } },
    ],
    acks: ['Fica tranquilo, isso a gente cuida junto.', 'Anotei, com carinho.'],
  },
  {
    id: 'detalhe',
    text: 'Você repara mais nos detalhes ou no todo?',
    options: [
      { label: 'Detalhes, pouca coisa me escapa', ocean: { C: 1 } },
      { label: 'No todo, gosto do quadro geral', ocean: { O: 1 } },
    ],
    acks: ['Bom demais te conhecer assim.'],
  },
  {
    id: 'dividir',
    text: 'Com quem você divide o que sente?',
    options: [
      { label: 'Com pouca gente, e olhe lá', ocean: { E: -1 } },
      { label: 'Com meu povo, família, irmãos da igreja', ocean: { E: 1, A: 1 } },
      { label: 'Mais com Deus do que com pessoas', ocean: { E: -1 } },
    ],
    acks: ['Isso diz muito, obrigado.', 'Que confiança preciosa.'],
  },
  {
    id: 'recado',
    text: 'Se Deus te mandasse um recado hoje, como você gostaria de receber?',
    options: [
      { label: 'Escrito, pra eu reler mil vezes', vak: { v: 2 } },
      { label: 'Numa voz, um áudio, uma pregação', vak: { a: 2 } },
      { label: 'Num acontecimento que eu vivesse', vak: { k: 2 }, ocean: { O: 1 } },
    ],
    acks: ['Ele manda. Do jeito que você entende.'],
  },
  {
    id: 'domingo',
    text: 'Como é um domingo perfeito pra você?',
    options: [
      { label: 'Culto, mesa cheia, casa barulhenta', ocean: { E: 1, A: 1 } },
      { label: 'Igreja de manhã e sossego à tarde', ocean: { C: 1 } },
      { label: 'Sem plano, só descansar', ocean: { C: -1 } },
    ],
    acks: ['Já imaginei a cena.', 'Domingo bom é isso mesmo.'],
  },
  {
    id: 'presente',
    text: 'Um amigo te dá um presente. O que te ganha de verdade?',
    options: [
      { label: 'O cartão escrito à mão', vak: { v: 1 }, ocean: { A: 1 } },
      { label: 'Ele dizer, olhando nos olhos, o que eu significo', vak: { a: 2 } },
      { label: 'O abraço na entrega', vak: { k: 2 } },
    ],
    acks: ['Detalhe que vale mais que o presente, né.'],
  },
  {
    id: 'pedido',
    text: 'Tá quase. Me conta com suas palavras: o que você mais tem pedido a Deus nessa fase?',
    // sem options, resposta livre. Vira a dica emocional inicial do perfil.
    acks: ['Guardo isso comigo. De verdade.'],
  },
  {
    id: 'jeito',
    text: 'Última, prometo: se eu pudesse te acompanhar todo dia de um jeito só, qual seria?',
    options: [
      { label: 'Me mostrando, palavras pra ler e guardar', vak: { v: 2 } },
      { label: 'Falando comigo, voz e louvor por perto', vak: { a: 2 } },
      { label: 'Caminhando do lado, coisas pra sentir e viver', vak: { k: 2 } },
    ],
    acks: ['Fechado. É assim que eu vou estar.'],
  },
];

export const CLOSING_BY_CHANNEL: Record<string, string> = {
  visual: 'Obrigado por se abrir comigo, {name}. Agora eu sei do seu jeito, e vou te acompanhar assim: com palavras pra ver, reler e guardar. Sua primeira semente já está sendo preparada. 🌱',
  auditivo: 'Obrigado por se abrir comigo, {name}. Agora eu sei do seu jeito, e vou te acompanhar assim: com voz, louvor e palavra por perto. Sua primeira semente já está sendo preparada. 🌱',
  sinestesico: 'Obrigado por se abrir comigo, {name}. Agora eu sei do seu jeito, e vou te acompanhar assim: caminhando do seu lado, com passos pra sentir e viver. Sua primeira semente já está sendo preparada. 🌱',
};
