import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Share,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { BookOpen, Share2, Sprout } from '../components/icons';
import SeedCard from '../components/SeedCard';
import AvaliarSemente from '../components/AvaliarSemente';
import MusicPlayer from '../components/MusicPlayer';
import ScreenBackground from '../components/ui/ScreenBackground';
import CircleBack from '../components/ui/CircleBack';
import Button from '../components/ui/Button';
import { pastSeeds, Seed } from '../data/seeds';
import { selectSementeTeste, sementeTesteDeHoje } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { glassCard } from '../theme/glass';
import { webScreenFill, webScroll } from '../theme/webScreen';

const NATIVE = Platform.OS !== 'web';

const seedInicial =
  pastSeeds.find((s) => s.prayer && s.practice && s.music) || pastSeeds[0];

/**
 * Espelho do Hoje só para validar o fluxo pago (oração, prática, louvor).
 * Chega depois do MomentoSementeTeste (áudio/texto + motor).
 */
export default function HojeSementeTeste({
  navigation,
  route,
}: {
  navigation: any;
  route?: any;
}) {
  // A família lida na conversa de teste chega pela navegação, não pelo momento
  // guardado: o teste não escreve no estado real de quem está demonstrando.
  const familiaDoTeste = route?.params?.family ?? null;
  /** Aberta pelo atalho "ver de novo", sem passar pela conversa. */
  const soLeitura = !!route?.params?.reler;
  const [opened, setOpened] = useState(soLeitura);
  const [semSemente, setSemSemente] = useState(false);
  const [seed, setSeed] = useState<Seed>({
    ...seedInicial,
    tipo: 'semente',
    completa: true,
    bloqueado: null,
  });
  const reveal = useRef(new Animated.Value(soLeitura ? 1 : 0)).current;

  const loadSeed = React.useCallback(async () => {
    // Reler não escolhe semente nova nem gasta do teto: é a mesma do dia.
    if (soLeitura) {
      const deHoje = await sementeTesteDeHoje();
      if (deHoje) setSeed(deHoje);
      else setSemSemente(true);
      return;
    }
    try {
      const { seed: next } = await selectSementeTeste(familiaDoTeste);
      setSeed(next);
    } catch {
      /* mantém a semente já carregada */
    }
  }, [familiaDoTeste, soLeitura]);

  useEffect(() => {
    void loadSeed();
  }, [loadSeed]);

  const openToday = () => {
    if (opened) return;
    setOpened(true);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  };

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

  const contentOp = reveal;
  const contentTy = reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        <View style={styles.topbar}>
          <CircleBack onPress={() => navigation.goBack()} />
          <View style={styles.topTitles}>
            <Text style={styles.topTitle}>Hoje</Text>
            <Text style={styles.topHint}>Modo teste · Plantio</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        <ScrollView
          style={webScroll}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {semSemente ? (
            <View style={styles.hero}>
              <Text style={styles.dateLine}>{dateLine}</Text>
              <Text style={styles.heroTitle}>Sua semente de hoje{'\n'}ainda não foi preparada.</Text>
              <Text style={styles.vazioTexto}>
                Conte o seu momento e o Grão escolhe a semente do dia. Depois
                ela fica aqui, para você reler quantas vezes quiser.
              </Text>
              <Button
                title="Contar meu momento"
                onPress={() => navigation.replace('MomentoSementeTeste')}
                variant="dark"
                uppercase
                style={styles.vazioBtn}
              />
            </View>
          ) : !opened ? (
            <View style={styles.hero}>
              <Text style={styles.dateLine}>{dateLine}</Text>
              <Text style={styles.heroTitle}>Deus, o que temos para hoje?</Text>
              <Text style={styles.sectionEyebrow}>Semente personalizada</Text>

              <View style={styles.passCard}>
                <View style={styles.passTop}>
                  <View style={styles.passLabelRow}>
                    <BookOpen size={16} color={colors.ambarSoft} strokeWidth={2.2} />
                    <Text style={styles.passLabel}>Passagem</Text>
                  </View>
                  <Text style={styles.passMeta}>1 min</Text>
                </View>
                <Text style={styles.passTitle}>Toque para abrir a semente de hoje</Text>
                <Button title="Abrir" onPress={openToday} variant="dark" uppercase />
              </View>
            </View>
          ) : (
            <Animated.View style={{ opacity: contentOp, transform: [{ translateY: contentTy }] }}>
              <View style={styles.hero}>
                <Text style={styles.dateLine}>{dateLine}</Text>
                <Text style={styles.heroTitle}>
                  {seed.title || seed.reference || 'Semente de hoje'}
                </Text>
                <Text style={styles.sectionEyebrow}>Semente personalizada</Text>
              </View>

              <SeedCard seed={seed} featured={true} />

              {seed.music ? (
                <MusicPlayer music={seed.music} inline style={styles.player} />
              ) : null}

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

              <AvaliarSemente seedId={seed.id} />

              <TouchableOpacity
                onPress={() => navigation.navigate('HistoricoTeste')}
                style={styles.otherLink}
              >
                <BookOpen size={14} color={colors.foregroundMuted} strokeWidth={2} />
                <Text style={styles.otherLinkText}>Ver meu campo e minha raiz</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.replace('MomentoSementeTeste')}
                style={styles.otherLink}
              >
                <Sprout size={14} color={colors.foregroundMuted} strokeWidth={2} />
                <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  topTitles: { flex: 1, alignItems: 'center' },
  topTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 20,
    color: colors.palha,
    letterSpacing: -0.3,
  },
  topHint: {
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginTop: 2,
  },
  topSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingBottom: 40,
  },
  hero: {
    marginTop: 12,
    marginBottom: 8,
  },
  vazioTexto: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 25,
    color: colors.foregroundMuted,
    marginBottom: 24,
  },
  vazioBtn: { marginTop: 4 },
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
});
