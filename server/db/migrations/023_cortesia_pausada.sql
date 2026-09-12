-- Pausar a cortesia sem perder o registro dela.
--
-- Quem é dono do produto tem acesso completo e, por isso, deixa de enxergar o
-- app que a maior parte das pessoas usa: o devocional gratuito, o convite do
-- Plantio, o paywall. Testar só o lado pago é testar a minoria.
--
-- Dava para resolver tirando a pessoa da lista e recolocando depois, mas aí o
-- registro (a nota, quem é, desde quando) se perde a cada ida e volta — e uma
-- lista que some é uma lista em que ninguém confia.
--
-- Pausada, a linha continua lá e simplesmente para de ser aplicada. Isso
-- importa mais do que parece: /auth/vincular reaplica a cortesia a cada login,
-- então sem esta coluna bastaria a pessoa entrar de novo para o acesso
-- completo voltar sozinho, e a pausa não pausaria nada.
ALTER TABLE cortesias ADD COLUMN IF NOT EXISTS pausada BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN cortesias.pausada IS
  'Cortesia suspensa de propósito: continua na lista e para de ser aplicada no login.';
