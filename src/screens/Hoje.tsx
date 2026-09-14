import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  StatusBar,
  Share,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { BookOpen, Mic, Share2, Sprout } from '../components/icons';
import SeedCard from '../components/SeedCard';
import AvaliarSemente from '../components/AvaliarSemente';
import Responder from '../components/Responder';
import ConviteDoPlantio from '../components/ConviteDoPlantio';
import OuvirTexto from '../components/OuvirTexto';
import { partesDaReferencia } from '../onboarding/biblia';
import MusicPlayer from '../components/MusicPlayer';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import EmotionPicker from '../components/EmotionPicker';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import Button from '../components/ui/Button';
import { useFocusEffect } from '@react-navigation/native';
import { todaySeed, Seed, EmotionalFamily } from '../data/seeds';
import {
  selectTodaySeed, setMoment, getMoment, confirmarLeitura, reescolherSementeDeHoje,
} from '../onboarding/seedDelivery';
import { minhaAssinatura } from '../onboarding/assinatura';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { glassCard } from '../theme/glass';

const NATIVE = Platform.OS !== 'web';
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function weekDates() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function Hoje({ navigation }: { navigation: any }) {
  const [modalVisible, setModalVisible] = useState(false);
  /**
   * Tem o plano pago? `null` enquanto não se sabe.
   *
   * Vem do servidor, e não do formato da semente. Antes a tela deduzia o plano
   * pelo conteúdo que recebia (`seed.tipo !== 'semente'`), o que funcionava
   * enquanto Hoje servia os dois produtos. Agora ela é outra tela para cada
   * plano, e deduzir significaria buscar o devocional inteiro só para
   * descobrir que a pessoa não assina — e mostrar a página de venda depois de
   * um piscar de conteúdo que não é dela.
   */
  const [pago, setPago] = useState<boolean | null>(null);
  const [seed, setSeed] = useState<Seed>(todaySeed);
  const [pendingFamily, setPendingFamily] = useState<EmotionalFamily | null>(null);
  const [lido, setLido] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  /** Linha em que o Grão retoma algo que a pessoa contou dias atrás. */
  const [ligacao, setLigacao] = useState<string | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  /** Momento vigente quando a semente na tela foi carregada. */
  const momentoCarregado = useRef<EmotionalFamily | null>(null);
  /** Já buscamos a semente ao menos uma vez nesta sessão de tela. */
  const seedCarregada = useRef(false);
  const days = weekDates();
  const todayIdx = new Date().getDay();

  const loadSeed = React.useCallback(async () => {
    try {
      const { seed: next, lido: jaLido, ligacao: lembranca } = await selectTodaySeed();
      setSeed(next);
      setLido(!!jaLido);
      setLigacao(lembranca ?? null);
      momentoCarregado.current = await getMoment();
    } catch {
      setSeed(todaySeed);
    } finally {
      // A entrada suave continua, agora disparada pela chegada da semente e
      // não por um toque. O movimento era do conteúdo aparecendo; só o botão
      // que o provocava é que sobrava.
      Animated.timing(reveal, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }).start();
    }
  }, [reveal]);

  // O plano é conferido a cada foco, e não uma vez só: é nesta tela que a
  // pessoa volta depois de assinar, e ela precisa encontrar a semente no lugar
  // onde, um minuto antes, havia uma página de venda.
  useFocusEffect(
    React.useCallback(() => {
      let vivo = true;
      (async () => {
        const a = await minhaAssinatura();
        if (!vivo) return;
        const completo = !!a?.completo;
        setPago(completo);
        if (!completo) return;

        // Assinante: recarrega a semente só quando o momento mudou de verdade.
        // Trocar de aba não custa uma ida à rede.
        const agora = await getMoment();
        if (!vivo) return;
        if (seedCarregada.current && agora === momentoCarregado.current) return;
        seedCarregada.current = true;
        reveal.setValue(0);
        await loadSeed();
      })();
      return () => {
        vivo = false;
      };
    }, [loadSeed, reveal])
  );

  const confirmFamily = async (family: EmotionalFamily) => {
    setPendingFamily(family);
    await setMoment(family);
    // Guardar o sentimento não bastava: a semente do dia já estava entregue e
    // /seed/today devolvia a mesma, então a pessoa dizia que estava passando
    // por outra coisa e a tela não mudava nada. Quem assina precisa ver o
    // produto responder ao que acabou de contar.
    if (isSemente) await reescolherSementeDeHoje({ familia: family });
    setModalVisible(false);
    reveal.setValue(0);
    setPendingFamily(null);
    await loadSeed();
  };

  const confirmarLeituraDeHoje = async () => {
    if (confirmando || lido) return;
    setConfirmando(true);
    // Marca na tela antes da resposta: confirmar leitura é um gesto de leitura,
    // não uma transação. Se a rede falhar, o servidor recebe na próxima vez em
    // que a tela abrir; travar o botão esperando ida e volta é pior.
    setLido(true);
    try {
      await confirmarLeitura();
    } finally {
      setConfirmando(false);
    }
  };

  // O versículo é um recorte; o capítulo é o contexto. Como a Bíblia já está
  // dentro do app, a referência vira porta em vez de enfeite.
  const referencia = partesDaReferencia(seed.reference);
  const abrirCapitulo = referencia
    ? () => navigation.navigate('Biblia', { livro: referencia.livro, capitulo: referencia.capitulo })
    : undefined;

  const share = async () => {
    const message = seed.compartilhavel?.trim();
    if (!message) return;
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message } : { message, title: 'Grão' }
      );
    } catch {
      /* cancelou */
    }
  };

  const dateLine = new Date()
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase()
    .replace('.', '');

  const isSemente = pago === true;
  const isFree = pago === false;
  const contentOp = reveal;
  const contentTy = reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Hoje"
            subtitle={new Date()
              .toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
              .replace(/^./, (c) => c.toUpperCase())}
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          {/* Enquanto não se sabe o plano, nada. Um piscar de página de venda
              na cara de quem assina é pior do que meio segundo de silêncio. */}
          {pago === null ? (
            <View style={styles.esperando}>
              <ActivityIndicator color={colors.ambarSoft} />
            </View>
          ) : isFree ? (
            <ConviteDoPlantio onAssinar={() => navigation.navigate('Assinar')} />
          ) : (
          <>
          <View style={styles.weekWrap}>
            <View style={styles.week}>
              {days.map((d, i) => {
                const active = i === todayIdx;
                return (
                  <View key={i} style={styles.dayCol}>
                    <Text style={[styles.dayLetter, active && styles.dayLetterActive]}>
                      {WEEK[i]}
                    </Text>
                    <View style={[styles.dayDot, active && styles.dayDotActive]}>
                      <Text style={[styles.dayNum, active && styles.dayNumActive]}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Campo')}
              style={styles.calLink}
            >
              <Text style={styles.calLinkText}>Ver calendário</Text>
            </TouchableOpacity>
          </View>

          {/* A porta que pedia para ser aberta saiu.
              Havia um cartão intermediário — "Deus, o que temos para hoje?",
              "Toque para abrir" — entre a pessoa e a própria semente. Fazia
              sentido quando o Hoje servia os dois produtos e a abertura era
              uma pequena cerimônia; hoje é só um toque a mais para ver o que
              ela assinou. A pergunta foi para a Raiz, onde ela abre o
              devocional do dia. */}
          <Animated.View style={{ opacity: contentOp, transform: [{ translateY: contentTy }] }}>
              <View style={styles.hero}>
                <Text style={styles.dateLine}>{dateLine}</Text>
                <Text style={styles.heroTitle}>
                  {seed.title || seed.reference || 'Semente de hoje'}
                </Text>
                <Text style={styles.sectionEyebrow}>Devocional diário</Text>
              </View>

              {/* O Grão lembrando em voz alta. Vem do motor de memória, que
                  guarda fatos com evidência literal desde o primeiro dia e até
                  agora só falava no WhatsApp. É o momento que a pessoa conta
                  para alguém — "como assim ele lembrou?". */}
              {ligacao ? (
                <View style={styles.lembranca}>
                  <Text style={styles.lembrancaTexto}>{ligacao}</Text>
                </View>
              ) : null}

              {/* Ouvir vale mais aqui do que na Bíblia: é o público que não
                  tem e-mail e cansa a vista que mais pediu isso. A ordem é a
                  da leitura — versículo, referência, reflexão — e as partes
                  pagas só entram quando existem. */}
              <OuvirTexto
                trechos={[
                  seed.title || '',
                  seed.passage || '',
                  seed.reference || '',
                  seed.reflection || '',
                  ...(seed.prayer ? ['Oração.', seed.prayer] : []),
                  ...(seed.practice ? ['Prática.', seed.practice] : []),
                ]}
                rotulo={isSemente ? 'Ouvir a semente' : 'Ouvir o devocional'}
                style={styles.ouvir}
              />

              <SeedCard
                seed={seed}
                featured={true}
                onLerCapitulo={abrirCapitulo}
              />

              {isSemente && seed.music ? (
                <MusicPlayer music={seed.music} inline style={styles.player} />
              ) : null}

              {/* "Confirmar leitura" saiu daqui junto com o devocional: é o
                  gesto que marca o dia no Campo, e agora mora na Raiz, ao pé
                  da página que ele confirma. */}

              {seed.compartilhavel ? (
                <TouchableOpacity
                  onPress={share}
                  style={styles.shareBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Compartilhar"
                  hitSlop={8}
                >
                  <Share2 size={15} color={colors.foregroundMuted} strokeWidth={2} />
                  <Text style={styles.shareText}>Compartilhar</Text>
                </TouchableOpacity>
              ) : null}

              {/* Só na semente: no devocional o gesto é confirmar a leitura, e
                  duas perguntas no mesmo lugar viram formulário. */}
              {isSemente ? <AvaliarSemente seedId={seed.id} /> : null}

              {/* Responder é o que alimenta a memória. Sem obrigação e sem
                  contador: quem não escreve não perde nada. */}
              <Responder />

              {/* A porta do produto pago, que faltava.
                  Quem assina recebe a semente escolhida para o SEU momento, e
                  o momento muda todo dia — mas dentro do app só existia o
                  seletor de sentimentos, que é um atalho, não um relato. Sem
                  este caminho, contar com as próprias palavras só era possível
                  no WhatsApp ou no primeiro dia de cadastro, e o motor
                  envelhecia junto com aquele retrato. */}
              {isSemente ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MomentoSemente', { real: true })}
                  style={styles.otherLink}
                >
                  <Mic size={14} color={colors.ambarSoft} strokeWidth={2} />
                  <Text style={[styles.otherLinkText, { color: colors.ambarSoft }]}>
                    Contar como estou hoje
                  </Text>
                </TouchableOpacity>
              ) : null}

              {isSemente ? (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.otherLink}>
                  <Sprout size={14} color={colors.foregroundMuted} strokeWidth={2} />
                  <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
                </TouchableOpacity>
              ) : null}
            </Animated.View>
          </>
          )}
        </ScrollView>

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <ScreenBackground>
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.modalTitle}>Como você está{'\n'}se sentindo?</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12}>
                  <Text style={styles.modalClose}>Fechar</Text>
                </TouchableOpacity>
              </View>
              <EmotionPicker selected={pendingFamily} onSelect={confirmFamily} />
            </SafeAreaView>
          </ScreenBackground>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  esperando: { paddingVertical: 60, alignItems: 'center' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter },
  weekWrap: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCol: { alignItems: 'center', gap: 8, width: 36 },
  dayLetter: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.ambarSoft,
  },
  dayLetterActive: {
    color: colors.ambarSoft,
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: colors.accent,
  },
  dayNum: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  dayNumActive: {
    color: colors.palha,
    fontFamily: fonts.sansSemi,
  },
  calLink: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  calLinkText: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
  },
  hero: {
    marginTop: 12,
    marginBottom: 8,
  },
  dateLine: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.foregroundSubtle,
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.palha,
    letterSpacing: -0.5,
    marginBottom: 22,
  },
  sectionEyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.foregroundSubtle,
    marginBottom: 14,
  },
  passCard: {
    ...glassCard,
    borderRadius: 28,
    padding: 22,
    ...(shadows.sm as object),
  },
  passTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  passLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.ambarSoft,
  },
  passMeta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  passTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    lineHeight: 30,
    color: colors.palha,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  player: {
    marginTop: 12,
    marginBottom: 8,
  },
  ouvir: { marginBottom: 16 },
  lembranca: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 16,
    paddingVertical: 4,
    marginBottom: 20,
  },
  lembrancaTexto: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    lineHeight: 26,
    color: colors.foregroundMuted,
  },
  leituraWrap: {
    marginTop: 22,
  },
  leituraFeita: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  leituraFeitaText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
  shareBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  shareText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  otherLink: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 18,
  },
  otherLinkText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
  },
  modalTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.palha,
    letterSpacing: -0.5,
  },
  modalClose: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    marginTop: 8,
  },
});
