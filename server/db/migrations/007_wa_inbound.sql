-- Mensagens do WhatsApp já processadas.
--
-- A Meta REENVIA o webhook quando não recebe 200 rápido o bastante — e o
-- Render, mesmo no Starter, pode demorar sob carga. Sem esta trava a pessoa
-- receberia a mesma resposta duas ou três vezes.
--
-- A chave primária é o id da mensagem na Meta: inserir com ON CONFLICT
-- DO NOTHING torna o processamento idempotente sem precisar de lock.
CREATE TABLE IF NOT EXISTS wa_inbound_seen (
  message_id TEXT PRIMARY KEY,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limpeza: a Meta não reenvia nada com mais de alguns dias.
CREATE INDEX IF NOT EXISTS idx_wa_seen_at ON wa_inbound_seen (seen_at);
