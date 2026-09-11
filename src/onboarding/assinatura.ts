// A situação real da assinatura de quem está com o app aberto.
//
// Existe porque a tela de ajustes dizia "Plantio · R$ 19,90/mês · renovação
// automática" escrito no código, igual para todo mundo — inclusive para quem
// nunca pagou nada. Anunciar uma cobrança que não existe é o tipo de erro que
// destrói confiança de uma vez só.

import { API_URL, getUserId } from './aiClient';

export interface SituacaoAssinatura {
  completo: boolean;
  situacao: string;
  plano: string | null;
  nomeDoPlano: string | null;
  valorCentavos: number | null;
  terminaEm: string | null;
  proximaCobranca: string | null;
  /** Nasceu de pagamento de verdade, e não de cortesia ou escolha de plano. */
  peloGateway: boolean;
}

export async function minhaAssinatura(): Promise<SituacaoAssinatura | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/assinatura/${userId}`);
    if (!res.ok) return null;
    return (await res.json()) as SituacaoAssinatura;
  } catch {
    return null;
  }
}

export function emReais(centavos: number | null): string {
  if (centavos == null) return '';
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

/** "11 de setembro" — como a pessoa lê, não como o banco guarda. */
export function porExtenso(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

// ---------------------------------------------------------------------------
// Preferências da entrega e exclusão da conta.
// ---------------------------------------------------------------------------

export interface Preferencias {
  horario: string | null;
  whatsappLigado: boolean;
}

export async function minhasPreferencias(): Promise<Preferencias | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/profile/${userId}/preferencias`);
    if (!res.ok) return null;
    return (await res.json()) as Preferencias;
  } catch {
    return null;
  }
}

/** Salva o horário da entrega. Antes o seletor dos ajustes não saía da tela. */
export async function salvarHorario(horario: string): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const userId = await getUserId();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`${API_URL}/profile/${userId}/horario`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ horario, timezone }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Apaga tudo, de verdade.
 *
 * O botão existia e o confirmar não fazia nada: a tela prometia exclusão
 * definitiva e não apagava um byte. Além de quebrar a confiança, é promessa de
 * tratamento de dado pessoal que a LGPD leva a sério.
 */
export async function excluirMinhaConta(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/user/${userId}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
