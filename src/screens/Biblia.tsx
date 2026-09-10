import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChevronRight } from '../components/icons';
import OuvirTexto from '../components/OuvirTexto';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import {
  livrosDaBiblia, capituloDaBiblia, buscarNaBiblia,
  type LivroBiblia, type CapituloBiblia, type AchadoBiblia,
} from '../onboarding/biblia';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';

/**
 * A Bíblia para consulta.
 *
 * Três estados na mesma tela — lista de livros, capítulo aberto, resultado de
 * busca — em vez de três telas empilhadas. Quem procura um versículo quer
 * chegar e voltar rápido; cada empilhamento a mais é um toque a mais na saída.
 *
 * O texto vem do servidor a cada capítulo. São ~4 MB de Bíblia: embutir no app
 * pesaria o download inicial de todo mundo para servir a consulta de alguns, e
 * a correção de um versículo levaria uma publicação nova para chegar.
 */
export default function Biblia({ navigation }: { navigation: any }) {
  const [livros, setLivros] = useState<LivroBiblia[]>([]);
  const [aberto, setAberto] = useState<CapituloBiblia | null>(null);
  const [escolhendoCapitulo, setEscolhendoCapitulo] = useState<LivroBiblia | null>(null);
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<AchadoBiblia[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    livrosDaBiblia()
      .then(setLivros)
      .finally(() => setCarregando(false));
  }, []);

  const abrir = useCallback(async (livro: string, capitulo: number) => {
    setCarregando(true);
    setEscolhendoCapitulo(null);
    setAchados(null);
    try {
      setAberto(await capituloDaBiblia(livro, capitulo));
    } finally {
      setCarregando(false);
    }
  }, []);

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

  const voltar = () => {
    if (aberto) return setAberto(null);
    if (escolhendoCapitulo) return setEscolhendoCapitulo(null);
    if (achados) { setAchados(null); setBusca(''); }
  };

  const emAlgumLugar = !!aberto || !!escolhendoCapitulo || !!achados;
  const antigo = livros.filter((l) => l.antigo);
  const novo = livros.filter((l) => !l.antigo);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeader
            title="Bíblia"
            subtitle={
              aberto ? `${aberto.livro} ${aberto.capitulo}`
                : escolhendoCapitulo ? escolhendoCapitulo.nome
                : achados ? `${achados.length} ${achados.length === 1 ? 'passagem' : 'passagens'}`
                : 'Consulte quando precisar.'
            }
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          {emAlgumLugar ? (
            <Pressable onPress={voltar} style={styles.voltar} hitSlop={8}>
              <ChevronLeft size={16} color={colors.ambarSoft} strokeWidth={2.2} />
              <Text style={styles.voltarTexto}>
                {aberto || escolhendoCapitulo ? 'Todos os livros' : 'Limpar busca'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.buscaLinha}>
              <TextInput
                style={styles.buscaCampo}
                placeholder="Procurar uma palavra"
                placeholderTextColor={colors.foregroundSubtle}
                value={busca}
                onChangeText={setBusca}
                onSubmitEditing={procurar}
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>
          )}

          {carregando ? (
            <ActivityIndicator color={colors.accent} style={styles.carregando} />
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
                  <ChevronLeft size={16} color={colors.palha} strokeWidth={2.2} />
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
                  <ChevronRight size={16} color={colors.palha} strokeWidth={2.2} />
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
          ) : (
            <>
              <Text style={styles.secao}>Antigo Testamento</Text>
              <View style={styles.livros}>
                {antigo.map((l) => (
                  <Pressable key={l.numero} onPress={() => setEscolhendoCapitulo(l)} style={styles.livro}>
                    <Text style={styles.livroNome}>{l.nome}</Text>
                    <Text style={styles.livroCaps}>{l.capitulos}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.secao}>Novo Testamento</Text>
              <View style={styles.livros}>
                {novo.map((l) => (
                  <Pressable key={l.numero} onPress={() => setEscolhendoCapitulo(l)} style={styles.livro}>
                    <Text style={styles.livroNome}>{l.nome}</Text>
                    <Text style={styles.livroCaps}>{l.capitulos}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.creditos}>
                Bíblia Livre — tradução de domínio público, livre para ler e compartilhar.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter },
  carregando: { marginTop: 40 },

  buscaLinha: { marginTop: 6, marginBottom: 18 },
  buscaCampo: {
    ...glassCard,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.palha,
  },

  voltar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, marginTop: 2,
  },
  voltarTexto: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.ambarSoft,
  },

  secao: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.3,
    textTransform: 'uppercase', color: colors.foregroundSubtle,
    marginTop: 22, marginBottom: 12,
  },
  livros: { gap: 2 },
  livro: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.hairline,
  },
  livroNome: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.palha },
  livroCaps: {
    fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.foregroundSubtle,
    fontVariant: ['tabular-nums'],
  },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  capBotao: {
    width: 52, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  capNumero: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.palha,
    fontVariant: ['tabular-nums'],
  },

  capitulo: { marginTop: 4 },
  ouvir: { marginBottom: 20 },
  versiculo: {
    fontFamily: fonts.serif, fontSize: 18, lineHeight: 30,
    color: colors.palha, marginBottom: 14,
  },
  numero: {
    fontFamily: fonts.sansSemi, fontSize: 12, color: colors.ambarSoft,
  },

  navegacao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.hairline,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: radius.pill, backgroundColor: colors.surfaceSoft,
  },
  navBtnOff: { opacity: 0.3 },
  navTexto: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.palha },
  navPosicao: {
    fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.foregroundSubtle,
    fontVariant: ['tabular-nums'],
  },

  lista: { gap: 2, marginTop: 4 },
  achado: {
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.hairline,
  },
  achadoRef: {
    fontFamily: fonts.sansSemi, fontSize: fontSizes.xs, color: colors.ambarSoft,
    marginBottom: 5,
  },
  achadoTexto: {
    fontFamily: fonts.serif, fontSize: fontSizes.base, lineHeight: 24,
    color: colors.foregroundMuted,
  },

  vazio: {
    fontFamily: fonts.sans, fontSize: fontSizes.base, lineHeight: 25,
    color: colors.foregroundMuted, marginTop: 24,
  },
  creditos: {
    fontFamily: fonts.sans, fontSize: fontSizes.xs, lineHeight: 19,
    color: colors.foregroundSubtle, marginTop: 28, textAlign: 'center',
  },
});
