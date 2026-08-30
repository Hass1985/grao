-- Marca quando cada rascunho foi auditado. Sem isso não há como distinguir
-- "aprovado pela auditoria" de "nunca auditado": ambos ficam com review_note
-- NULL — e um rascunho não auditado viraria aprovação silenciosa.
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ;
