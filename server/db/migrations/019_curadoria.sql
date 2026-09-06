-- "Esta semente falou com você?"
--
-- Sem isto, avaliar a curadoria é ouvir uma pessoa por vez e adivinhar o
-- resto. A pergunta é a única forma barata de saber se o motor está acertando
-- — e é ela que diz se a curadoria por modelo valeu o que custa.
--
-- Uma resposta por semente por pessoa, e pode mudar de ideia: a chave é
-- (usuário, semente) e a escrita é um upsert.
CREATE TABLE IF NOT EXISTS seed_feedback (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed_id    TEXT NOT NULL REFERENCES seeds(id),
  util       BOOLEAN NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, seed_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_semente ON seed_feedback (seed_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data ON seed_feedback (criado_em DESC);

COMMENT ON TABLE seed_feedback IS
  'Resposta da pessoa à pergunta "esta semente falou com você?". Mede a curadoria.';
