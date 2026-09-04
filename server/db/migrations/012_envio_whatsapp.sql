-- Separa "semente do dia ESCOLHIDA" de "semente ENVIADA no WhatsApp".
--
-- O bug: abrir o app cancelava a mensagem do dia.
--
-- Quando alguém abria a tela Hoje, /seed/today escolhia a semente e gravava
-- uma linha em seed_deliveries. A agenda, mais tarde, perguntava "essa pessoa
-- já tem entrega hoje?", via que sim, e pulava — sem nunca ter mandado nada.
-- Foi exatamente o que aconteceu nos testes: o Lucas abriu o app 01h10, o
-- Samir 06h00, e os disparos das 07h30 e 07h45 acharam que já estava feito.
--
-- Quanto mais alguém usasse o app, menos mensagem receberia. O incentivo
-- estava invertido.
--
-- Uma linha em seed_deliveries passa a significar apenas "a semente do dia
-- desta pessoa é esta". sent_wa_at é o que diz se ela já saiu pelo WhatsApp.
-- Com isso, app e WhatsApp mostram a MESMA semente e nenhum dos dois cancela
-- o outro.
ALTER TABLE seed_deliveries ADD COLUMN IF NOT EXISTS sent_wa_at TIMESTAMPTZ;

-- As entregas antigas ficam com NULL. Não dá para reconstruir o passado, e
-- também não precisa: a agenda só olha a entrega de HOJE.
CREATE INDEX IF NOT EXISTS idx_deliveries_sent_wa
  ON seed_deliveries (user_id, delivered_at DESC)
  WHERE sent_wa_at IS NULL;

COMMENT ON COLUMN seed_deliveries.sent_wa_at IS
  'Quando a semente saiu pelo WhatsApp. NULL = escolhida mas ainda não enviada.';
