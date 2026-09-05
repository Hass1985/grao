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
} from 'react-native';
import { BookOpen, Share2, Sprout } from 'lucide-react-native';
import SeedCard from '../components/SeedCard';
import MusicPlayer from '../components/MusicPlayer';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import EmotionPicker from '../components/EmotionPicker';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import Button from '../components/ui/Button';
import { todaySeed, Seed, EmotionalFamily } from '../data/seeds';
import { selectTodaySeed, setMoment } from '../onboarding/seedDelivery';
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
  const [opened, setOpened] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [seed, setSeed] = useState<Seed>(todaySeed);
  const [pendingFamily, setPendingFamily] = useState<EmotionalFamily | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const days = weekDates();
  const todayIdx = new Date().getDay();

  const loadSeed = React.useCallback(async () => {
    try {
      const { seed: next } = await selectTodaySeed();
      setSeed(next);
    } catch {
      setSeed(todaySeed);
    }
  }, []);

  useEffect(() => {
    loadSeed();
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

  const confirmFamily = async (family: EmotionalFamily) => {
    setPendingFamily(family);
    await setMoment(family);
    setModalVisible(false);
    setOpened(false);
    reveal.setValue(0);
    setPendingFamily(null);
    await loadSeed();
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

  const isFree = seed.tipo === 'devocional' || seed.completa === false;
  const isSemente = !isFree;
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

          {!opened ? (
            <View style={styles.hero}>
              <Text style={styles.dateLine}>{dateLine}</Text>
              <Text style={styles.heroTitle}>Deus, o que temos para hoje?</Text>
              <Text style={styles.sectionEyebrow}>Devocional diário</Text>

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
                <Text style={styles.sectionEyebrow}>Devocional diário</Text>
              </View>

              <SeedCard
                seed={seed}
                featured={true}
                onSaibaMais={() => navigation.navigate('Plantio')}
              />

              {isSemente && seed.music ? (
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

              {isSemente ? (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.otherLink}>
                  <Sprout size={14} color={colors.foregroundMuted} strokeWidth={2} />
                  <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
                </TouchableOpacity>
              ) : null}
            </Animated.View>
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
