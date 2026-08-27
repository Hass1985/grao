-- Banco de dados do Grão.
-- LGPD: convicção religiosa é dado pessoal SENSÍVEL (Lei 13.709, art. 5º, II).
-- Coletamos apenas o necessário para personalizar o conteúdo, com base no
-- consentimento do titular, e permitimos exclusão a qualquer momento.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164    TEXT UNIQUE,                 -- WhatsApp (canal principal)
  name          TEXT,
  tradition     TEXT NOT NULL DEFAULT 'evangelical',
  consent_at    TIMESTAMPTZ,                 -- quando aceitou a política
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfil-base construído na conversa inicial. Um por usuário (o mais recente vale).
-- Guardado como JSONB para evoluir o formato sem migração pesada.
CREATE TABLE IF NOT EXISTS profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version           INT  NOT NULL DEFAULT 1,
  dominant_channel  TEXT NOT NULL,           -- visual | auditivo | sinestesico
  sensory_scores    JSONB NOT NULL,          -- { visual, auditivo, sinestesico }
  ocean             JSONB NOT NULL,          -- { O,C,E,A,N } 0-100
  emotional_hint    TEXT,                    -- família emocional inicial
  initial_request   TEXT,                    -- "o que tem pedido a Deus" (texto livre)
  raw               JSONB NOT NULL,          -- JSON completo (answers etc.)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Momento atual" que o próprio usuário pode ajustar nas configurações.
-- Sobrepõe o emotional_hint na hora de escolher a semente do dia.
CREATE TABLE IF NOT EXISTS user_moment (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  family      TEXT NOT NULL,                 -- ansiedade | paz | esperança | ...
  set_by      TEXT NOT NULL DEFAULT 'user',  -- user | system
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log da conversa inicial (auditoria + reprocessamento).
CREATE TABLE IF NOT EXISTS conversation_turns (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,                 -- user | assistant
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Banco de sementes (as 243). type: reflexão | oração | prática.
CREATE TABLE IF NOT EXISTS seeds (
  id          TEXT PRIMARY KEY,
  family      TEXT NOT NULL,
  type        TEXT NOT NULL,
  passage     TEXT NOT NULL,
  reference   TEXT NOT NULL,
  reflection  TEXT NOT NULL,
  prayer      TEXT NOT NULL,
  practice    TEXT NOT NULL,
  music_title TEXT,
  music_artist TEXT,
  music_spotify TEXT,
  music_youtube TEXT
);

-- Sementes já entregues (evita repetir e alimenta o "Campo"/"Raiz").
CREATE TABLE IF NOT EXISTS seed_deliveries (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed_id      TEXT NOT NULL REFERENCES seeds(id),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  planted      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_deliveries_user ON seed_deliveries(user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_seeds_family ON seeds(family);

-- ============================================================================
-- O CÉREBRO: leituras emocionais contínuas (brain.ts).
-- Cada mensagem do usuário (app ou WhatsApp) gera uma leitura silenciosa.
-- O estado atual = leitura mais recente com confiança suficiente.
-- ============================================================================
CREATE TABLE IF NOT EXISTS emotional_readings (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source      TEXT NOT NULL DEFAULT 'app',   -- app | whatsapp | onboarding
  family      TEXT NOT NULL,                 -- ansiedade | paz | esperança | ...
  intensity   INT  NOT NULL,                 -- 0-100
  confidence  INT  NOT NULL,                 -- 0-100
  channel_hint TEXT,                         -- visual | auditivo | sinestesico | null
  needs_care  BOOLEAN NOT NULL DEFAULT false,
  summary     TEXT,                          -- 1 frase interna (nunca exibida)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_readings_user ON emotional_readings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_family ON emotional_readings(family, created_at DESC);

-- Eventos de produto (analytics): tudo que vira número em painel.
-- type: signup | onboarding_done | message_in | seed_delivered | seed_planted |
--       moment_changed | subscription_started | ...
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, created_at DESC);

-- ============================================================================
-- VIEWS DE PAINEL (funcionam direto no Supabase Studio / qualquer BI).
-- ============================================================================

-- Cadastros por dia.
CREATE OR REPLACE VIEW v_signups_daily AS
SELECT date_trunc('day', created_at)::date AS day, count(*) AS signups
FROM users GROUP BY 1 ORDER BY 1 DESC;

-- Distribuição emocional dos últimos 30 dias (o "termômetro" da base).
CREATE OR REPLACE VIEW v_family_distribution_30d AS
SELECT family, count(*) AS readings, round(avg(intensity)) AS avg_intensity
FROM emotional_readings
WHERE created_at > now() - interval '30 days' AND confidence >= 60
GROUP BY family ORDER BY readings DESC;

-- Entregas e plantios por dia (engajamento/retensão do ritual).
CREATE OR REPLACE VIEW v_deliveries_daily AS
SELECT date_trunc('day', delivered_at)::date AS day,
       count(*) AS delivered,
       count(*) FILTER (WHERE planted) AS planted
FROM seed_deliveries GROUP BY 1 ORDER BY 1 DESC;

-- Usuários ativos por dia (mandaram ao menos 1 mensagem).
CREATE OR REPLACE VIEW v_active_users_daily AS
SELECT date_trunc('day', created_at)::date AS day, count(DISTINCT user_id) AS active_users
FROM events WHERE type = 'message_in' GROUP BY 1 ORDER BY 1 DESC;

-- Sinais de cuidado recentes (para acompanhamento pastoral humano).
CREATE OR REPLACE VIEW v_needs_care_7d AS
SELECT r.user_id, u.name, r.family, r.intensity, r.created_at
FROM emotional_readings r JOIN users u ON u.id = r.user_id
WHERE r.needs_care AND r.created_at > now() - interval '7 days'
ORDER BY r.created_at DESC;
