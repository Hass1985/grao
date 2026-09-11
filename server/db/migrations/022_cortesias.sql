-- Acesso completo concedido por IDENTIDADE, e não por linha de usuário.
--
-- O problema que isto resolve: quem são os donos do produto continua testando
-- o app no fluxo real, e por isso precisa de acesso pago sem pagar. Liberar na
-- mão a linha de `subscriptions` de cada um resolve por um dia e quebra no
-- seguinte — basta a pessoa entrar pelo Google onde antes entrou pelo
-- telefone, e o app cria outro cadastro, sem plano, sem oração, sem prática.
-- Passa a parecer bug do produto quando é bug do nosso controle.
--
-- Aqui a cortesia gruda no que a pessoa É (o e-mail ou o número), não no
-- cadastro que ela por acaso tinha naquele dia. Toda vez que ela vincula uma
-- conta, o servidor confere esta lista e aplica. Entrou por onde entrar, tem
-- acesso.
--
-- Fica em tabela, e não numa constante no código, por duas razões: a lista
-- muda (imprensa, convidado, pastor parceiro) e não deve exigir deploy; e os
-- e-mails pessoais de quem está na lista não precisam morar no repositório.
CREATE TABLE IF NOT EXISTS cortesias (
  identificador TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('email', 'telefone')),
  nota          TEXT,
  -- NULL = sem prazo. É o caso dos donos: um prazo aqui significaria que um
  -- dia, sem aviso, o time perde o acesso ao próprio produto.
  dias          INT,
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  aplicada_em   TIMESTAMPTZ,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE cortesias IS
  'Acesso completo por e-mail ou telefone, aplicado quando a pessoa vincula a conta.';
COMMENT ON COLUMN cortesias.dias IS
  'Duração em dias. NULL = sem prazo (donos e sócios).';
COMMENT ON COLUMN cortesias.aplicada_em IS
  'Quando bateu com um cadastro de verdade. NULL = cadastrada e ainda não usada.';
