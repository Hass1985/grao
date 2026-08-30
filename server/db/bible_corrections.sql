-- Correções de transcrição no texto-fonte (Bíblia Livre).
--
-- A fonte é excelente, mas tem defeitos pontuais de digitação. Como o texto
-- bíblico é o alicerce das sementes, corrigimos aqui — e este arquivo é
-- aplicado ao final de toda reimportação, para a correção nunca se perder.
--
-- Regra: só corrigir DEFEITO ÓBVIO de transcrição (palavra duplicada, erro de
-- digitação). Nunca "melhorar" ou modernizar o texto — isso seria adulterar a
-- tradução. Cada correção deve citar o defeito.

-- Salmos 25:16 — duplicação "e mim, e mim" (detectada na auditoria de conteúdo).
-- Fonte tinha: "Olha para mim, e mim, e tem piedade de mim, porque eu estou solitário e miserável."
UPDATE bible_verses
   SET text = 'Olha para mim, e tem piedade de mim, porque eu estou solitário e miserável.'
 WHERE translation = 'BLIVRE' AND book = 'Salmos' AND chapter = 25 AND verse = 16
   AND text LIKE '%e mim, e mim%';
