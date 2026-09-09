-- Os grãos: o que a pessoa acumula caminhando com o app.
--
-- É um livro-razão, não um contador. Cada linha diz quanto, por quê e por
-- causa de quê — e é isso que permite explicar um saldo para alguém que
-- pergunta, recalcular sem medo e auditar quando o número não bater.
--
-- `referencia` é o que dá idempotência: a data da leitura, o id da semente, o
-- nome do marco. Confirmar a mesma leitura duas vezes, ou o servidor reiniciar
-- no meio de uma entrega, não credita de novo — a chave única barra. Sem isso,
-- um retry de rede vira saldo inflado, e saldo inflado num produto de fé é
-- exatamente o tipo de erro que ninguém reporta e todo mundo percebe.
CREATE TABLE IF NOT EXISTS graos (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantidade  INT NOT NULL,
  motivo      TEXT NOT NULL,      -- leitura | sequencia | semente | avaliacao | indicacao | marco
  referencia  TEXT,               -- data, seed_id, nível — o que torna o crédito único
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_graos_unico
  ON graos (user_id, motivo, referencia) WHERE referencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_graos_user ON graos (user_id, criado_em DESC);

COMMENT ON TABLE graos IS
  'Livro-razão dos grãos: quanto, por quê e por causa de quê. Saldo = soma.';
