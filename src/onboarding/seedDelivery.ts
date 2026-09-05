// Entrega da semente do dia.
//
// A fonte da verdade é o BACKEND. A escolha local existe só como reserva para
// o modo demo (sem EXPO_PUBLIC_GRAO_API_URL) — ela espelha a lógica do
// servidor, mas usa a lista embutida no app, com um punhado de sementes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { todaySeed, pastSeeds, Seed, SeedType, EmotionalFamily } from '../data/seeds';
import { Channel, getProfile } from './profile';
import { API_URL, getUserId } from './aiClient';

/** Converte a resposta do backend para o formato que as telas usam. */
function daApi(j: any): Seed {
  // Assinante só quando o backend confirma de forma explícita.
  // Qualquer ambiguidade cai no gratuito (devocional).
  const confirmedPaid =
    j.tipo === 'semente' ||
    j.completa === true ||
    j.acesso?.completo === true;

  const tipo: Seed['tipo'] = confirmedPaid ? 'semente' : 'devocional';
  const isFree = !confirmedPaid;

  const musicRaw =
    j.music && (j.music.title || j.music.artist)
      ? {
          title: j.music.title ?? '',
          artist: j.music.artist ?? '',
          spotifyUrl: j.music.spotifyUrl,
          youtubeUrl: j.music.youtubeUrl,
        }
      : null;

  return {
    id: j.id,
    date: j.data || j.date || new Date().toISOString().split('T')[0],
    tipo,
    title: j.title,
    type: (j.type as SeedType) || 'reflexão',
    family: (j.family as EmotionalFamily) || 'esperança',
    passage: j.passage,
    reference: j.reference,
    verse: j.verse,
    reflection: j.reflection || j.body || '',
    // Free: null = bloqueado. Nunca inventar conteúdo pago no cliente.
    prayer: isFree ? null : j.prayer ?? null,
    practice: isFree ? null : j.practice ?? null,
    music: isFree ? null : musicRaw,
    planted: false,
    compartilhavel: j.compartilhavel,
    completa: isFree ? false : true,
    bloqueado: isFree
      ? j.bloqueado ?? { prayer: true, practice: true, music: true }
      : j.bloqueado ?? null,
  };
}

const MOMENT_KEY = 'grao.moment.v1';

const CHANNEL_TO_TYPE: Record<Channel, SeedType> = {
  visual: 'reflexão',
  auditivo: 'oração',
  sinestesico: 'prática',
};

export async function setMoment(family: EmotionalFamily): Promise<void> {
  await AsyncStorage.setItem(MOMENT_KEY, family);
}

export async function getMoment(): Promise<EmotionalFamily | null> {
  return (await AsyncStorage.getItem(MOMENT_KEY)) as EmotionalFamily | null;
}

export async function clearMoment(): Promise<void> {
  await AsyncStorage.removeItem(MOMENT_KEY);
}

export interface SeedSelection {
  seed: Seed;
  family: EmotionalFamily;
  source: 'momento' | 'perfil' | 'padrão';
  channel: Channel;
}

/**
 * Escolhe a semente do dia com base no perfil-base e no momento atual.
 * No protótipo, seleciona sobre o banco local (todaySeed + pastSeeds).
 */
export async function selectTodaySeed(): Promise<SeedSelection> {
  if (API_URL) {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/seed/today/${userId}`);
      if (res.ok) {
        const j = await res.json();
        return {
          seed: daApi(j),
          family: (j.family as EmotionalFamily) || 'esperança',
          source: j.reason?.source ?? 'perfil',
          channel: (j.reason?.preferredType === 'oração'
            ? 'auditivo'
            : j.reason?.preferredType === 'prática'
              ? 'sinestesico'
              : 'visual') as Channel,
        };
      }
    } catch {
      // Rede fora: cai na escolha local em vez de deixar a tela vazia.
    }
  }

  const profile = await getProfile();
  const moment = await getMoment();

  const family: EmotionalFamily =
    moment || (profile?.emotionalHint as EmotionalFamily) || 'esperança';
  const source: SeedSelection['source'] = moment
    ? 'momento'
    : profile?.emotionalHint
      ? 'perfil'
      : 'padrão';
  const channel: Channel = profile?.sensory.dominant || 'visual';
  const preferredType = CHANNEL_TO_TYPE[channel];

  const bank: Seed[] = [todaySeed, ...pastSeeds];

  const inFamily = bank.filter((s) => s.family === family);
  const byType = inFamily.find((s) => s.type === preferredType);
  const base = byType || inFamily[0] || todaySeed;

  // Sem API (ou falha): o padrão do produto é o gratuito.
  // Assinante só aparece quando o backend confirma.
  const free: Seed = {
    ...base,
    tipo: 'devocional',
    title: base.title || 'Devocional de hoje',
    prayer: null,
    practice: null,
    music: null,
    completa: false,
    bloqueado: { prayer: true, practice: true, music: true },
    compartilhavel:
      base.compartilhavel ||
      `${base.passage}\n\n${base.reference}\n\n${base.reflection}\n\nGrão`,
  };

  return {
    seed: free,
    family,
    source,
    channel,
  };
}

/**
 * Histórico real de sementes entregues — Campo e Raiz.
 */
export async function fetchHistory(): Promise<Seed[]> {
  if (!API_URL) return pastSeeds;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/seeds/history/${userId}`);
    if (!res.ok) return pastSeeds;
    const lista = await res.json();
    if (!Array.isArray(lista)) return pastSeeds;
    return lista.map((j: any) => ({ ...daApi(j), date: j.date || j.data, planted: !!j.planted }));
  } catch {
    return pastSeeds;
  }
}
