-- A foto do perfil, no cadastro em vez de no aparelho.
--
-- Ela morava só em AsyncStorage, sob `grao.avatarUri.v1`. AsyncStorage é o
-- armazenamento daquele aparelho: no iPhone, o sandbox do app; no navegador, o
-- localStorage. Dois cofres que nunca se falam. Quem punha a foto pelo celular
-- e depois entrava pelo notebook encontrava o perfil vazio, sem nada explicando
-- por quê — e a suspeita natural é que o app perdeu a foto, não que ela nunca
-- tinha saído de lá.
--
-- POR QUE AQUI E NÃO NO SUPABASE STORAGE
--
-- Storage é o lugar canônico para arquivo, e continua sendo o destino certo
-- quando isto crescer. Mas duas coisas pesaram mais agora:
--
--  1. Exclusão de conta. Acabamos de fazer o DELETE apagar tudo de uma vez, e
--     o CASCADE desta tabela já leva a foto junto. No Storage a foto seria um
--     segundo sistema para lembrar de limpar — e "lembrar de limpar" é como
--     dado pessoal sobrevive a um pedido de exclusão.
--  2. Escala real. São bytes de algumas centenas de KB por pessoa. O dia em
--     que isso incomodar é o dia de mover para o Storage, e aí a migração é
--     ler esta coluna e subir.
--
-- Os bytes CRUS, não base64: o que o app guardava era uma data URI, que é a
-- imagem inflada em um terço só para caber em texto. Aqui ela volta ao
-- tamanho natural, e a rota que serve devolve os bytes com o tipo certo.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar            BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_mime       TEXT,
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN users.avatar IS
  'Foto do perfil, bytes crus. Serve GET /profile/:userId/foto.';
COMMENT ON COLUMN users.avatar_updated_at IS
  'Carimbo da última troca. O app compara com o que tem em cache para saber se precisa baixar de novo.';
