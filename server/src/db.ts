import pg from 'pg';

const { Pool } = pg;

// Supabase, Neon, Render e afins exigem SSL. Em produção habilitamos SSL sem
// exigir CA local (os provedores usam certificados intermediários próprios);
// em localhost, sem SSL. Force com PGSSL=true|false se precisar.
const url = process.env.DATABASE_URL ?? '';
const isLocal = /localhost|127\.0\.0\.1/.test(url);
const useSsl =
  process.env.PGSSL === 'true' ? true : process.env.PGSSL === 'false' ? false : !!url && !isLocal;

export const pool = new Pool({
  connectionString: url,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Um erro no pool não deve derrubar o processo inteiro.
pool.on('error', (err) => console.error('[db] erro no pool:', err.message));

export interface ProfileRow {
  user_id: string;
  dominant_channel: 'visual' | 'auditivo' | 'sinestesico';
  emotional_hint: string | null;
  ocean: Record<string, number>;
  raw: unknown;
}

export async function ensureUser(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [userId]
  );
}

export async function saveTurn(userId: string, role: string, content: string) {
  await pool.query(
    `INSERT INTO conversation_turns (user_id, role, content) VALUES ($1,$2,$3)`,
    [userId, role, content]
  );
}

export async function upsertProfile(userId: string, p: any): Promise<void> {
  await pool.query(
    `INSERT INTO users (id, name, consent_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [userId, p.name ?? null]
  );
  await pool.query(
    `INSERT INTO profiles
       (user_id, version, dominant_channel, sensory_scores, ocean, emotional_hint, initial_request, raw, updated_at)
     VALUES ($1, 1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id) DO UPDATE SET
       dominant_channel = EXCLUDED.dominant_channel,
       sensory_scores   = EXCLUDED.sensory_scores,
       ocean            = EXCLUDED.ocean,
       emotional_hint   = EXCLUDED.emotional_hint,
       initial_request  = EXCLUDED.initial_request,
       raw              = EXCLUDED.raw,
       updated_at       = now()`,
    [
      userId,
      p.dominant_channel,
      JSON.stringify(p.sensory_scores),
      JSON.stringify(p.ocean),
      p.emotional_hint ?? null,
      p.initial_request ?? null,
      JSON.stringify(p),
    ]
  );
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { rows } = await pool.query(
    `SELECT user_id, dominant_channel, emotional_hint, ocean, raw FROM profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function setMoment(userId: string, family: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_moment (user_id, family, set_by, updated_at)
     VALUES ($1, $2, 'user', now())
     ON CONFLICT (user_id) DO UPDATE SET family = EXCLUDED.family, updated_at = now()`,
    [userId, family]
  );
}

export async function getMoment(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT family FROM user_moment WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.family ?? null;
}

export async function deleteUserData(userId: string): Promise<void> {
  // LGPD: exclusão total. ON DELETE CASCADE remove perfil, momento, conversa,
  // entregas, leituras emocionais e eventos.
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

// ---------------------------------------------------------------------------
// O cérebro: leituras emocionais + estado atual
// ---------------------------------------------------------------------------

export interface ReadingRow {
  family: string;
  intensity: number;
  confidence: number;
  needs_care: boolean;
  created_at: string;
}

export async function saveReading(
  userId: string,
  source: string,
  r: { family: string; intensity: number; confidence: number; channel_hint: string | null; needs_care: boolean; summary: string }
): Promise<void> {
  await pool.query(
    `INSERT INTO emotional_readings (user_id, source, family, intensity, confidence, channel_hint, needs_care, summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, source, r.family, r.intensity, r.confidence, r.channel_hint, r.needs_care, r.summary]
  );
}

export async function getLatestReading(userId: string, minConfidence = 60): Promise<ReadingRow | null> {
  const { rows } = await pool.query(
    `SELECT family, intensity, confidence, needs_care, created_at
       FROM emotional_readings
      WHERE user_id = $1 AND confidence >= $2
      ORDER BY created_at DESC LIMIT 1`,
    [userId, minConfidence]
  );
  return rows[0] ?? null;
}

export async function getRecentUserMessages(userId: string, limit = 4): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT content FROM conversation_turns
      WHERE user_id = $1 AND role = 'user'
      ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map((r) => r.content).reverse();
}

/**
 * Atualização de momento PELO CÉREBRO (set_by = 'system').
 * Regra de respeito: nunca sobrepõe um momento definido pelo PRÓPRIO usuário
 * nas últimas 24h — a escolha consciente vale mais que a inferência.
 */
export async function setMomentBySystem(userId: string, family: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO user_moment (user_id, family, set_by, updated_at)
     VALUES ($1, $2, 'system', now())
     ON CONFLICT (user_id) DO UPDATE SET
       family = EXCLUDED.family, set_by = 'system', updated_at = now()
     WHERE user_moment.set_by = 'system'
        OR user_moment.updated_at < now() - interval '24 hours'`,
    [userId, family]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Eventos de produto (alimentam os painéis)
// ---------------------------------------------------------------------------

export async function logEvent(userId: string | null, type: string, payload: Record<string, unknown> = {}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO events (user_id, type, payload) VALUES ($1, $2, $3)`,
      [userId, type, JSON.stringify(payload)]
    );
  } catch (err: any) {
    // Analytics nunca derruba o fluxo principal.
    console.warn('[events] falha ao registrar', type, err?.message || err);
  }
}
