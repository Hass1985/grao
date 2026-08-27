-- Banco de sementes do Grão — curadoria inicial do Trial.
-- 2 sementes por família emocional (20 no total), com TIPOS variados por família
-- para o seletor casar formato com o canal sensorial (visual→reflexão,
-- auditivo→oração, sinestésico→prática).
--
-- MÚSICAS: apenas faixas REAIS e verificadas (link de faixa exata no Spotify).
-- Pool verificado: Deus Proverá (Gabriela Gomes) · Lugar Secreto (Gabriela Rocha) ·
-- Quão Grande é o Meu Deus (Soraya Moraes) · Deus Cuida de Mim (Kleber Lucas) ·
-- Príncipe da Paz (Diante do Trono) · Oceanos (Hillsong UNITED) ·
-- Nada Além do Sangue (Fernandinho).
-- Ao ampliar o banco, TODA música nova precisa ser verificada antes de entrar.

INSERT INTO seeds (id, family, type, passage, reference, reflection, prayer, practice, music_title, music_artist, music_spotify, music_youtube) VALUES

-- ESPERANÇA -----------------------------------------------------------------
('s-esperanca-1','esperança','reflexão','"Porque eu sei os planos que tenho para vocês", diz o Senhor, "planos de dar a vocês esperança e um futuro."','Jeremias 29:11','Mesmo quando o presente parece incerto, existe um projeto maior traçado com cuidado para a sua vida.','Senhor, ajuda-me a descansar nos teus planos quando os meus não fazem sentido.','Escreva uma coisa boa que aconteceu hoje, por menor que seja.','Deus Proverá','Gabriela Gomes','https://open.spotify.com/track/2zouxoanOhjJi3HB8mBr9F','https://www.youtube.com/results?search_query=Gabriela+Gomes+Deus+Prover%C3%A1'),
('s-esperanca-2','esperança','oração','As misericórdias do Senhor se renovam a cada manhã; grande é a sua fidelidade.','Lamentações 3:22-23','Cada amanhecer é um recomeço assinado por Deus. O que ficou pesado ontem não precisa ditar o hoje.','Pai, obrigado porque hoje é novo. Renova em mim a esperança que o cansaço tentou apagar.','Ao acordar amanhã, antes de pegar o celular, diga em voz baixa: "Hoje é novo, e Deus é fiel."','Oceanos (Onde Meus Pés Podem Falhar)','Hillsong UNITED','https://open.spotify.com/track/49TMWB2yqSHcm7aomyeR7G','https://www.youtube.com/results?search_query=Hillsong+Oceanos'),

-- ANSIEDADE -----------------------------------------------------------------
('s-ansiedade-1','ansiedade','oração','Não andeis ansiosos por coisa alguma; antes em tudo fazei os vossos pedidos a Deus.','Filipenses 4:6','A ansiedade nos faz carregar o amanhã antes da hora. A oração devolve o peso.','Pai, entrego cada pensamento que me oprime. Que minha mente encontre repouso.','Respire fundo três vezes e repita: "Eu entrego."','Lugar Secreto','Gabriela Rocha','https://open.spotify.com/track/19KSVYPZSOZtvhYx8aVCvb','https://www.youtube.com/results?search_query=Gabriela+Rocha+Lugar+Secreto'),
('s-ansiedade-2','ansiedade','prática','Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.','1 Pedro 5:7','Deus não pediu que você desse conta de tudo. Pediu que entregasse. O cuidado é dele; o descanso é seu.','Senhor, eu solto o que estava apertando nas minhas mãos. Cuida do que eu não alcanço.','Anote em um papel a preocupação que mais pesa agora. Dobre o papel e guarde: gesto de quem entregou.','Príncipe da Paz','Diante do Trono','https://open.spotify.com/track/1sBvuSkhAnfppzUBpvIKi3','https://www.youtube.com/results?search_query=Diante+do+Trono+Pr%C3%ADncipe+da+Paz'),

-- GRATIDÃO ------------------------------------------------------------------
('s-gratidao-1','gratidão','prática','Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus.','1 Tessalonicenses 5:18','A gratidão não nega a dor — encontra luz dentro dela.','Senhor, abre meus olhos para as bênçãos que já estão aqui.','Liste três coisas pequenas pelas quais você é grato hoje.','Quão Grande é o Meu Deus','Soraya Moraes','https://open.spotify.com/track/7DhiPsmpu4kzIQyCtvWqzd','https://www.youtube.com/results?search_query=Soraya+Moraes+Qu%C3%A3o+Grande+%C3%A9+o+Meu+Deus'),
('s-gratidao-2','gratidão','reflexão','Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum dos seus benefícios.','Salmos 103:2','A memória é curta para a bênção e longa para a falta. Lembrar do que Deus já fez muda o jeito de ver o que falta.','Pai, me lembra do caminho que já andamos juntos. Eu esqueço, tu não.','Lembre de uma oração antiga que já foi respondida. Agradeça por ela como se fosse hoje.','Deus Proverá','Gabriela Gomes','https://open.spotify.com/track/2zouxoanOhjJi3HB8mBr9F','https://www.youtube.com/results?search_query=Gabriela+Gomes+Deus+Prover%C3%A1'),

