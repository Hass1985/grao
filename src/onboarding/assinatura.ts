// A situação real da assinatura de quem está com o app aberto.
//
// Existe porque a tela de ajustes dizia "Plantio · R$ 19,90/mês · renovação
// automática" escrito no código, igual para todo mundo — inclusive para quem
// nunca pagou nada. Anunciar uma cobrança que não existe é o tipo de erro que
// destrói confiança de uma vez só.

import { API_URL, getUserId, apiFetch } from './aiClient';

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
    const res = await apiFetch(`/assinatura/${userId}`);
    if (!res.ok) return null;
    return (await res.json()) as SituacaoAssinatura;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Começar a assinatura: os 7 dias grátis e, depois deles, o Pix.
// ---------------------------------------------------------------------------

export interface PlanoOferecido {
  id: 'plantio' | 'anual';
  nome: string;
  valorCentavos: number;
  ciclo: string;
}

export interface ConfigCobranca {
  ativa: boolean;
  ambiente: 'sandbox' | 'producao' | 'desligado';
  diasGratis: number;
  planos: PlanoOferecido[];
}

/**
 * Preços e ambiente vêm do servidor, nunca do app.
 *
 * Preço escrito na tela é preço que um dia diverge do que o gateway cobra, e a
 * divergência aparece na fatura de alguém. E o ambiente é o que permite a tela
 * avisar, em sandbox, que aquele botão não cobra de verdade.
 */
export async function configuracaoDeCobranca(): Promise<ConfigCobranca | null> {
  if (!API_URL) return null;
  try {
    const res = await apiFetch(`/assinatura/config`);
    if (!res.ok) return null;
    return (await res.json()) as ConfigCobranca;
  } catch {
    return null;
  }
}

/**
 * Cria a assinatura com 7 dias grátis.
 *
 * Devolve o erro em texto em vez de engolir: aqui o que falha é quase sempre o
 * CPF, e "não deu certo" deixa a pessoa sem saber o que corrigir. A mensagem
 * do gateway ("O CPF/CNPJ informado é inválido") é a informação que resolve.
 */
export async function assinar(dados: {
  plano: 'plantio' | 'anual';
  cpf: string;
  email?: string;
}): Promise<{ ok: true; primeiraCobranca: string } | { ok: false; erro: string }> {
  if (!API_URL) return { ok: false, erro: 'Sem conexão com o servidor agora.' };
  try {
    const userId = await getUserId();
    const res = await apiFetch(`/assinatura/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano: dados.plano, cpf: dados.cpf, email: dados.email }),
    });
    const corpo = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      return {
        ok: false,
        erro: res.status === 503
          ? 'A cobrança ainda não está ligada. Avise a gente que liberamos o seu acesso.'
          : (corpo?.error ?? 'Não foi possível começar agora. Tente de novo.'),
      };
    }
    return { ok: true, primeiraCobranca: corpo.primeiraCobranca };
  } catch {
    return { ok: false, erro: 'Sem conexão agora. Confira a internet e tente de novo.' };
  }
}

/** "123.456.789-09" enquanto a pessoa digita. */
export function mascararCpf(bruto: string): string {
  const d = (bruto ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * O dígito verificador, conferido aqui.
 *
 * O Asaas recusa CPF inválido, mas a recusa chega depois de uma ida ao
 * gateway, como erro em vermelho num formulário já enviado. Conferir na tela
 * transforma isso em "confira o número" antes de qualquer coisa acontecer.
 */
export function cpfValido(bruto: string): boolean {
  const d = (bruto ?? '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function emReais(centavos: number | null): string {
  if (centavos == null) return '';
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

/**
 * "11 de setembro" — como a pessoa lê, não como o banco guarda.
 *
 * Data pura ("2026-09-18") é montada com os números na mão, e não com
 * `new Date(iso)`. O construtor lê esse formato como meia-noite em UTC; no
 * Brasil, três horas antes, isso ainda é o dia anterior — e a tela dizia que a
 * primeira cobrança era em 17 quando o Pix vence em 18.
 *
 * Errar a data para MENOS é menos grave que para mais, mas continua sendo o app
 * anunciando uma cobrança no dia errado. Com hora junto (um timestamp de
 * verdade) não há ambiguidade, e o caminho normal vale.
 */
export function porExtenso(iso: string | null): string {
  if (!iso) return '';
  const so = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = so
    ? new Date(Number(so[1]), Number(so[2]) - 1, Number(so[3]))
    : new Date(iso);
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
    const res = await apiFetch(`/profile/${userId}/preferencias`);
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
    const res = await apiFetch(`/profile/${userId}/horario`, {
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
    const res = await apiFetch(`/user/${userId}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
