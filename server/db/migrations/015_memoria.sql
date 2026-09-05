-- Memória longitudinal: o que o Grão lembra da vida da pessoa.
--
-- É o fosso do produto. O concorrente é uma biblioteca estática: conteúdo
-- pré-produzido, igual para todos, escolhido por categoria. Copiar isto
-- exigiria refazer a arquitetura deles inteira, porque não é diferencial de
-- tecnologia, é de relação: se a pessoa falou na terça que o filho estava
-- internado, na sexta a semente retoma aquilo.
--
-- Hoje o motor lê cada mensagem, extrai a família emocional e JOGA O RESTO
-- FORA. O que a pessoa contou não sobrevive à conversa.
--
-- A COLUNA MAIS IMPORTANTE AQUI É `evidencia`.
--
-- Sem ela, esta tabela vira uma máquina de inventar a vida dos outros, e isso
-- já aconteceu neste produto: o motor afirmou coisas que a pessoa nunca disse,
-- e foi o erro mais grave que cometemos. Toda memória carrega as PALAVRAS
-- LITERAIS que a originaram. Sem citação, não há memória: a linha é recusada
-- na entrada.
--
-- Memória também precisa esquecer. "O filho está internado" é verdade em
-- março e é um tapa na cara em setembro. Cada categoria tem um prazo, e
-- `encerrada_em` marca o que a própria pessoa disse que acabou ("ele teve
-- alta").
CREATE TABLE IF NOT EXISTS user_memories (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- O fato em terceira pessoa, curto: "o filho está internado".
  fato          TEXT NOT NULL,
  -- As palavras da PESSOA que sustentam o fato. Obrigatório.
  evidencia     TEXT NOT NULL CHECK (length(trim(evidencia)) > 0),
  -- pessoa | saude | trabalho | perda | fe | rotina
  categoria     TEXT NOT NULL,
  confianca     INT  NOT NULL CHECK (confianca BETWEEN 0 AND 100),
  primeira_vez  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_mencao TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Quando a pessoa disse que aquilo acabou. NULL = ainda vale.
  encerrada_em  TIMESTAMPTZ,
  -- Quantas vezes o Grão já retomou isto. Retomar demais vira insistência.
  vezes_usada   INT NOT NULL DEFAULT 0,
  ultima_vez_usada TIMESTAMPTZ
);

-- A leitura é sempre "as memórias vivas desta pessoa, mais recentes primeiro".
CREATE INDEX IF NOT EXISTS idx_memorias_vivas
  ON user_memories (user_id, ultima_mencao DESC)
  WHERE encerrada_em IS NULL;

COMMENT ON COLUMN user_memories.evidencia IS
  'Palavras literais da pessoa. Sem isto o motor inventa a vida dela.';
