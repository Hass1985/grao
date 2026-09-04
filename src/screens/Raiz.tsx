import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, StatusBar } from 'react-native';
import SeedCard from '../components/SeedCard';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import { pastSeeds, Seed } from '../data/seeds';
import { fetchHistory } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';

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
      <SeedCard seed={seed} compact featured embedMusic />
    </View>
  );
}

export default function Raiz({ navigation }: { navigation: any }) {
  const [sementes, setSementes] = useState<Seed[]>(pastSeeds);
  const carregar = useCallback(async () => {
    try {
      setSementes(await fetchHistory());
    } catch {
      /* mantém a reserva */
    }
  }, []);
  useEffect(() => {
    carregar();
    const un = navigation?.addListener?.('focus', carregar);
    return un;
  }, [carregar, navigation]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <FlatList
          data={sementes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <AppHeader
              title="Raiz"
              subtitle="Suas sementes, guardadas."
              onLogoPress={() => navigation.navigate('Settings')}
              onProfilePress={() => navigation.navigate('Settings')}
            />
          }
          renderItem={({ item, index }) => (
            <>
              <SeedEntry seed={item} />
              {index < sementes.length - 1 && <View style={styles.separator} />}
            </>
          )}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { paddingHorizontal: space.gutter, paddingTop: 0 },

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
  separator: { height: 1, backgroundColor: colors.hairline, marginVertical: 24 },
});
