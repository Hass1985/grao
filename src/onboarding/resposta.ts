// A resposta da pessoa à semente do dia.
//
// Quem assina tem a resposta LIDA pelo cérebro — é dela que saem as memórias
// que o Grão retoma dias depois. Quem é gratuito escreve e o texto fica
// guardado para reler. Quem decide isso é o SERVIDOR, pela mesma regra do
// paywall: o app não tem como saber, e não deveria.

import { API_URL, getUserId, apiFetch } from './aiClient';

export interface RespostaGuardada {
  ok: boolean;
  data: string;
  graosGanhos: number;
  /** Texto fixo de acolhimento quando o relato indica sofrimento grave. */
  cuidado?: string;
  /** Quantas memórias saíram desta resposta (só para quem assina). */
  lembrou?: number;
}

export async function responderHoje(texto: string): Promise<RespostaGuardada | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await apiFetch(`/resposta/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RespostaGuardada;
  } catch {
    return null;
  }
}

/**
 * A resposta de um dia. Sem data, é hoje — e quem decide qual é "hoje" é o
 * servidor, no fuso da pessoa.
 *
 * O app não pode calcular isso: `toISOString` devolve a data em UTC, e quem
 * escreve às 21h no Brasil já está no dia seguinte lá. O campo apareceria
 * vazio como se a pessoa nunca tivesse escrito, justo no horário de maior
 * leitura.
 */
export async function respostaDoDia(data?: string): Promise<string | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await apiFetch(
      data ? `/resposta/${userId}/${data}` : `/resposta/${userId}`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.texto ?? null;
  } catch {
    return null;
  }
}
