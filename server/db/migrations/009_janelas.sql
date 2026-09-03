-- Janelas de entrega contíguas, cobrindo das 6h às 22h.
--
-- As faixas antigas (dawn 6-8, morning 8-10, noon 12-13, evening 20-22)
-- deixavam 6 horas do dia sem nenhuma janela. Quem ligava o WhatsApp às 13h40
-- escolhia "Meio-dia", cujo disparo tinha passado às 12h, e não recebia nada.
--
--   dawn      6h - 10h   (absorve a antiga morning, 8h-10h)
--   noon     10h - 14h
--   afternoon 14h - 18h  (nova)
--   evening  18h - 22h
--
-- "morning" deixa de existir: quem estava nela cai em "dawn", que agora cobre
-- o mesmo horário que a pessoa tinha escolhido.
UPDATE users SET delivery_window = 'dawn' WHERE delivery_window = 'morning';

-- Quem ligou o WhatsApp mas nunca gravou a janela ficava fora de todo disparo,
-- porque o cron filtra por delivery_window. Sem padrão, esse usuário some.
UPDATE users SET delivery_window = 'dawn'
 WHERE wa_opt_in_at IS NOT NULL AND delivery_window IS NULL;

-- Barreira contra valor inválido chegar por um cliente desatualizado: um
-- delivery_window que não é janela nenhuma não dá erro, só silencia a pessoa.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_delivery_window_check;
ALTER TABLE users ADD CONSTRAINT users_delivery_window_check
  CHECK (delivery_window IS NULL
         OR delivery_window IN ('dawn', 'noon', 'afternoon', 'evening'));
