// Como os 66 livros se agrupam dentro de cada testamento.
//
// POR QUE AGRUPAR
//
// Trinta e nove botões em fila não são uma Bíblia, são uma lista. Quem procura
// um salmo sabe que está nos Poéticos; quem quer uma carta de Paulo sabe que
// ela vem depois de Atos. A divisão é como o livro é ensinado na igreja, e
// usá-la troca "procurar na lista" por "ir direto no grupo".
//
// POR QUE POR NÚMERO, E NÃO POR NOME
//
// O número é a ordem canônica e não muda. Nome muda: "Cântico dos Cânticos" é
// "Cantares" em outras traduções, "Obadias" aparece como "Abdias". Agrupar por
// nome quebraria em silêncio no dia em que a tradução fosse trocada — e o
// sintoma seria um livro sumido de todos os grupos, sem erro nenhum no log.

export interface DivisaoBiblia {
  nome: string;
  /** Primeiro e último número canônico, inclusive. */
  de: number;
  ate: number;
}

export const DIVISOES_ANTIGO: DivisaoBiblia[] = [
  { nome: 'Pentateuco', de: 1, ate: 5 },          // Gênesis … Deuteronômio
  { nome: 'Históricos', de: 6, ate: 17 },         // Josué … Ester
  { nome: 'Poéticos', de: 18, ate: 22 },          // Jó … Cântico dos Cânticos
  { nome: 'Profetas maiores', de: 23, ate: 27 },  // Isaías … Daniel
  { nome: 'Profetas menores', de: 28, ate: 39 },  // Oseias … Malaquias
];

export const DIVISOES_NOVO: DivisaoBiblia[] = [
  { nome: 'Evangelhos', de: 40, ate: 43 },        // Mateus … João
  { nome: 'História', de: 44, ate: 44 },          // Atos
  { nome: 'Cartas de Paulo', de: 45, ate: 57 },   // Romanos … Filemom
  { nome: 'Cartas gerais', de: 58, ate: 65 },     // Hebreus … Judas
  { nome: 'Profecia', de: 66, ate: 66 },          // Apocalipse
];

/**
 * Separa os livros nas divisões do testamento.
 *
 * Um livro que não caia em divisão nenhuma vai para o fim, num grupo "Outros",
 * em vez de desaparecer. Se a tradução mudar e trouxer deuterocanônicos, é
 * melhor a tela mostrar um grupo estranho do que esconder livros sem avisar.
 */
export function agruparPorDivisao<T extends { numero: number }>(
  livros: T[],
  divisoes: DivisaoBiblia[],
): Array<{ nome: string; livros: T[] }> {
  const grupos = divisoes
    .map((d) => ({
      nome: d.nome,
      livros: livros.filter((l) => l.numero >= d.de && l.numero <= d.ate),
    }))
    .filter((g) => g.livros.length > 0);

  const agrupados = new Set(grupos.flatMap((g) => g.livros.map((l) => l.numero)));
  const sobras = livros.filter((l) => !agrupados.has(l.numero));
  if (sobras.length) grupos.push({ nome: 'Outros', livros: sobras });

  return grupos;
}
