import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChevronRight, Search } from '../components/icons';
import OuvirTexto from '../components/OuvirTexto';
import ProfileButton from '../components/ProfileButton';
import HeaderCampoFundo from '../components/ui/HeaderCampoFundo';
import HeaderGamificacao from '../components/ui/HeaderGamificacao';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import {
  livrosDaBiblia, capituloDaBiblia, buscarNaBiblia,
  type LivroBiblia, type CapituloBiblia, type AchadoBiblia,
} from '../onboarding/biblia';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { space } from '../theme/spacing';
import { shadows } from '../theme/shadows';
/**
 * A Bíblia para consulta, em três degraus.
 *
 * Testamento, livro, capítulo — e o capítulo aberto. Antes o primeiro degrau
 * não existia: a tela abria com os 66 livros numa lista corrida, dois títulos
 * de seção perdidos no meio de uma rolagem longa. Procurar Tiago significava
 * passar por todo o Antigo Testamento, e num celular isso é meia dúzia de
 * arrastadas antes de a busca sequer começar. Dois botões no topo cortam a
 * lista pela metade com um toque.
 *
 * Tudo continua numa tela só, sem empilhar navegação: quem procura um
 * versículo quer chegar e voltar rápido, e cada empilhamento é um toque a mais
 * na saída.
 *
 * O texto vem do servidor a cada capítulo. São ~4 MB de Bíblia: embutir no app
 * pesaria o download inicial de todo mundo para servir a consulta de alguns, e
 * a correção de um versículo levaria uma publicação nova para chegar.
 */
