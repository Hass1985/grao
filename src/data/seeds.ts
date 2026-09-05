export type SeedType = 'reflexão' | 'oração' | 'prática';
export type EmotionalFamily =
  | 'ansiedade'
  | 'gratidão'
  | 'luto'
  | 'esperança'
  | 'culpa'
  | 'propósito'
  | 'solidão'
  | 'paz'
  | 'alegria'
  | 'fé';

export interface Music {
  title: string;
  artist: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

export interface Seed {
  id: string;
  date: string;
  /** `devocional` = gratuito anual; `semente` = assinante. */
  tipo?: 'devocional' | 'semente';
  title?: string;
  type: SeedType;
  family: EmotionalFamily;
  passage: string;
  reference: string;
  /** Paráfrase na voz do devocional. Nunca como citação com referência. */
  verse?: string;
  reflection: string;
  /** `null` = bloqueado pelo plano (não inexistente). */
  prayer: string | null;
  practice: string | null;
  music: Music | null;
  planted: boolean;
  /** Texto pronto da API para o Share do sistema. */
  compartilhavel?: string;
  completa?: boolean;
  bloqueado?: { prayer: boolean; practice: boolean; music: boolean } | null;
}

export const todaySeed: Seed = {
  id: 'seed-today',
  date: new Date().toISOString().split('T')[0],
  tipo: 'devocional',
  title: 'Esperança para o caminho',
  type: 'reflexão',
  family: 'esperança',
  passage:
    'Porque eu sei os planos que tenho para vocês", diz o Senhor, "planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.',
  reference: 'Jeremias 29:11',
  reflection:
    'Mesmo quando o presente parece incerto, existe um projeto maior traçado com cuidado para a sua vida. Hoje, permita-se confiar no que ainda não consegue ver.',
  prayer: null,
  practice: null,
  music: null,
  planted: false,
  completa: false,
  bloqueado: { prayer: true, practice: true, music: true },
  compartilhavel:
    'Porque eu sei os planos que tenho para vocês, diz o Senhor.\nJeremias 29:11\n\nGrão · uma semente por dia',
};

export const pastSeeds: Seed[] = [
  {
    id: 'seed-1',
    date: '2026-05-15',
    type: 'oração',
    family: 'ansiedade',
    passage:
      'Não andeis ansiosos por coisa alguma; antes em tudo fazei os vossos pedidos a Deus em oração e súplica com ações de graças.',
    reference: 'Filipenses 4:6',
    reflection:
      'A ansiedade nos faz carregar o amanhã antes da hora. A oração é o gesto de devolver ao Criador o peso que não foi feito para suas mãos.',
    prayer:
      'Pai, entrego hoje cada pensamento que me oprime. Que minha mente encontre repouso na tua presença.',
    practice:
      'Quando sentir a ansiedade subir, respire fundo três vezes e repita em voz baixa: "Eu entrego."',
    music: {
      title: 'Lugar Secreto',
      artist: 'Gabriela Rocha',
      spotifyUrl: 'https://open.spotify.com/track/19KSVYPZSOZtvhYx8aVCvb',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Gabriela+Rocha+Lugar+Secreto',
    },
    planted: true,
  },
  {
    id: 'seed-2',
    date: '2026-05-14',
    type: 'prática',
    family: 'gratidão',
    passage:
      'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.',
    reference: '1 Tessalonicenses 5:18',
    reflection:
      'A gratidão não nega a dor, ela encontra luz dentro dela. Agradecer é um ato de fé que treina os olhos para enxergar a graça.',
    prayer:
      'Senhor, abre meus olhos para as bênçãos que já estão aqui. Que a gratidão seja meu idioma primeiro.',
    practice:
      'Liste três coisas pequenas pelas quais você é grato hoje. Uma delas deve ser algo que normalmente passa despercebido.',
    music: {
      title: 'Quão Grande é o Meu Deus',
      artist: 'Soraya Moraes',
      spotifyUrl: 'https://open.spotify.com/track/7DhiPsmpu4kzIQyCtvWqzd',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Soraya+Moraes+Qu%C3%A3o+Grande+%C3%A9+o+Meu+Deus',
    },
    planted: true,
  },
  {
    id: 'seed-3',
    date: '2026-05-13',
    type: 'reflexão',
    family: 'solidão',
    passage: 'Mesmo que eu ande pelo vale da sombra da morte, não temerei mal nenhum, pois tu estás comigo.',
    reference: 'Salmos 23:4',
    reflection:
      'A solidão dói porque fomos feitos para comunhão. Mas há uma presença que não abandona nem nos momentos em que ninguém mais está.',
    prayer: 'Deus, faz-te real para mim neste silêncio. Que eu sinta que não estou só.',
    practice:
      'Sente-se em silêncio por cinco minutos. Não tente resolver nada, apenas perceba que há algo além de você neste espaço.',
    music: {
      title: 'Deus Cuida de Mim',
      artist: 'Kleber Lucas',
      spotifyUrl: 'https://open.spotify.com/track/449TmbIw140iAdtYpUWB4h',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Kleber+Lucas+Deus+Cuida+de+Mim',
    },
    planted: false,
  },
  {
    id: 'seed-4',
    date: '2026-05-12',
    type: 'oração',
    family: 'paz',
    passage:
      'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.',
    reference: 'Filipenses 4:7',
    reflection:
      'A paz verdadeira não vem da ausência de problemas, mas de uma presença maior do que qualquer problema.',
    prayer: 'Senhor, que tua paz que ultrapassa o entendimento guarde meu coração hoje.',
    practice:
      'Antes de dormir, coloque as mãos no peito e respire profundamente enquanto repete: "Paz, eu recebo."',
    music: {
      title: 'Príncipe da Paz',
      artist: 'Diante do Trono',
      spotifyUrl: 'https://open.spotify.com/track/1sBvuSkhAnfppzUBpvIKi3',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Diante+do+Trono+Pr%C3%ADncipe+da+Paz',
    },
    planted: true,
  },
  {
    id: 'seed-5',
    date: '2026-05-11',
    type: 'prática',
    family: 'propósito',
    passage: 'Pois somos criação de Deus, criados em Cristo Jesus para fazer boas obras.',
    reference: 'Efésios 2:10',
    reflection:
      'Você não é um acidente. Cada dom, cada dor, cada experiência foi tecida com intenção. Sua vida tem peso e direção.',
    prayer: 'Deus, mostra-me hoje uma boa obra que só eu posso fazer. Que eu não desperdice o que me foi dado.',
    practice:
      'Faça algo pequeno e bom por alguém hoje, sem esperar reconhecimento. Uma mensagem, um gesto, uma palavra.',
    music: {
      title: 'Oceanos (Onde Meus Pés Podem Falhar)',
      artist: 'Hillsong UNITED',
      spotifyUrl: 'https://open.spotify.com/track/49TMWB2yqSHcm7aomyeR7G',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Hillsong+Oceanos+Onde+Meus+P%C3%A9s+Podem+Falhar',
    },
    planted: true,
  },
  {
    id: 'seed-6',
    date: '2026-05-10',
    type: 'reflexão',
    family: 'fé',
    passage:
      'A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.',
    reference: 'Hebreus 11:1',
    reflection:
      'Fé não é ausência de dúvida, é escolher caminhar mesmo quando os olhos não alcançam o destino. É o músculo que se fortalece exatamente quando o chão some.',
    prayer: 'Senhor, aumenta a minha fé. Que eu confie no que ainda não consigo ver.',
    practice:
      'Escreva uma promessa bíblica que você quer acreditar mais profundamente. Leia em voz alta três vezes.',
    music: {
      title: 'Nada Além do Sangue',
      artist: 'Fernandinho',
      spotifyUrl: 'https://open.spotify.com/track/2mI6Oxf5FhUlSoDT67SeZM',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Fernandinho+Nada+Al%C3%A9m+do+Sangue',
    },
    planted: true,
  },
];

export const emotionalFamilies: { id: EmotionalFamily; label: string; emoji: string }[] = [
  { id: 'ansiedade', label: 'Ansiedade', emoji: '😰' },
  { id: 'gratidão', label: 'Gratidão', emoji: '🙏' },
  { id: 'luto', label: 'Luto', emoji: '💔' },
  { id: 'esperança', label: 'Esperança', emoji: '🌱' },
  { id: 'culpa', label: 'Culpa', emoji: '😔' },
  { id: 'propósito', label: 'Propósito', emoji: '🧭' },
  { id: 'solidão', label: 'Solidão', emoji: '🌑' },
  { id: 'paz', label: 'Paz', emoji: '☁️' },
  { id: 'alegria', label: 'Alegria', emoji: '✨' },
  { id: 'fé', label: 'Fé', emoji: '🕊️' },
];
