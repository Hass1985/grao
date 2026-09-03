// Entrega da semente do dia.
//
// A fonte da verdade é o BACKEND. A escolha local existe só como reserva para
// o modo demo (sem EXPO_PUBLIC_GRAO_API_URL) — ela espelha a lógica do
// servidor, mas usa a lista embutida no app, com um punhado de sementes.
//
// Manter o cálculo local como caminho principal foi um erro que apareceu no
// teste: a pessoa recebia uma semente pelo WhatsApp e via OUTRA na tela Hoje,
// porque eram dois universos diferentes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { todaySeed, pastSeeds, Seed, SeedType, EmotionalFamily } from '../data/seeds';
import { Channel, getProfile } from './profile';
import { API_URL, getUserId } from './aiClient';

/** Converte a resposta do backend para o formato que as telas usam. */
function daApi(j: any): Seed {
  return {
    id: j.id,
    date: new Date().toISOString().split('T')[0],
    type: j.type as SeedType,
    family: j.family as EmotionalFamily,
    passage: j.passage,
    reference: j.reference,
    reflection: j.reflection,
    prayer: j.prayer,
    practice: j.practice,
    music: {
      title: j.music?.title ?? '',
      artist: j.music?.artist ?? '',
      spotifyUrl: j.music?.spotifyUrl,
      youtubeUrl: j.music?.youtubeUrl,
    },
    planted: false,
  };
}

const MOMENT_KEY = 'grao.moment.v1';

// Canal → formato de semente preferido.
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
  // Caminho normal: a MESMA semente que o WhatsApp entregou hoje.
  if (API_URL) {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/seed/today/${userId}`);
      if (res.ok) {
        const j = await res.json();
        return {
          seed: daApi(j),
          family: j.family as EmotionalFamily,
          source: j.reason?.source ?? 'perfil',
          channel: (j.reason?.preferredType === 'oração' ? 'auditivo'
            : j.reason?.preferredType === 'prática' ? 'sinestesico' : 'visual') as Channel,
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
  const source: SeedSelection['source'] = moment ? 'momento' : profile?.emotionalHint ? 'perfil' : 'padrão';
  const channel: Channel = profile?.sensory.dominant || 'visual';
  const preferredType = CHANNEL_TO_TYPE[channel];

  const bank: Seed[] = [todaySeed, ...pastSeeds];

  // 1) mesma família, priorizando o formato do canal
  const inFamily = bank.filter((s) => s.family === family);
  const byType = inFamily.find((s) => s.type === preferredType);
  const seed = byType || inFamily[0] || todaySeed;

  return { seed, family, source, channel };
}
