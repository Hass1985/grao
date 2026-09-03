// Cliente da conversa com IA de verdade (backend Claude API).
// Só é usado quando EXPO_PUBLIC_GRAO_API_URL está configurado; caso contrário,
// o app cai no roteiro local (offline) e continua funcionando no protótipo.

import AsyncStorage from '@react-native-async-storage/async-storage';

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
  if (!API_URL) throw new Error('API_URL não configurada');
  const res = await fetch(`${API_URL}/onboarding/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function postOpening(
  userId: string,
  name: string,
  transcript: string,
  source: 'audio' | 'text'
): Promise<OpeningResponse> {
  if (!API_URL) throw new Error('API_URL não configurada');
  const res = await fetch(`${API_URL}/onboarding/opening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name, transcript, source }),
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
): Promise<{ userId: string; merged: boolean } | null> {
  if (!API_URL) return null;   // modo demo, sem backend
  try {
    const res = await fetch(`${API_URL}/profile/${userId}/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, time, timezone: 'America/Sao_Paulo' }),
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
    await fetch(`${API_URL}/profile/${userId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
  } catch {
    /* segue o fluxo */
  }
}
