-- A leitura confirmada do devocional do dia.
--
-- É o que dá vida às telas Campo e Raiz de quem é gratuito. Antes elas liam
-- entregas do motor, que o gratuito não tem: o Campo mostrava um calendário
-- onde nada acontecia e a Raiz listava todos os dias do ano como se a pessoa
-- os tivesse lido. Marcar tudo como lido é o mesmo que não marcar nada — o
-- histórico só vale se disser o que a pessoa fez de verdade.
--
-- A chave é (usuário, data): uma leitura por dia, e confirmar duas vezes não
-- cria duas linhas. A data é a do fuso da pessoa, resolvida por quem escreve.
CREATE TABLE IF NOT EXISTS devotional_reads (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data     DATE NOT NULL,
  lido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, data)
);

CREATE INDEX IF NOT EXISTS idx_leitura_user ON devotional_reads (user_id, data DESC);

COMMENT ON TABLE devotional_reads IS
  'Leitura confirmada do devocional diário: o histórico real do plano gratuito.';
