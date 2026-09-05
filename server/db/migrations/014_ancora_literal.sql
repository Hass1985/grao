-- O versículo LITERAL de cada dia do devocional anual.
--
-- O problema medido: a "âncora bíblica" do material é paráfrase, escrita na
-- voz de Deus em primeira pessoa, mas apresentada no formato de citação, com a
-- referência ao lado. A sobreposição média de palavras com o capítulo citado é
-- de 24% (uma citação literal fica entre 90% e 100%).
--
-- Exemplo real, 12 de janeiro:
--   âncora  "Mesmo no vale mais escuro, você não anda sozinho, eu estou ao seu
--            lado" — Salmos 23
--   texto   "Ainda que eu venha a andar pelo vale da sombra da morte, não
--            temerei mal algum, porque tu estás comigo" — Salmos 23:4
--
-- Fiel no sentido, mas não é o que o Salmo diz. E o público evangélico conhece
-- o Salmo 23 de cor: uma citação que não bate desqualifica o app inteiro, e é
-- o tipo de erro que ninguém perdoa num produto de fé.
--
-- A regra, daqui para a frente: a IA NUNCA escreve versículo. Ela no máximo
-- aponta QUAL versículo do capítulo a paráfrase está retomando, e o texto vem
-- de bible_verses, a Bíblia Livre completa que já está no banco. Recuperar,
-- nunca gerar.
--
-- A paráfrase continua: ela é a voz do devocional e tem valor. O que muda é
-- que ela deixa de se passar por citação, e o versículo de verdade aparece com
-- capítulo E versículo.
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS verse_literal TEXT;
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS reference_exact TEXT;

COMMENT ON COLUMN devotionals.verse IS
  'Paráfrase na voz do devocional. NÃO é citação bíblica.';
COMMENT ON COLUMN devotionals.verse_literal IS
  'Texto bíblico literal, copiado de bible_verses (BLIVRE). Nunca gerado.';
COMMENT ON COLUMN devotionals.reference_exact IS
  'Referência com capítulo e versículo, validada contra bible_verses.';
