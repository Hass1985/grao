-- Pares de sementes SEMELHANTES (mesma família, prática ou abertura parecida).
--
-- Existe para uma garantia de produto: duas sementes parecidas nunca podem cair
-- perto uma da outra no calendário do usuário. A auditoria editorial apontou 22
-- casos assim; em vez de reescrever conteúdo bom, o motor passa a espaçá-los.
--
-- Simétrica por construção: o script grava (a,b) e (b,a), para a consulta do
-- seletor ser um lookup direto, sem OR.
CREATE TABLE IF NOT EXISTS seed_similar (
  seed_id     TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  similar_id  TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  score       REAL NOT NULL,
  motivo      TEXT NOT NULL,          -- 'pratica' | 'abertura'
  PRIMARY KEY (seed_id, similar_id)
);

CREATE INDEX IF NOT EXISTS idx_seed_similar_lookup ON seed_similar (seed_id);
