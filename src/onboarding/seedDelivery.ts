// Entrega da semente conectada ao perfil (versão local do protótipo).
// Espelha a lógica do backend: família emocional (momento manual > emotionalHint)
// + formato preferido pelo canal sensorial dominante.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { todaySeed, pastSeeds, Seed, SeedType, EmotionalFamily } from '../data/seeds';
import { Channel, getProfile } from './profile';

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
