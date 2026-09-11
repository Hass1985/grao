// Cliente da Bíblia. O texto mora no servidor, não no app.
//
// São ~4 MB de texto: embutir pesaria o download inicial de todo mundo para
// servir a consulta de alguns, e corrigir um versículo errado exigiria uma
// publicação nova para chegar em quem já instalou.

import { API_URL } from './aiClient';

export interface LivroBiblia {
  numero: number;
  nome: string;
  capitulos: number;
  antigo: boolean;
}

export interface CapituloBiblia {
  livro: string;
  capitulo: number;
  capitulos: number;
  traducao: string;
  versiculos: { numero: number; texto: string }[];
}

export interface AchadoBiblia {
  livro: string;
  capitulo: number;
  versiculo: number;
  texto: string;
}

/**
 * Quebra "1 Coríntios 13:4-7" em livro e capítulo.
 *
 * O nome do livro pode ter número na frente (1 Reis, 2 Samuel) e espaço no
 * meio, então a âncora é o ÚLTIMO número antes dos dois-pontos — tentar achar
 * o livro por lista de nomes quebraria em qualquer grafia diferente.
 *
 * Aceita também referência sem versículo ("Salmos 23"), que é como algumas
 * âncoras do devocional aparecem.
 */
export function partesDaReferencia(
  referencia: string | null | undefined,
): { livro: string; capitulo: number } | null {
  const r = String(referencia ?? '').trim();
  if (!r) return null;
  const m = /^(.+?)\s+(\d+)\s*(?::|$)/.exec(r);
  if (!m) return null;
  const capitulo = Number(m[2]);
  if (!m[1] || !Number.isInteger(capitulo) || capitulo < 1) return null;
  return { livro: m[1].trim(), capitulo };
}

export async function livrosDaBiblia(): Promise<LivroBiblia[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/biblia/livros`);
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j.livros) ? j.livros : [];
  } catch {
    return [];
  }
}

export async function capituloDaBiblia(
  livro: string,
  capitulo: number,
): Promise<CapituloBiblia | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/biblia/${encodeURIComponent(livro)}/${capitulo}`);
    if (!res.ok) return null;
    return (await res.json()) as CapituloBiblia;
  } catch {
    return null;
  }
}

export async function buscarNaBiblia(termo: string): Promise<AchadoBiblia[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/biblia/busca?q=${encodeURIComponent(termo)}`);
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j.resultados) ? j.resultados : [];
  } catch {
    return [];
  }
}
