-- Horário exato escolhido pela pessoa, no lugar das quatro janelas.
--
-- As janelas de 4 horas resolviam o buraco da agenda, mas não a promessa: a
-- pessoa escolhia "Tarde" e recebia às 15h, mesmo que a rotina dela abrisse às
-- 16h30. E o horário importa mais aqui do que num app comum — a semente chega
-- com um botão "Plantar", e só quem está disponível na hora toca nele. Errar o
-- horário não atrasa a leitura: cancela o gesto.
--
-- delivery_time é hora LOCAL, lida sempre junto com users.timezone. Guardar em
-- UTC pareceria mais correto e seria pior: quem escolhe 7h quer 7h da manhã
-- dela, inclusive se mudar de fuso ou se o horário de verão voltar.
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_time TIME;

-- Cada janela vira o horário em que ela de fato disparava, não o começo da
-- faixa: quem escolheu "Amanhecer" vinha recebendo 7h, e mudar isso agora
-- seria trocar o horário de alguém sem avisar.
UPDATE users SET delivery_time = CASE delivery_window
    WHEN 'dawn'      THEN TIME '07:00'
    WHEN 'morning'   THEN TIME '07:00'   -- janela antiga, ver 009_janelas.sql
    WHEN 'noon'      THEN TIME '11:00'
    WHEN 'afternoon' THEN TIME '15:00'
    WHEN 'evening'   THEN TIME '19:00'
    ELSE TIME '07:00'
  END
 WHERE delivery_time IS NULL;

ALTER TABLE users ALTER COLUMN delivery_time SET DEFAULT TIME '07:00';
ALTER TABLE users ALTER COLUMN delivery_time SET NOT NULL;

-- A varredura roda de minuto em minuto e filtra por opt-in; sem índice isso é
-- uma leitura da tabela inteira 1.440 vezes por dia.
CREATE INDEX IF NOT EXISTS idx_users_delivery_time ON users (delivery_time)
  WHERE wa_opt_in_at IS NOT NULL;

-- delivery_window deixa de ser lido pela entrega. Fica só como registro do que
-- a pessoa havia escolhido antes, e porque o webapp publicado ainda manda esse
-- campo — o backend traduz para horário na entrada.
COMMENT ON COLUMN users.delivery_window IS
  'Legado das janelas de 4h. Não é mais usado na entrega — ver delivery_time.';
