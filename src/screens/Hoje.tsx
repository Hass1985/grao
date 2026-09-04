import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  StatusBar,
} from 'react-native';
import { Check } from 'lucide-react-native';
import SeedCard from '../components/SeedCard';
import MusicPlayer, { MUSIC_PLAYER_CLEARANCE } from '../components/MusicPlayer';
import EmotionPicker from '../components/EmotionPicker';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import Button from '../components/ui/Button';
import { todaySeed, Seed, EmotionalFamily } from '../data/seeds';
import { selectTodaySeed, setMoment } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';

export default function Hoje({ navigation }: { navigation: any }) {
  const [planted, setPlanted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [seed, setSeed] = useState<Seed>(todaySeed);
  const [pendingFamily, setPendingFamily] = useState<EmotionalFamily | null>(null);

  const loadSeed = React.useCallback(async () => {
    try {
      const { seed } = await selectTodaySeed();
      setSeed(seed);
    } catch {
      setSeed(todaySeed);
    }
  }, []);

  useEffect(() => {
    loadSeed();
  }, [loadSeed]);

  const confirmFamily = async (family: EmotionalFamily) => {
    setPendingFamily(family);
    await setMoment(family);
    setModalVisible(false);
    setPlanted(false);
    setPendingFamily(null);
    await loadSeed();
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: MUSIC_PLAYER_CLEARANCE + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Hoje"
            subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          <Text style={styles.greeting}>Sua semente{'\n'}para agora.</Text>

          <SeedCard seed={seed} featured={true} />

          {!planted ? (
            <Button
              title="Levar esta semente"
              onPress={() => setPlanted(true)}
              style={{ marginTop: 28 }}
            />
          ) : (
            <View style={styles.plantedState}>
              <Check size={20} color={colors.accent} strokeWidth={2.5} />
              <Text style={styles.plantedText}>Semente plantada hoje</Text>
            </View>
          )}

          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.otherLink}>
            <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
          </TouchableOpacity>
        </ScrollView>

        <MusicPlayer music={seed.music} />

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
  greeting: {
    fontFamily: fonts.serifMedium,
    fontSize: 30,
    lineHeight: 36,
    color: colors.foreground,
    letterSpacing: -0.6,
    marginBottom: 22,
  },
  plantedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    marginTop: 20,
  },
  plantedText: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    color: colors.accent,
  },
  otherLink: { alignItems: 'center', paddingVertical: 16 },
  otherLinkText: {
    fontFamily: fonts.serif,
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
    fontSize: 30,
    lineHeight: 36,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  modalClose: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    marginTop: 8,
  },
});