-- PAZ -----------------------------------------------------------------------
('s-paz-1','paz','oração','E a paz de Deus, que excede todo o entendimento, guardará os vossos corações.','Filipenses 4:7','A paz verdadeira não vem da ausência de problemas, mas de uma presença maior.','Senhor, que tua paz guarde meu coração hoje.','Antes de dormir, mãos no peito, respire e repita: "Paz, eu recebo."','Príncipe da Paz','Diante do Trono','https://open.spotify.com/track/1sBvuSkhAnfppzUBpvIKi3','https://www.youtube.com/results?search_query=Diante+do+Trono+Pr%C3%ADncipe+da+Paz'),
('s-paz-2','paz','prática','Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá.','João 14:27','A paz do mundo depende das circunstâncias. A paz de Cristo mora mais fundo do que elas alcançam.','Jesus, recebo a paz que tu dás — a que o mundo não dá e não tira.','Separe cinco minutos sem tela hoje. Só silêncio, e a lembrança de que Ele está perto.','Lugar Secreto','Gabriela Rocha','https://open.spotify.com/track/19KSVYPZSOZtvhYx8aVCvb','https://www.youtube.com/results?search_query=Gabriela+Rocha+Lugar+Secreto'),

-- PROPÓSITO -----------------------------------------------------------------
('s-proposito-1','propósito','prática','Pois somos criação de Deus, criados em Cristo Jesus para fazer boas obras.','Efésios 2:10','Você não é um acidente. Cada dom e cada dor foi tecido com intenção.','Deus, mostra-me hoje uma boa obra que só eu posso fazer.','Faça algo pequeno e bom por alguém, sem esperar reconhecimento.','Oceanos (Onde Meus Pés Podem Falhar)','Hillsong UNITED','https://open.spotify.com/track/49TMWB2yqSHcm7aomyeR7G','https://www.youtube.com/results?search_query=Hillsong+Oceanos'),
('s-proposito-2','propósito','reflexão','O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.','Provérbios 16:9','Planejar é humano; dirigir é de Deus. O desvio que frustrou seu plano pode ser o caminho que ele preparou.','Senhor, dirige os meus passos — inclusive os que eu não entendo.','Olhe para uma porta que se fechou este ano. Pergunte a Deus, com sinceridade: o que o Senhor abriu no lugar?','Quão Grande é o Meu Deus','Soraya Moraes','https://open.spotify.com/track/7DhiPsmpu4kzIQyCtvWqzd','https://www.youtube.com/results?search_query=Soraya+Moraes+Qu%C3%A3o+Grande+%C3%A9+o+Meu+Deus'),

-- FÉ ------------------------------------------------------------------------
('s-fe-1','fé','reflexão','A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.','Hebreus 11:1','Fé não é ausência de dúvida — é caminhar mesmo quando os olhos não alcançam o destino.','Senhor, aumenta a minha fé. Que eu confie no que ainda não vejo.','Escreva uma promessa bíblica e leia em voz alta três vezes.','Nada Além do Sangue','Fernandinho','https://open.spotify.com/track/2mI6Oxf5FhUlSoDT67SeZM','https://www.youtube.com/results?search_query=Fernandinho+Nada+Al%C3%A9m+do+Sangue'),
('s-fe-2','fé','prática','Eu creio! Ajuda-me na minha falta de fé.','Marcos 9:24','A fé sincera cabe junto com a dúvida sincera. Deus não rejeita quem chega dizendo "me ajuda a crer".','Senhor, eu creio — e onde a minha fé falha, socorre-me tu.','Dê hoje um passo pequeno que você adiaria por medo. Fé também se exercita com os pés.','Oceanos (Onde Meus Pés Podem Falhar)','Hillsong UNITED','https://open.spotify.com/track/49TMWB2yqSHcm7aomyeR7G','https://www.youtube.com/results?search_query=Hillsong+Oceanos'),

-- SOLIDÃO -------------------------------------------------------------------
('s-solidao-1','solidão','reflexão','Mesmo que eu ande pelo vale da sombra da morte, não temerei, pois tu estás comigo.','Salmos 23:4','A solidão dói porque fomos feitos para comunhão. Mas há uma presença que não abandona.','Deus, faz-te real para mim neste silêncio.','Sente-se em silêncio por cinco minutos e apenas perceba que não está só.','Deus Cuida de Mim','Kleber Lucas','https://open.spotify.com/track/449TmbIw140iAdtYpUWB4h','https://www.youtube.com/results?search_query=Kleber+Lucas+Deus+Cuida+de+Mim'),
('s-solidao-2','solidão','oração','Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.','Isaías 41:10','Antes de qualquer pessoa chegar, Deus já estava. A companhia dele não depende de sala cheia.','Pai, nesta solidão, sê tu a minha companhia. Fala comigo no silêncio.','Mande uma mensagem para alguém da sua igreja que você não vê há tempo. Comunhão começa com um passo.','Lugar Secreto','Gabriela Rocha','https://open.spotify.com/track/19KSVYPZSOZtvhYx8aVCvb','https://www.youtube.com/results?search_query=Gabriela+Rocha+Lugar+Secreto'),

