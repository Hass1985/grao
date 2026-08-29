-- ============================================================================
-- MIGRAÇÃO 002 — Arquitetura de conteúdo em escala.
--
-- Quatro peças:
--  1. bible_verses    — a Bíblia COMPLETA dentro do nosso banco (Bíblia Livre,
--                       tradução brasileira moderna, licença CC-BY 3.0 BR).
--                       O texto bíblico NUNCA vem da memória de um modelo.
--  2. passage_pool    — referências curadas por família emocional (o "cardápio"
--                       de onde o gerador sorteia passagens).
--  3. musics          — pool de louvores VALIDADOS por API (nada de título
--                       inventado; cada linha diz quem verificou e quando).
--  4. content_drafts  — rascunhos gerados por IA aguardando revisão humana.
--                       Nada chega ao usuário sem passar por aqui.
-- ============================================================================

CREATE TABLE IF NOT EXISTS bible_verses (
  book_nr     INT  NOT NULL,          -- 1..66 na ordem canônica
  book        TEXT NOT NULL,          -- "Gênesis", "Salmos", ...
  chapter     INT  NOT NULL,
  verse       INT  NOT NULL,
  text        TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT 'BLIVRE',
  PRIMARY KEY (translation, book_nr, chapter, verse)
);
CREATE INDEX IF NOT EXISTS idx_bible_book ON bible_verses(book, chapter, verse);

CREATE TABLE IF NOT EXISTS passage_pool (
  id          SERIAL PRIMARY KEY,
  family      TEXT NOT NULL,          -- ansiedade | paz | esperança | ...
  book        TEXT NOT NULL,
  chapter     INT  NOT NULL,
  verse_start INT  NOT NULL,
  verse_end   INT,                    -- null = versículo único
  reference   TEXT NOT NULL,          -- "Filipenses 4:6-7" (exibição)
  note        TEXT,                   -- por que serve a esta família
  used_count  INT  NOT NULL DEFAULT 0,
  UNIQUE (family, reference)
);
CREATE INDEX IF NOT EXISTS idx_pool_family ON passage_pool(family);

CREATE TABLE IF NOT EXISTS musics (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  families    TEXT[] NOT NULL,        -- famílias que a música serve
  spotify_url TEXT,
  youtube_url TEXT,
  itunes_url  TEXT,
  preview_url TEXT,                   -- prévia de 30s (iTunes)
  verified_by TEXT NOT NULL,          -- itunes | spotify | manual
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (title, artist)
);

CREATE TABLE IF NOT EXISTS content_drafts (
  id          BIGSERIAL PRIMARY KEY,
  seed_id     TEXT NOT NULL UNIQUE,   -- vira seeds.id ao publicar
  family      TEXT NOT NULL,
  type        TEXT NOT NULL,          -- reflexão | oração | prática
  passage     TEXT NOT NULL,          -- texto EXATO vindo de bible_verses
  reference   TEXT NOT NULL,
  reflection  TEXT NOT NULL,
  prayer      TEXT NOT NULL,
  practice    TEXT NOT NULL,
  music_id    INT REFERENCES musics(id),
  status      TEXT NOT NULL DEFAULT 'draft',  -- draft|approved|rejected|published
  review_note TEXT,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON content_drafts(status, family);

-- Painel: saúde do banco de conteúdo por família.
CREATE OR REPLACE VIEW v_content_health AS
SELECT
  f.family,
  (SELECT count(*) FROM seeds s WHERE s.family = f.family)                        AS publicadas,
  (SELECT count(*) FROM content_drafts d WHERE d.family = f.family AND d.status='draft')    AS rascunhos,
  (SELECT count(*) FROM passage_pool p WHERE p.family = f.family)                 AS passagens_no_pool,
  (SELECT count(*) FROM musics m WHERE f.family = ANY(m.families))                AS musicas
FROM (SELECT DISTINCT family FROM seeds
      UNION SELECT DISTINCT family FROM passage_pool) f
ORDER BY f.family;
