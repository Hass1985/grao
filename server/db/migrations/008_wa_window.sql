-- Última mensagem RECEBIDA de cada usuário no WhatsApp.
--
-- Serve para saber se a janela de 24h está aberta. Dentro dela, texto livre é
-- GRATUITO — então quem conversou com o Grão nas últimas 24h pode receber a
-- semente inteira sem custo nenhum, sem gastar template.
--
-- Quanto mais engajada a pessoa, menos ela custa. É o incentivo certo.
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_last_inbound_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_last_inbound ON users (wa_last_inbound_at);