-- LUTO ----------------------------------------------------------------------
('s-luto-1','luto','oração','Bem-aventurados os que choram, porque serão consolados.','Mateus 5:4','A dor da perda é grande porque o amor foi grande. Deus se aproxima dos quebrantados.','Senhor, chega perto de mim na minha dor. Sê o meu consolo.','Acenda uma vela e converse com Deus sobre quem você sente falta.','Deus Cuida de Mim','Kleber Lucas','https://open.spotify.com/track/449TmbIw140iAdtYpUWB4h','https://www.youtube.com/results?search_query=Kleber+Lucas+Deus+Cuida+de+Mim'),
('s-luto-2','luto','reflexão','Perto está o Senhor dos que têm o coração quebrantado.','Salmos 34:18','O luto não é falta de fé — é amor procurando lugar. E é justamente no coração partido que Deus chega mais perto.','Pai, eu não peço pressa para a minha dor. Peço a tua presença dentro dela.','Guarde hoje uma lembrança boa de quem partiu: escreva, ou conte a alguém. Memória também é gratidão.','Príncipe da Paz','Diante do Trono','https://open.spotify.com/track/1sBvuSkhAnfppzUBpvIKi3','https://www.youtube.com/results?search_query=Diante+do+Trono+Pr%C3%ADncipe+da+Paz'),

-- CULPA ---------------------------------------------------------------------
('s-culpa-1','culpa','oração','Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar.','1 João 1:9','A culpa aponta para casa. O perdão de Deus é maior que o seu maior erro.','Pai, eu me abro diante de ti. Recebe-me de volta.','Escreva o que pesa, e depois risque — como quem entrega e recomeça.','Nada Além do Sangue','Fernandinho','https://open.spotify.com/track/2mI6Oxf5FhUlSoDT67SeZM','https://www.youtube.com/results?search_query=Fernandinho+Nada+Al%C3%A9m+do+Sangue'),
('s-culpa-2','culpa','prática','Quanto dista o Oriente do Ocidente, assim afasta de nós as nossas transgressões.','Salmos 103:12','O que Deus perdoou, ele não fica relembrando. Quem fica é o acusador — e ele não tem a última palavra.','Senhor, ajuda-me a soltar o que tu já soltaste. Que eu não carregue o que a cruz já pagou.','Se houver alguém a quem você deve um pedido de perdão, dê o primeiro passo hoje — uma mensagem basta.','Deus Cuida de Mim','Kleber Lucas','https://open.spotify.com/track/449TmbIw140iAdtYpUWB4h','https://www.youtube.com/results?search_query=Kleber+Lucas+Deus+Cuida+de+Mim'),

-- ALEGRIA -------------------------------------------------------------------
('s-alegria-1','alegria','prática','A alegria do Senhor é a vossa força.','Neemias 8:10','A alegria da fé não depende das circunstâncias — brota da presença de Deus.','Senhor, que a tua alegria seja a minha força hoje.','Mande uma mensagem alegre para alguém, sem motivo.','Quão Grande é o Meu Deus','Soraya Moraes','https://open.spotify.com/track/7DhiPsmpu4kzIQyCtvWqzd','https://www.youtube.com/results?search_query=Soraya+Moraes+Qu%C3%A3o+Grande+%C3%A9+o+Meu+Deus'),
('s-alegria-2','alegria','reflexão','Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.','Salmos 118:24','A alegria não espera o dia perfeito. Ela decide celebrar o dia que existe, porque quem o fez está presente.','Pai, obrigado por este dia — do jeito que ele é. Ensina-me a celebrar contigo.','Compartilhe hoje com alguém uma boa notícia sua, mesmo pequena. Alegria dividida cresce.','Deus Proverá','Gabriela Gomes','https://open.spotify.com/track/2zouxoanOhjJi3HB8mBr9F','https://www.youtube.com/results?search_query=Gabriela+Gomes+Deus+Prover%C3%A1')

ON CONFLICT (id) DO UPDATE SET
  family = EXCLUDED.family,
  type = EXCLUDED.type,
  passage = EXCLUDED.passage,
  reference = EXCLUDED.reference,
  reflection = EXCLUDED.reflection,
  prayer = EXCLUDED.prayer,
  practice = EXCLUDED.practice,
  music_title = EXCLUDED.music_title,
  music_artist = EXCLUDED.music_artist,
  music_spotify = EXCLUDED.music_spotify,
  music_youtube = EXCLUDED.music_youtube;
