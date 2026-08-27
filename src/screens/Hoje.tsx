import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import FamilyIcon from '../components/FamilyIcon';
import ProfileButton from '../components/ProfileButton';
import SeedCard from '../components/SeedCard';
import MusicCard from '../components/MusicCard';
import { todaySeed, emotionalFamilies, Seed, EmotionalFamily } from '../data/seeds';
import { selectTodaySeed, setMoment } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';

export default function Hoje({ navigation }: { navigation: any }) {
  const [planted, setPlanted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [seed, setSeed] = useState<Seed>(todaySeed);

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

  const chooseFamily = async (family: EmotionalFamily) => {
    await setMoment(family);
    setModalVisible(false);
    setPlanted(false);
    await loadSeed();
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header — backgroundElevated como no site */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <GraoSymbol size={28} color={colors.accent} filled={false} />
            <Text style={styles.date}>{today}</Text>
          </View>
          <ProfileButton onPress={() => navigation.navigate('Settings')} />
        </View>

        {/* Semente do dia — escolhida pelo perfil + momento */}
        <SeedCard seed={seed} featured={true} />

        <MusicCard music={seed.music} />

        {!planted ? (
          <TouchableOpacity
            style={styles.plantButton}
            onPress={() => setPlanted(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.plantButtonText}>Levar esta semente</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.plantedState}>
            <GraoSymbol size={22} color={colors.accent} filled={true} />
            <Text style={styles.plantedText}>Semente plantada hoje</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.otherLink}>
          <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal de estados emocionais */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>O que você está sentindo?</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={emotionalFamilies}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.familyList}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.familyCard}
                onPress={() => chooseFamily(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.familyIconWrap}>
                  <FamilyIcon family={item.id} size={22} color={colors.accent} />
                </View>
                <Text style={styles.familyLabel}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  date: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    textTransform: 'capitalize',
    letterSpacing: 0.1,
  },

  plantButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    ...(shadows.sm as object),
  },
  plantButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accentForeground,
    letterSpacing: 0.3,
  },

  plantedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    marginBottom: 12,
  },
  plantedText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accent,
  },

  otherLink: { alignItems: 'center', paddingVertical: 8 },
  otherLinkText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    textDecorationLine: 'underline',
  },

  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.foreground },
  modalClose: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.accent },

  familyList: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  familyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    ...(shadows.sm as object),
  },
  familyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foreground },
});
