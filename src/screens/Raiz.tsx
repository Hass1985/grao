import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import ProfileButton from '../components/ProfileButton';
import SeedCard from '../components/SeedCard';
import MusicCard from '../components/MusicCard';
import { pastSeeds, Seed } from '../data/seeds';
import { fetchHistory } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function SeedEntry({ seed }: { seed: Seed }) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(seed.date)}</Text>
        <View style={styles.plantedBadge}>
          {seed.planted ? <Text style={styles.plantedEmoji}>🌱</Text> : null}
          <Text style={[styles.plantedLabel, !seed.planted && styles.plantedLabelEmpty]}>
            {seed.planted ? 'Plantada' : 'Não plantada'}
          </Text>
        </View>
      </View>
      <SeedCard seed={seed} compact={true} featured={true} />
      <MusicCard music={seed.music} />
    </View>
  );
}

export default function Raiz({ navigation }: { navigation: any }) {
  // Mesmo histórico do Campo: o que a pessoa recebeu de verdade.
  const [sementes, setSementes] = useState<Seed[]>(pastSeeds);
  const carregar = useCallback(async () => {
    try { setSementes(await fetchHistory()); } catch { /* mantém a reserva */ }
  }, []);
  useEffect(() => {
    carregar();
    const un = navigation?.addListener?.('focus', carregar);
    return un;
  }, [carregar, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sementes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Raiz</Text>
              <Text style={styles.subtitle}>Suas sementes, guardadas.</Text>
            </View>
            <ProfileButton onPress={() => navigation.navigate('Settings')} />
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            <SeedEntry seed={item} />
            {index < sementes.length - 1 && <View style={styles.separator} />}
          </>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 48 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { gap: 2 },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.foreground },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.foregroundMuted },

  entry: { marginBottom: 4 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  plantedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plantedEmoji: { fontSize: 14 },
  plantedLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.accent },
  plantedLabelEmpty: { color: colors.foregroundSubtle },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
});
