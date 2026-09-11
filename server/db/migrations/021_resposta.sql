-- O que a pessoa respondeu à semente do dia.
--
-- É a outra metade da conversa. Até aqui o Grão falava e a pessoa só recebia;
-- o único lugar onde ela escrevia era a abertura, uma vez na vida. Sem um
-- lugar para responder, a memória longitudinal só tem o que foi dito no
-- primeiro dia — e o motor envelhece junto com aquele retrato.
--
-- Uma resposta por dia, editável: a chave é (usuário, data). Quem escreve de
-- manhã e volta à noite com outra frase está corrigindo, não acrescentando.
CREATE TABLE IF NOT EXISTS respostas (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data       DATE NOT NULL,
  texto      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, data)
);

CREATE INDEX IF NOT EXISTS idx_respostas_user ON respostas (user_id, data DESC);

COMMENT ON TABLE respostas IS
  'A resposta da pessoa à semente do dia: o lado dela da conversa.';
