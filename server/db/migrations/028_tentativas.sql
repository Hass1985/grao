-- Quantas vezes já tentamos mandar esta entrega pelo WhatsApp.
--
-- O QUE ISTO PARA
--
-- Em 24 horas, uma pessoa só acumulou 192 falhas de envio e 193 chamadas de
-- curadoria. Uma chamada de IA por minuto, durante toda a janela de tolerância,
-- todo dia — dinheiro real queimado para não entregar nada.
--
-- O laço era este: a Meta recusava o envio (erro 131049, limite de mensagens
-- de marketing por pessoa); o código desfazia a entrega para "não gastar uma
-- das 380 sementes"; um minuto depois a varredura não encontrava semente do
-- dia, escolhia outra do zero — curadoria inteira, chamada paga — e tentava de
-- novo. A intenção de não desperdiçar semente desperdiçava a escolha dela.
--
-- Agora a entrega fica, com a contagem de tentativas. A varredura reusa a
-- semente já escolhida em vez de pensar de novo, e desiste depois de algumas
-- tentativas em vez de insistir por horas contra um limite que só piora
-- quando se insiste.
ALTER TABLE seed_deliveries
  ADD COLUMN IF NOT EXISTS wa_tentativas INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN seed_deliveries.wa_tentativas IS
  'Envios tentados pelo WhatsApp. A agenda para de tentar ao chegar no teto (ver agenda.ts).';