export default function Biblia({ navigation, route }: { navigation: any; route?: any }) {
  const [livros, setLivros] = useState<LivroBiblia[]>([]);
  const [aberto, setAberto] = useState<CapituloBiblia | null>(null);
  const [testamento, setTestamento] = useState<'antigo' | 'novo' | null>(null);
  const [escolhendoCapitulo, setEscolhendoCapitulo] = useState<LivroBiblia | null>(null);
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<AchadoBiblia[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    livrosDaBiblia()
      .then(setLivros)
      .finally(() => setCarregando(false));
  }, []);

  // `escolhendoCapitulo` sobrevive à abertura do capítulo de propósito: é o que
  // faz o "voltar" cair na grade de capítulos do mesmo livro, e não lá atrás na
  // lista inteira. Quem está lendo Salmos quase sempre quer o salmo seguinte.
  const abrir = useCallback(async (livro: string, capitulo: number) => {
    setCarregando(true);
    setAchados(null);
    try {
      setAberto(await capituloDaBiblia(livro, capitulo));
    } finally {
      setCarregando(false);
    }
  }, []);

  // Chegou vindo da referência de uma semente: abre direto o capítulo dela.
  //
  // A dependência é a string `pedido`, não o objeto de params: params é um
  // objeto novo a cada render, e o efeito reabriria o capítulo toda vez que a
  // tela ganhasse foco — quem tivesse navegado para outro capítulo perderia o
  // lugar sozinho.
  const pedido = route?.params?.livro
    ? `${route.params.livro}|${route.params.capitulo}`
    : null;
  useEffect(() => {
    if (!pedido) return;
    const [livro, cap] = pedido.split('|');
    void abrir(livro, Number(cap));
  }, [pedido, abrir]);

  const procurar = useCallback(async () => {
    const termo = busca.trim();
    if (termo.length < 3) return;
    setCarregando(true);
    setAberto(null);
    setEscolhendoCapitulo(null);
    try {
      setAchados(await buscarNaBiblia(termo));
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  // Um degrau por vez, de volta pelo mesmo caminho da ida.
  const voltar = () => {
    if (aberto) return setAberto(null);
    if (escolhendoCapitulo) return setEscolhendoCapitulo(null);
    if (testamento) return setTestamento(null);
    if (achados) { setAchados(null); setBusca(''); }
  };

  const antigo = livros.filter((l) => l.antigo);
  const novo = livros.filter((l) => !l.antigo);
  const daLista = testamento === 'antigo' ? antigo : novo;
  const nomeDoTestamento = (velho: boolean) =>
    velho ? 'Antigo Testamento' : 'Novo Testamento';

  const emAlgumLugar = !!aberto || !!escolhendoCapitulo || !!achados || !!testamento;

  /** Para onde o "voltar" leva. Dizer o destino poupa um toque às cegas. */
  const destinoDoVoltar = aberto
    ? (escolhendoCapitulo ? `Capítulos de ${escolhendoCapitulo.nome}` : 'Todos os livros')
    : escolhendoCapitulo
      ? nomeDoTestamento(escolhendoCapitulo.antigo)
      : testamento
        ? 'Antigo e Novo'
        : 'Limpar busca';

  const tituloTopo = aberto
    ? `${aberto.livro} ${aberto.capitulo}`
    : escolhendoCapitulo
      ? escolhendoCapitulo.nome
      : testamento
        ? nomeDoTestamento(testamento === 'antigo')
        : achados
          ? `${achados.length} ${achados.length === 1 ? 'passagem' : 'passagens'}`
          : 'Bíblia';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <HeaderCampoFundo>
          <View style={styles.headerTop}>
            <ProfileButton onPress={() => navigation.navigate('Settings')} size={36} />
            <Text style={styles.headerTitulo} numberOfLines={1}>{tituloTopo}</Text>
            <HeaderGamificacao navigation={navigation} />
          </View>
          {!emAlgumLugar ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Seu progresso na Bíblia</Text>
                <Text style={styles.progressPct}>0%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '0%' }]} />
              </View>
            </View>
          ) : null}
      </HeaderCampoFundo>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!emAlgumLugar ? (
            <Text style={styles.heroTitle}>Bíblia</Text>
          ) : null}

          {emAlgumLugar ? (
            <Pressable onPress={voltar} style={styles.voltar} hitSlop={8}>
              <ChevronLeft size={16} color={colors.earth} strokeWidth={2.2} />
              <Text style={styles.voltarTexto}>{destinoDoVoltar}</Text>
            </Pressable>
          ) : (
            <View style={styles.buscaLinha}>
              <Search size={16} color={colors.mist} strokeWidth={2} />
              <TextInput
                style={styles.buscaCampo}
                placeholder="Procurar uma palavra"
                placeholderTextColor={colors.mist}
                value={busca}
                onChangeText={setBusca}
                onSubmitEditing={procurar}
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>
          )}

          {carregando ? (
            <ActivityIndicator color={colors.earth} style={styles.carregando} />
          ) : aberto ? (
            <View style={styles.capitulo}>
              {/* Sem os números: lido cru, sairia "um O Senhor é meu pastor,
                  dois Ele me faz deitar". Cada versículo vira um trecho, e a
                  pausa entre eles é o que dá respiração à leitura. */}
              <OuvirTexto
                trechos={[
                  `${aberto.livro}, capítulo ${aberto.capitulo}.`,
                  ...aberto.versiculos.map((v) => v.texto),
                ]}
                rotulo="Ouvir o capítulo"
                velocidade={0.92}
                style={styles.ouvir}
              />

              {aberto.versiculos.map((v) => (
                <Text key={v.numero} style={styles.versiculo}>
                  <Text style={styles.numero}>{v.numero} </Text>
                  {v.texto}
                </Text>
              ))}

              <View style={styles.navegacao}>
                <Pressable
                  onPress={() => abrir(aberto.livro, aberto.capitulo - 1)}
                  disabled={aberto.capitulo <= 1}
                  style={[styles.navBtn, aberto.capitulo <= 1 && styles.navBtnOff]}
                  hitSlop={6}
                >
                  <ChevronLeft size={16} color={colors.earth} strokeWidth={2.2} />
                  <Text style={styles.navTexto}>Anterior</Text>
                </Pressable>
                <Text style={styles.navPosicao}>
                  {aberto.capitulo} de {aberto.capitulos}
                </Text>
                <Pressable
                  onPress={() => abrir(aberto.livro, aberto.capitulo + 1)}
                  disabled={aberto.capitulo >= aberto.capitulos}
                  style={[styles.navBtn, aberto.capitulo >= aberto.capitulos && styles.navBtnOff]}
                  hitSlop={6}
                >
                  <Text style={styles.navTexto}>Próximo</Text>
                  <ChevronRight size={16} color={colors.earth} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
          ) : escolhendoCapitulo ? (
            <View style={styles.grade}>
              {Array.from({ length: escolhendoCapitulo.capitulos }, (_, i) => i + 1).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => abrir(escolhendoCapitulo.nome, c)}
                  style={styles.capBotao}
                >
                  <Text style={styles.capNumero}>{c}</Text>
                </Pressable>
              ))}
            </View>
          ) : achados ? (
            achados.length === 0 ? (
              <Text style={styles.vazio}>
                Nada encontrado para “{busca.trim()}”. Tente outra palavra.
              </Text>
            ) : (
              <View style={styles.lista}>
                {achados.map((a, i) => (
                  <Pressable
                    key={`${a.livro}-${a.capitulo}-${a.versiculo}-${i}`}
                    onPress={() => abrir(a.livro, a.capitulo)}
                    style={styles.achado}
                  >
                    <Text style={styles.achadoRef}>
                      {a.livro} {a.capitulo}:{a.versiculo}
                    </Text>
                    <Text style={styles.achadoTexto} numberOfLines={3}>{a.texto}</Text>
                  </Pressable>
                ))}
              </View>
            )
          ) : testamento ? (
            /* Segundo degrau: os livros do testamento escolhido, em botões do
               mesmo feitio da grade de capítulos. */
            <View style={styles.grade}>
              {daLista.map((l) => (
                <Pressable
                  key={l.numero}
                  onPress={() => setEscolhendoCapitulo(l)}
                  style={styles.livroBotao}
                  accessibilityRole="button"
                  accessibilityLabel={`${l.nome}, ${l.capitulos} capítulos`}
                >
                  <Text style={styles.livroBotaoNome}>{l.nome}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.segmento}>
                <Pressable
                  onPress={() => setTestamento('antigo')}
                  style={[styles.segmentoBtn, styles.segmentoAtivo]}
                  accessibilityRole="button"
                >
                  <Text style={styles.segmentoTextoAtivo}>Antigo Testamento</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTestamento('novo')}
                  style={styles.segmentoBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.segmentoTexto}>Novo Testamento</Text>
                </Pressable>
              </View>

              <View style={styles.listaLivros}>
                {antigo.slice(0, 8).map((l) => (
                  <Pressable
                    key={l.numero}
                    onPress={() => {
                      setTestamento('antigo');
                      setEscolhendoCapitulo(l);
                    }}
                    style={styles.livroCard}
                  >
                    <Text style={styles.livroCardNome}>{l.nome}</Text>
                    <Text style={styles.livroCardMeta}>{l.capitulos} cap.</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setTestamento('antigo')}
                  style={styles.verTodos}
                >
                  <Text style={styles.verTodosTexto}>Ver todos os livros</Text>
                </Pressable>
              </View>

              <Text style={styles.creditos}>
                Bíblia Livre, tradução de domínio público, livre para ler e compartilhar.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241708' },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginTop: 10,
    marginBottom: 18,
    gap: 10,
  },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.warmWhite,
  },
  progressBlock: { gap: 8 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: 'rgba(252,250,246,0.75)',
  },
  progressPct: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    color: colors.warmWhite,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(252,250,246,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warmWhite,
  },
  sheet: {
    flex: 1,
    marginTop: -16,
    backgroundColor: colors.warmWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 22,
  },
  heroTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.earth,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  carregando: { marginTop: 40 },

  buscaLinha: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warmWhite,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...(shadows.sm as object),
  },
  buscaCampo: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.earth,
  },
  segmento: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: 16,
  },
  segmentoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentoAtivo: {
    backgroundColor: colors.warmWhite,
  },
  segmentoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.mist,
    textTransform: 'uppercase',
  },
  segmentoTextoAtivo: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.earth,
    textTransform: 'uppercase',
  },
  listaLivros: { gap: 10, marginBottom: 16 },
  livroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warmWhite,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...(shadows.sm as object),
  },
  livroCardNome: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.earth,
  },
  livroCardMeta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mist,
  },
  verTodos: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  verTodosTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.earth,
  },

  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 2,
  },
  voltarTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.earth,
  },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  /* O nome manda na largura; a altura é a mesma da grade de capítulos, para os
     dois degraus parecerem o mesmo gesto. */
  livroBotao: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmWhite,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  livroBotaoNome: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.sm,
    color: colors.earth,
  },
  capBotao: {
    width: 52,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmWhite,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  capNumero: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.base,
    color: colors.earth,
    fontVariant: ['tabular-nums'],
  },

  capitulo: { marginTop: 4 },
  ouvir: { marginBottom: 20 },
  versiculo: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 30,
    color: colors.earth,
    marginBottom: 14,
  },
  numero: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.earth,
  },

  navegacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.sand,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.warmWhite,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  navBtnOff: { opacity: 0.3 },
  navTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.earth,
  },
  navPosicao: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.mist,
    fontVariant: ['tabular-nums'],
  },

  lista: { gap: 2, marginTop: 4 },
  achado: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  achadoRef: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.xs,
    color: colors.earth,
    marginBottom: 5,
  },
  achadoTexto: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.earth,
  },

  vazio: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 25,
    color: colors.mist,
    marginTop: 24,
  },
  creditos: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    lineHeight: 19,
    color: colors.mist,
    marginTop: 28,
    textAlign: 'center',
  },
});
