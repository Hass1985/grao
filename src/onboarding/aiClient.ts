// Cliente da conversa com IA de verdade (backend Claude API).
// Só é usado quando EXPO_PUBLIC_GRAO_API_URL está configurado; caso contrário,
// o app cai no roteiro local (offline) e continua funcionando no protótipo.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Defina em .env / app config: EXPO_PUBLIC_GRAO_API_URL=http://SEU_IP:8787
export const API_URL: string | null =
  (process.env.EXPO_PUBLIC_GRAO_API_URL as string | undefined)?.replace(/\/+$/, '') || null;

export const AI_MODE = !!API_URL;

const USER_KEY = 'grao.userId.v1';

function uuid(): string {
  // UUID v4 simples (suficiente para identificar o usuário no protótipo).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(USER_KEY);
  if (!id) {
    id = uuid();
    await AsyncStorage.setItem(USER_KEY, id);
  }
  return id;
}

/**
 * Troca o id guardado no aparelho.
 *
 * Necessário depois de uma FUSÃO: quando a pessoa já tinha escrito para o
 * Grão pelo WhatsApp, o backend junta os dois cadastros e o id do telefone
 * prevalece. Sem gravar o novo, o app seguiria consultando um usuário que
 * acabou de ser apagado — e a tela Hoje ficaria vazia.
 */
export async function setUserId(id: string): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, id);
}

// ---------------------------------------------------------------------------
// apiFetch: toda chamada ao backend passa por aqui.
//
// O servidor deixou de aceitar o UUID da URL como prova de identidade (ver
// server/src/identidade.ts). Quem chama precisa mandar o token da sessão do
// Supabase, e é isso que esta função faz — em um lugar só, porque espalhar o
// cabeçalho por 27 chamadas é espalhar 27 chances de esquecer uma.
// ---------------------------------------------------------------------------

/** O access token da sessão atual, ou null em modo demo / deslogado. */
async function tokenDaSessao(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function comToken(caminho: string, init: RequestInit): Promise<Response> {
  const token = await tokenDaSessao();
  return fetch(`${API_URL}${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/**
 * Uma recusa por identidade que o app consegue consertar sozinho?
 *
 * Dois casos, e os dois acontecem na vida real:
 *
 *  id_divergente  o aparelho guardou um id que ficou velho. Acontece quando a
 *                 pessoa entrou em outro celular e os cadastros foram fundidos:
 *                 o id vencedor é outro. O servidor devolve o id certo junto da
 *                 recusa, então dá para gravar e repetir na hora.
 *
 *  sem_cadastro   logou, mas a conta ainda não foi ligada ao cadastro. Na
 *                 abertura do app o vínculo é disparado sem esperar resposta,
 *                 e uma tela rápida chega antes dele. Vincula e repete.
 *
 * Devolve o caminho corrigido, ou null quando não há o que consertar.
 */
async function corrigirIdentidade(caminho: string, res: Response): Promise<string | null> {
  let corpo: any = null;
  try { corpo = await res.clone().json(); } catch { return null; }

  const antigo = await getUserId();

  if (corpo?.codigo === 'id_divergente' && corpo?.userId && corpo.userId !== antigo) {
    await setUserId(corpo.userId);
    return caminho.split(antigo).join(corpo.userId);
  }

  if (corpo?.codigo === 'sem_cadastro') {
    const token = await tokenDaSessao();
    if (!token) return null;
    const ligado = await vincularConta(token);
    if (!ligado?.userId) return null;
    return ligado.userId === antigo ? caminho : caminho.split(antigo).join(ligado.userId);
  }

  return null;
}

/**
 * fetch para o backend do Grão, com o token da sessão e um conserto automático.
 *
 * `caminho` começa com "/" e já vem com o userId dentro quando a rota pede.
 * Repete no máximo uma vez: se a segunda também for recusada, alguma coisa está
 * errada de verdade e insistir só esconderia o problema.
 */
export async function apiFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  if (!API_URL) throw new Error('API_URL não configurada');
  const res = await comToken(caminho, init);
  if (res.status !== 403) return res;

  const corrigido = await corrigirIdentidade(caminho, res);
  return corrigido ? comToken(corrigido, init) : res;
}

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TurnResponse {
  done: boolean;
  message: string;
  channel?: 'visual' | 'auditivo' | 'sinestesico';
  emotionalHint?: string;
}

export async function postTurn(userId: string, history: ApiMessage[]): Promise<TurnResponse> {
  const res = await apiFetch('/onboarding/turn', {
    method: 'POST',
    body: JSON.stringify({ userId, history }),
  });
  if (!res.ok) throw new Error(`turn falhou: ${res.status}`);
  return (await res.json()) as TurnResponse;
}

// A Abertura: um desabafo (transcrito do áudio ou escrito) → resposta que cita
// o que a pessoa contou + perfil-base salvo no backend.
export interface OpeningResponse {
  message: string;
  channel: 'visual' | 'auditivo' | 'sinestesico';
  emotionalHint: string | null;
  needsCare: boolean;
  themes: string[];
}

/**
 * `teste: true` é a demonstração do fluxo pago. A resposta vem do mesmo
 * cérebro (é o que se quer mostrar), mas o servidor não grava nada: nem turno,
 * nem leitura, nem momento emocional. Sem isso, cada demonstração reescrevia o
 * momento de quem demonstrou, e a tela Hoje passava a responder ao teste.
 */
export async function postOpening(
  userId: string,
  name: string,
  transcript: string,
  source: 'audio' | 'text',
  teste = false
): Promise<OpeningResponse> {
  const res = await apiFetch('/onboarding/opening', {
    method: 'POST',
    body: JSON.stringify({ userId, name, transcript, source, teste }),
  });
  if (!res.ok) throw new Error(`opening falhou: ${res.status}`);
  return (await res.json()) as OpeningResponse;
}

/**
 * Liga o cadastro feito aqui ao canal do WhatsApp.
 *
 * É o passo que junta as duas metades do produto: sem ele a Abertura fica só
 * no navegador e o WhatsApp nunca descobre quem é a pessoa, porque lá a
 * identidade é o telefone.
 *
 * Se ela já tiver escrito para o Grão antes, o backend funde os dois cadastros
 * e devolve o id que sobreviveu — por isso o retorno precisa ser guardado.
 */
export async function linkWhatsApp(
  userId: string,
  phone: string,
  time: string,                // "HH:MM", horário local escolhido pela pessoa
  timezone?: string,
): Promise<{ userId: string; merged: boolean } | null> {
  if (!API_URL) return null;   // modo demo, sem backend
  try {
    // O fuso vem do aparelho quando é possível. Brasília fixa acertava a
    // maioria e errava o resto em silêncio: quem está em Manaus escolhia 7h e
    // recebia às 6h, todo dia, sem nada na tela explicando por quê.
    const fuso = timezone
      || Intl.DateTimeFormat().resolvedOptions().timeZone
      || 'America/Sao_Paulo';
    const res = await apiFetch(`/profile/${userId}/whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ phone, time, timezone: fuso }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return { userId: j.userId, merged: !!j.merged };
  } catch {
    // Falha de rede não pode travar o onboarding: a pessoa segue, e o
    // WhatsApp fica pendente até ela ajustar nas configurações.
    return null;
  }
}

