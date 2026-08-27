import { pool, getProfile, getMoment } from './db.js';

// Canal sensorial → formato de semente preferido.
// Visual: palavra para ver e reler. Auditivo: oração/voz. Sinestésico: prática/gesto.
const CHANNEL_TO_TYPE: Record<string, string> = {
  visual: 'reflexão',
  auditivo: 'oração',
  sinestesico: 'prática',
};

export interface SelectedSeed {
  id: string;
  family: string;
  type: string;
  passage: string;
  reference: string;
  reflection: string;
  prayer: string;
  practice: string;
  music: { title?: string; artist?: string; spotifyUrl?: string; youtubeUrl?: string };
  reason: { family: string; source: 'momento' | 'perfil' | 'padrão'; preferredType: string };
}

/**
 * Escolhe a semente do dia para o usuário, priorizando:
 *  1. família emocional = momento manual (se definido) senão o emotional_hint do perfil
 *  2. formato preferido pelo canal sensorial dominante
 *  3. sementes ainda não entregues
 */
export async function selectSeedForUser(userId: string): Promise<SelectedSeed | null> {
  const profile = await getProfile(userId);
  const moment = await getMoment(userId);

  const family = moment || profile?.emotional_hint || 'esperança';
  const source: SelectedSeed['reason']['source'] = moment ? 'momento' : profile?.emotional_hint ? 'perfil' : 'padrão';
  const channel = profile?.dominant_channel || 'visual';
  const preferredType = CHANNEL_TO_TYPE[channel] || 'reflexão';

  // Tenta na família-alvo, priorizando o formato do canal e sementes inéditas.
  const params = [userId, family, preferredType];
  let { rows } = await pool.query(
    `SELECT s.* FROM seeds s
      WHERE s.family = $2
        AND s.id NOT IN (SELECT seed_id FROM seed_deliveries WHERE user_id = $1)
      ORDER BY (s.type = $3) DESC, random()
      LIMIT 1`,
    params
  );

  // Fallback 1: qualquer semente inédita (mantém o formato do canal como desempate).
  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `SELECT s.* FROM seeds s
        WHERE s.id NOT IN (SELECT seed_id FROM seed_deliveries WHERE user_id = $1)
        ORDER BY (s.type = $2) DESC, random()
        LIMIT 1`,
      [userId, preferredType]
    ));
  }

  // Fallback 2: já viu tudo — repete a mais alinhada ao momento/canal.
  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `SELECT s.* FROM seeds s
        WHERE s.family = $1
        ORDER BY (s.type = $2) DESC, random()
        LIMIT 1`,
      [family, preferredType]
    ));
  }

  if (rows.length === 0) return null;
  const s = rows[0];

  await pool.query(
    `INSERT INTO seed_deliveries (user_id, seed_id) VALUES ($1, $2)`,
    [userId, s.id]
  );

  return {
    id: s.id,
    family: s.family,
    type: s.type,
    passage: s.passage,
    reference: s.reference,
    reflection: s.reflection,
    prayer: s.prayer,
    practice: s.practice,
    music: {
      title: s.music_title || undefined,
      artist: s.music_artist || undefined,
      spotifyUrl: s.music_spotify || undefined,
      youtubeUrl: s.music_youtube || undefined,
    },
    reason: { family, source, preferredType },
  };
}
