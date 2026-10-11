// Guia de primeiro acesso na Hoje: 6 passos, no modelo do tour em tooltip.
// Persistido no aparelho; quem concluir ou pular não vê de novo, a menos
// que peça em Ajustes.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'grao.guiaPrimeiroAcesso.v1';

export type AncoraGuia =
  | 'tab-hoje'
  | 'hoje-cards'
  | 'hoje-sequencia'
  | 'tab-mais'
  | 'tab-biblia'
  | 'hoje-perfil';

export type PassoGuia = {
  ancora: AncoraGuia;
  titulo: string;
  texto: string;
  /** Seta do balão: aponta para cima (alvo no topo) ou para baixo (alvo na tab). */
  seta: 'cima' | 'baixo';
};

export const PASSOS_GUIA: PassoGuia[] = [
  {
    ancora: 'tab-hoje',
    titulo: 'Sua jornada de hoje',
    texto:
      'Tudo começa aqui: o devocional do dia e, no Plantio, a semente, a oração e a prática feitos pra você.',
    seta: 'baixo',
  },
  {
    ancora: 'hoje-cards',
    titulo: 'Leia ou ouça',
    texto:
      'Toque em um tópico pra ler, ou em Ouvir pra escutar. Complete o que puder e o dia fecha com sua sequência.',
    seta: 'cima',
  },
  {
    ancora: 'hoje-sequencia',
    titulo: 'Sua sequência',
    texto:
      'Cada dia completo soma aqui. Toque no calendário pra ver Minha jornada e o seu progresso.',
    seta: 'cima',
  },
  {
    ancora: 'tab-mais',
    titulo: 'Mais do Grão',
    texto:
      'Pelo centro você abre Minha jornada, a Loja e a sua conta, sem sair do caminho.',
    seta: 'baixo',
  },
  {
    ancora: 'tab-biblia',
    titulo: 'A Bíblia completa',
    texto:
      'Leia qualquer livro, ouça em áudio e caminhe pela Palavra no seu ritmo.',
    seta: 'baixo',
  },
  {
    ancora: 'hoje-perfil',
    titulo: 'Seu perfil e ajustes',
    texto:
      'Conta, assinatura e preferências. Se quiser rever este guia, ele fica em Ajustes.',
    seta: 'cima',
  },
];

export async function jaViuGuia(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function marcarGuiaVisto(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function resetarGuia(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
