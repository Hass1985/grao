-- Contas de verdade, com Supabase Auth.
--
-- Até aqui a identidade era um UUID aleatório guardado no navegador. Limpou o
-- cache, perdeu tudo: histórico, perfil, assinatura. E com paywall isso vira
-- buraco de negócio, porque bastava abrir uma aba anônima para ser um novo
-- gratuito.
--
-- Agora a pessoa passam a existir três chaves para a MESMA pessoa:
--   users.id         o id do aparelho, que já existia
--   users.phone_e164 o WhatsApp, que já existia
--   users.auth_uid   a conta (Google, Apple, Facebook ou e-mail/senha)
--
-- Elas convergem por fusão, e a regra é sempre a mesma: quem tem CONTA manda,
-- porque é a única chave que sobrevive à troca de aparelho.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uid TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- UNIQUE parcial: duas linhas com o mesmo auth_uid seriam a mesma pessoa
-- duplicada, e o NULL precisa continuar livre para quem ainda não tem conta.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_uid
  ON users (auth_uid) WHERE auth_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN users.auth_uid IS
  'O sub do JWT do Supabase. Chave que sobrevive à troca de aparelho.';
