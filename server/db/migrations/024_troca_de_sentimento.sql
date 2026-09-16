-- O botão de troca de sentimento no WhatsApp.
--
-- O sentimento da pessoa era capturado uma vez, no cadastro, e alimentava a
-- semente todos os dias, indefinidamente. Não existia caminho para ela dizer
-- que mudou — e um produto que se apresenta como personalizado ficava preso ao
-- retrato de um dia que pode ter sido há meses.
--
-- Esta migração cria os quatro estados que o fluxo precisa. Três deles são
-- POR DIA, e é isso que sustenta a regra central: uma semente por dia, nunca
-- duas. Os dois botões do template são portas alternativas para a mesma
-- entrega única; depois que uma é usada, a outra deixa de valer naquele dia.

-- Por qual porta o dia foi fechado. NULL enquanto a semente do dia não saiu.
--
--   'plantar'  toque no botão Plantar
--   'troca'    toque em "Meu sentimento mudou", depois do relato
--   'direta'   janela de 24h aberta: a semente foi como texto livre, sem botão
--   'app'      a pessoa abriu no aplicativo
ALTER TABLE seed_deliveries ADD COLUMN IF NOT EXISTS porta TEXT;

COMMENT ON COLUMN seed_deliveries.porta IS
  'Por qual caminho a semente do dia chegou: plantar, troca, direta ou app.';

-- Quando pedimos o relato e ainda estamos esperando a resposta.
--
-- Tem hora, e não só data, porque a espera morre junto com a janela de 24h da
-- Meta: passado esse prazo, a resposta dela não pode mais ser respondida com
-- texto livre. Sem o horário, uma mensagem que chegasse 30 horas depois seria
-- tratada como relato e a semente não teria como sair.
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_relato_pedido_em TIMESTAMPTZ;

COMMENT ON COLUMN users.wa_relato_pedido_em IS
  'Quando o Grão pediu o relato pelo WhatsApp e ainda aguarda resposta. NULL = não está esperando.';

-- Em que dia a resposta automática de fora de fluxo já foi enviada.
--
-- A regra do documento: quem escreve com o dia já fechado recebe UMA resposta,
-- só na primeira mensagem do dia, e nada nas seguintes. Sem esta marca, cada
-- mensagem geraria outra resposta — e o Grão viraria aquele contato que sempre
-- responde a mesma coisa, de graça até outubro e pago depois.
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_fora_fluxo_em DATE;

COMMENT ON COLUMN users.wa_fora_fluxo_em IS
  'Dia em que a resposta automática de fora de fluxo já foi enviada, no fuso da pessoa.';
