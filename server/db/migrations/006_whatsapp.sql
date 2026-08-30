-- Suporte ao canal WhatsApp.
--
-- O app já pergunta a janela de horário no onboarding (Amanhecer/Manhã/
-- Meio-dia/Noite), mas o backend não guardava a resposta — sem isso não há
-- como o cron saber a quem entregar às 8h.
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_window TEXT;   -- dawn|morning|noon|evening
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_opt_in_at TIMESTAMPTZ;  -- consentimento explícito

-- O cron busca por janela; sem índice isso vira varredura a cada disparo.
CREATE INDEX IF NOT EXISTS idx_users_window ON users (delivery_window)
  WHERE wa_opt_in_at IS NOT NULL;

-- Telefone é a chave de entrada do WhatsApp; já é UNIQUE, mas o lookup
-- acontece a cada mensagem recebida.
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_e164);
