import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import ProfileButton from '../components/ProfileButton';
import { pastSeeds, todaySeed, Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function buildSeedMap(): Record<string, Seed> {
  const map: Record<string, Seed> = {};
  pastSeeds.forEach((s) => { map[s.date] = s; });
  const todayStr = new Date().toISOString().split('T')[0];
  map[todayStr] = todaySeed;
  return map;
}

export default function Campo({ navigation }: { navigation: any }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const seedMap = buildSeedMap();

  const plantedCount = Object.values(seedMap).filter((s) => s.planted).length;

  // Build calendar cells: null = empty padding, number = day
  const cells: Array<number | null> = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDayStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const renderCell = (day: number | null, index: number) => {
    if (day === null) {
      return <View key={`pad-${index}`} style={styles.cell} />;
    }

    const dateStr = getDayStr(day);
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const seed = seedMap[dateStr];

    let indicator = null;

    if (isFuture) {
      indicator = <View style={styles.futureDot} />;
    } else if (seed?.planted) {
      indicator = <Text style={styles.seedEmoji}>🌱</Text>;
    } else if (seed && !seed.planted) {
      indicator = <GraoSymbol size={22} color={colors.casca40} filled={false} />;
    } else {
      // Past day with no seed data
      indicator = <View style={styles.noSeedDot} />;
    }

    return (
      <View key={dateStr} style={[styles.cell, isToday && styles.cellToday]}>
        <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{day}</Text>
        {indicator}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Seu campo</Text>
            <Text style={styles.subtitle}>
              {plantedCount} {plantedCount === 1 ? 'semente plantada' : 'sementes plantadas'} este mês
            </Text>
          </View>
          <ProfileButton onPress={() => navigation.navigate('Settings')} />
        </View>

        {/* Month label */}
        <Text style={styles.monthLabel}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</Text>

        {/* Day-of-week headers */}
        <View style={styles.dayHeaders}>
          {DAY_LABELS.map((d, i) => (
            <View key={i} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {cells.map((day, i) => renderCell(day, i))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Text style={styles.legendEmoji}>🌱</Text>
            <Text style={styles.legendText}>Plantada</Text>
          </View>
          <View style={styles.legendItem}>
            <GraoSymbol size={16} color={colors.casca40} filled={false} />
            <Text style={styles.legendText}>Não plantada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.futureDotLegend} />
            <Text style={styles.legendText}>Dias futuros</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.casca, marginBottom: 2 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60 },
  monthLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.casca60,
    textTransform: 'capitalize',
    marginBottom: 12,
    textAlign: 'center',
  },
  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeaderCell: { width: CELL_SIZE, alignItems: 'center' },
  dayHeaderText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 28 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 8,
  },
  cellToday: {
    backgroundColor: 'rgba(192, 120, 38, 0.10)',
    borderWidth: 1.5,
    borderColor: colors.ambar,
  },
  dayNumber: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.casca60,
  },
  dayNumberToday: { color: colors.ambar },
  seedEmoji: { fontSize: 18 },
  futureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.casca12 },
  noSeedDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.casca12 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.casca12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendEmoji: { fontSize: 16 },
  legendText: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca60 },
  futureDotLegend: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.casca12 },
});
