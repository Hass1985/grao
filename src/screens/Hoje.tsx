import React, { useState } from 'react';
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
import ProfileButton from '../components/ProfileButton';
import SeedCard from '../components/SeedCard';
import MusicCard from '../components/MusicCard';
import { todaySeed, emotionalFamilies } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

export default function Hoje({ navigation }: { navigation: any }) {
  const [planted, setPlanted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <GraoSymbol size={32} color={colors.ambar} filled={false} />
            <Text style={styles.date}>{today}</Text>
          </View>
          <ProfileButton onPress={() => navigation.navigate('Settings')} />
        </View>

        <View style={styles.seedContainer}>
          <SeedCard seed={todaySeed} />
        </View>

        <MusicCard music={todaySeed.music} />

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
            <GraoSymbol size={24} color={colors.ambar} filled={true} />
            <Text style={styles.plantedText}>Semente plantada hoje</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.otherLink}>
          <Text style={styles.otherLinkText}>Estou passando por outra coisa</Text>
        </TouchableOpacity>
      </ScrollView>

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
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.familyEmoji}>{item.emoji}</Text>
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
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  date: {
    fontFamily: fonts.sans, fontSize: fontSizes.sm,
    color: colors.casca60, textTransform: 'capitalize',
  },
  seedContainer: {
    backgroundColor: colors.peneira, borderRadius: 16, padding: 20, marginBottom: 8,
  },
  plantButton: {
    backgroundColor: colors.ambar, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  plantButtonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
  plantedState: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginBottom: 16,
  },
  plantedText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.ambar },
  otherLink: { alignItems: 'center', paddingVertical: 8 },
  otherLinkText: {
    fontFamily: fonts.sans, fontSize: fontSizes.sm,
    color: colors.casca60, textDecorationLine: 'underline',
  },
  modal: { flex: 1, backgroundColor: colors.palha },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: colors.casca12,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.casca },
  modalClose: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.ambar },
  familyList: { paddingHorizontal: 24, paddingTop: 20, gap: 10 },
  familyCard: {
    flex: 1, backgroundColor: colors.peneira, borderRadius: 12,
    padding: 16, alignItems: 'center', gap: 8,
  },
  familyEmoji: { fontSize: 28 },
  familyLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.casca },
});
