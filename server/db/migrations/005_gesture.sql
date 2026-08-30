-- Rótulo semântico do gesto físico da prática (vocabulário fechado).
-- Usado pelo seletor para não repetir o mesmo gesto dentro da janela de
-- proteção — repetição que a similaridade léxica não detecta.
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS gesture TEXT;
CREATE INDEX IF NOT EXISTS idx_seeds_gesture ON seeds (family, gesture);
