-- Várias identidades por cadastro.
--
-- O QUE QUEBROU
--
-- `users.auth_uid` é UMA coluna: um cadastro só consegue apontar para uma
-- identidade do Supabase. Quem entra por Google num dia e por telefone no
-- outro cria duas identidades, e como só uma cabe na coluna, vira duas
-- PESSOAS diferentes no banco.
--
-- Em 23/09/2026 o Samir tinha dois cadastros vivos: 8fdc9aa9 (Google, onde o
-- aplicativo escrevia) e de2210c5 (telefone, onde o WhatsApp entregava). Ele e
-- o Lucas relataram que "o que chega no WhatsApp não é o que está no app" — e
-- não era mesmo: eram dois cadastros, cada um com a sua semente do dia. A
-- fusão por telefone existente em /auth/vincular não alcançava o caso, porque
-- ela só roda quando o TOKEN traz telefone, e o login por Google não traz.
--
-- O MODELO NOVO
--
-- A identidade deixa de ser um atributo do cadastro e passa a ser uma linha
-- própria. Um cadastro tem N identidades; cada identidade pertence a um
-- cadastro só. Entrar por qualquer uma delas chega na mesma pessoa.
--
-- `users.auth_uid` CONTINUA existindo por enquanto, espelhando a identidade
-- principal. Derrubar a coluna no mesmo passo em que se troca o modelo é como
-- trocar o pneu com o carro andando: se algo aqui estiver errado, dá para
-- voltar o código sem ter perdido dado. Ela sai numa migração posterior,
-- depois que o caminho novo tiver rodado em produção.

CREATE TABLE IF NOT EXISTS user_identities (
  -- O `sub` do token do Supabase. Chave primária porque uma identidade
  -- pertence a exatamente um cadastro — é justamente o que faltava.
  auth_uid    TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- google | apple | facebook | phone | email — o que o token declarar.
  -- Serve para o painel e para a pessoa entender de onde ela entrou.
  provedor    TEXT,
  email       TEXT,
  telefone    TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  visto_em    TIMESTAMPTZ
);

-- Todo acesso pergunta "de quem é este cadastro?" na fusão e na exclusão.
CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities (user_id);

-- Encontrar identidades pelo e-mail é o que permite ligar um login novo a um
-- cadastro que já existe, sem depender do telefone.
CREATE INDEX IF NOT EXISTS idx_user_identities_email
  ON user_identities (lower(email)) WHERE email IS NOT NULL AND email <> '';

-- Traz o que já existe. ON CONFLICT porque a migração precisa poder rodar
-- duas vezes sem estragar nada.
INSERT INTO user_identities (auth_uid, user_id, email, telefone)
SELECT u.auth_uid, u.id, nullif(u.email,''), u.phone_e164
  FROM users u
 WHERE u.auth_uid IS NOT NULL
ON CONFLICT (auth_uid) DO NOTHING;

COMMENT ON TABLE user_identities IS
  'Identidades do Supabase por cadastro. Um cadastro tem várias; entrar por qualquer uma chega na mesma pessoa. Ver 026_identidades.sql.';
