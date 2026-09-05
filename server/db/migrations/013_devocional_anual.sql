-- O devocional anual "De Grão em Grão": 365 dias fixos, por data do calendário.
--
-- É o produto do plano GRATUITO, e é um produto inteiro, não uma amostra: a
-- pessoa abre o app na data de hoje e lê o dia dela, o ano todo. Diferente das
-- sementes, aqui o conteúdo é o mesmo para todo mundo e não depende de motor,
-- de leitura emocional nem de histórico. Um livro, com uma página por dia.
--
-- A chave é (mês, dia), não uma data completa: o devocional vale em qualquer
-- ano. "Basta abrir na data de hoje", como diz a abertura do próprio material.
--
-- 29 de fevereiro não existe no documento original. Em vez de deixar o app
-- mudo num ano bissexto (o próximo é 2028), o dia 29 recebe uma cópia do dia
-- 28. Repetir uma vez a cada quatro anos é melhor que uma tela vazia.
CREATE TABLE IF NOT EXISTS devotionals (
  month     SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day       SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  verse     TEXT NOT NULL,     -- a "âncora bíblica", já sem a referência
  reference TEXT NOT NULL,     -- o livro e capítulo ao final da âncora
  PRIMARY KEY (month, day)
);

COMMENT ON TABLE devotionals IS
  'Devocional anual do plano gratuito. Uma página por data, igual para todos.';