/**
 * Registra o plano escolhido e abre os 7 dias de teste.
 *
 * Não cobra nada — não há gateway ligado. Serve para o painel saber quantas
 * pessoas escolheram qual plano; antes disso a escolha morria na tela.
 * Silencioso de propósito: ninguém pode ficar preso na última tela do
 * onboarding por causa de uma falha de rede.
 */
export async function escolherPlano(userId: string, plan: 'plantio' | 'anual'): Promise<void> {
  if (!API_URL) return;
  try {
    await apiFetch(`/profile/${userId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  } catch {
    /* segue o fluxo */
  }
}

/**
 * Liga a conta recém-autenticada ao cadastro que o app já tinha.
 *
 * Chamado UMA vez, logo depois do login pelo SDK do Supabase, com o access
 * token dele.
 *
 * O retorno pode trazer um userId DIFERENTE do enviado, e nesse caso o app
 * precisa gravar o novo. Acontece quando a pessoa já tinha conta em outro
 * aparelho: os dois cadastros são fundidos, o da conta vence, e seguir usando o
 * id antigo faria o app consultar um cadastro que acabou de ser apagado, com a
 * tela Hoje vazia e sem explicação.
 */
export async function vincularConta(
  accessToken: string,
): Promise<{ userId: string; merged: boolean } | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    // fetch cru, não apiFetch, de propósito: esta é a chamada que RESOLVE a
    // identidade, e ela já recebe o token de quem a chamou. Passar por apiFetch
    // faria o conserto automático chamar vincularConta de novo, em círculo.
    const res = await fetch(`${API_URL}/auth/vincular`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (j.userId && j.userId !== userId) await setUserId(j.userId);
    return { userId: j.userId, merged: !!j.merged };
  } catch {
    // Falha de rede não pode travar quem acabou de logar: a pessoa entra, e a
    // ligação acontece na próxima abertura do app.
    return null;
  }
}
