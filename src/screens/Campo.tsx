import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import { pastSeeds } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const TOTAL_CELLS = 30;
const COLUMNS = 5;

export default function Campo() {
  const plantedCount = pastSeeds.filter((s) => s.planted).length + 1;

  const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => {
    const dayIndex = i + 1;
    if (dayIndex === plantedCount) return 'today';
    if (dayIndex < plantedCount) {
      const seed = pastSeeds[TOTAL_CELLS - dayIndex];
      return seed?.planted ? 'planted' : 'empty';
    }
    return 'future';
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Seu campo</Text>
        <Text style={styles.subtitle}>
          {plantedCount} {plantedCount === 1 ? 'semente plantada' : 'sementes plantadas'} neste ciclo
        </Text>

        <View style={styles.grid}>
          {cells.map((cell, i) => (
            <View key={i} style={styles.cell}>
              {cell === 'future' ? (
                <View style={styles.emptyCell} />
              ) : cell === 'planted' || cell === 'today' ? (
                <GraoSymbol
                  size={36}
                  color={colors.ambar}
                  filled={true}
                />
              ) : (
                <GraoSymbol
                  size={36}
                  color={colors.peneira}
                  filled={false}
                />
              )}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <GraoSymbol size={18} color={colors.ambar} filled={true} />
            <Text style={styles.legendText}>Plantada</Text>
          </View>
          <View style={styles.legendItem}>
            <GraoSymbol size={18} color={colors.casca40} filled={false} />
            <Text style={styles.legendText}>Não plantada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Dias futuros</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.casca,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.casca60,
    marginBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  cell: {
    width: `${100 / COLUMNS - 4}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.casca12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.casca12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.casca60,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.casca12,
  },
});
