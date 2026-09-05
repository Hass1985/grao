-- Cobrança de verdade: Asaas, com Pix.
--
-- A escolha do Pix é estratégica. O concorrente cobra pela loja de aplicativos
-- e fica preso ao cartão; parte relevante do público evangélico brasileiro não
-- tem cartão ou tem limite apertado. Pix abre uma faixa de mercado que o líder
-- não consegue cobrar.
--
-- E as colunas de aviso existem por causa da reclamação NÚMERO UM contra o
-- concorrente: cobrança sem aviso claro. Gente cobrada sem perceber o fim do
-- teste, gente que queria o mensal e foi cobrada no anual. Aqui o aviso vai 24h
-- antes, pelo WhatsApp, com o valor e o plano escritos por extenso, e
-- `avisado_em` é o que garante que ele saiu — e que saiu uma vez só.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_charge_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS avisado_em TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelado_por TEXT;

-- A varredura do aviso roda de hora em hora e olha só quem tem cobrança
-- marcada. Sem índice, é varrer a tabela inteira 24 vezes por dia.
CREATE INDEX IF NOT EXISTS idx_subs_proxima_cobranca
  ON subscriptions (next_charge_at)
  WHERE next_charge_at IS NOT NULL AND status IN ('trial', 'ativa');

COMMENT ON COLUMN subscriptions.avisado_em IS
  'Quando saiu o aviso de 24h. NULL = ainda não avisamos desta cobrança.';
COMMENT ON COLUMN subscriptions.cancelado_por IS
  'usuario | equipe | gateway. Serve para saber se o cancelamento foi escolha.';
