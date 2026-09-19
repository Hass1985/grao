-- O batimento da agenda de entrega.
--
-- A varredura roda 1.440 vezes por dia e só deixava rastro quando enviava
-- alguma coisa — o que, na maioria das voltas, não acontece. O resultado é que
-- o silêncio de uma agenda saudável era idêntico ao de uma agenda morta.
--
-- Foi por isso que uma varredura travada passou dias despercebida: nos
-- registros, entregas às 13h30 num dia e às 15h47 no outro, sempre com
-- "falhas: 0". Não havia erro para ver, porque não havia execução.
--
-- Uma linha só, atualizada a cada volta. A diferença entre `em` e agora
-- responde "a agenda está viva?" sem abrir log nenhum.
CREATE TABLE IF NOT EXISTS agenda_batimento (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO agenda_batimento (id, em) VALUES (true, now())
  ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE agenda_batimento IS
  'Uma linha: a última vez que a varredura da agenda completou uma volta.';
