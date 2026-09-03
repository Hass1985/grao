-- Assinaturas.
--
-- Hoje o app mostra os planos (Plantio R$ 19,90/mês e Anual R$ 199,00) e o
-- botão "Começar 7 dias grátis" não grava NADA: a escolha morre na tela. Sem
-- isto o painel não teria como responder "quantas pessoas escolheram qual
-- plano", que é metade do que se quer olhar num Trial.
--
-- IMPORTANTE: ainda não existe cobrança. Não há gateway ligado, nada é
-- debitado de ninguém. O que esta tabela guarda é a INTENÇÃO declarada mais o
-- período de teste. As colunas provider/provider_ref ficam nulas até um
-- Stripe/Asaas/Pagar.me entrar — e quando entrar, elas já estão no lugar, com
-- os webhooks só precisando escrever status e provider_ref.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,                    -- plantio | anual
  status        TEXT NOT NULL DEFAULT 'trial',    -- trial | ativa | cancelada | expirada
  price_cents   INT  NOT NULL,                    -- 1990 | 19900
  trial_ends_at TIMESTAMPTZ,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at   TIMESTAMPTZ,
  provider      TEXT,                             -- null enquanto não há cobrança
  provider_ref  TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subs_trial ON subscriptions (trial_ends_at)
  WHERE status = 'trial';
