import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import SeedCard from '../components/SeedCard';
import MusicCard from '../components/MusicCard';
import { pastSeeds, Seed } from '../data/seeds';
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
          <GraoSymbol size={16} color={seed.planted ? colors.ambar : colors.casca40} filled={seed.planted} />
          <Text style={[styles.plantedLabel, !seed.planted && styles.plantedLabelEmpty]}>
            {seed.planted ? 'Plantada' : 'Não plantada'}
          </Text>
        </View>
      </View>
      <SeedCard seed={seed} compact={true} />
      <MusicCard music={seed.music} />
    </View>
  );
}

export default function Raiz() {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={pastSeeds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.title}>Raiz</Text>
        }
        renderItem={({ item, index }) => (
          <>
            <SeedEntry seed={item} />
            {index < pastSeeds.length - 1 && <View style={styles.separator} />}
          </>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  list: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.casca,
    marginBottom: 32,
  },
  entry: { marginBottom: 8 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  entryDate: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  plantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plantedLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.ambar,
  },
  plantedLabelEmpty: { color: colors.casca40 },
  separator: {
    height: 1,
    backgroundColor: colors.casca12,
    marginVertical: 28,
  },
});
