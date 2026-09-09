// Cliente dos grãos e da escada.
//
// Grão é o retorno imediato de cada gesto; o nível é o arco longo, contado em
// dias vividos. Os dois vêm juntos porque as duas telas que os mostram — Campo
// e Loja — precisam dos dois ao mesmo tempo.

import { API_URL, getUserId } from './aiClient';

export interface NivelGrao {
  id: string;
  nome: string;
  dias: number;
  graos: number;
}

export interface ResumoGraos {
  saldo: number;
  diasVividos: number;
  /** Dias vividos + dias emendados: a sequência conta dobrado. */
  acumulado: number;
  sequencia: number;
  nivel: NivelGrao | null;
  proximo: NivelGrao | null;
  faltam: number;
  niveis: NivelGrao[];
  extrato: { quantidade: number; motivo: string; referencia: string | null; criado_em: string }[];
}

export async function meusGraos(): Promise<ResumoGraos | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/graos/${userId}`);
    if (!res.ok) return null;
    return (await res.json()) as ResumoGraos;
  } catch {
    return null;
  }
}

/** O que aparece na tela para cada tipo de ganho. */
export const MOTIVO: Record<string, string> = {
  leitura: 'Leitura confirmada',
  sequencia: 'Dia seguido',
  semente: 'Semente plantada',
  avaliacao: 'Você disse o que achou',
  indicacao: 'Alguém entrou pelo seu convite',
  marco: 'Novo nível',
};
