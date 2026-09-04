import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Sprout, Circle } from 'lucide-react-native';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import { pastSeeds, todaySeed, Seed } from '../data/seeds';
import { fetchHistory } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { space } from '../theme/spacing';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function buildSeedMap(sementes: Seed[]): Record<string, Seed> {
  const map: Record<string, Seed> = {};
  sementes.forEach((s) => {
    map[s.date] = s;
  });
  return map;
}

type DayKind = 'planted' | 'open' | 'future' | 'empty';

function StatusIcon({ kind, size = 16 }: { kind: DayKind; size?: number }) {
  if (kind === 'planted') {
    return (
      <Sprout
        size={size}
        color={colors.accent}
        strokeWidth={2.35}
        fill={colors.ambar08}
      />
    );
  }
  if (kind === 'open') {
    return <Sprout size={size} color={colors.casca40} strokeWidth={1.9} />;
  }
  return (
    <Circle
      size={Math.max(6, Math.round(size * 0.42))}
      color={colors.casca20}
      fill={colors.casca12}
      strokeWidth={0}
    />
  );
}

export default function Campo({ navigation }: { navigation: any }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthTitle = today.toLocaleDateString('pt-BR', { month: 'long' });
  const monthPretty =
    monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const [sementes, setSementes] = useState<Seed[]>([...pastSeeds, todaySeed]);
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

  const seedMap = buildSeedMap(sementes);
  const plantedCount = Object.values(seedMap).filter((s) => s.planted).length;

  const cells: Array<number | null> = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDayStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const kindForDay = (day: number): DayKind => {
    const dateStr = getDayStr(day);
    if (dateStr > todayStr) return 'future';
    const seed = seedMap[dateStr];
    if (seed?.planted) return 'planted';
    if (seed && !seed.planted) return 'open';
    return 'empty';
  };

  const renderCell = (day: number | null, index: number) => {
    if (day === null) {
      return <View key={`pad-${index}`} style={styles.cellSlot} />;
    }

    const dateStr = getDayStr(day);
    const isToday = dateStr === todayStr;
    const kind = kindForDay(day);
    const isPlanted = kind === 'planted';
    const isOpen = kind === 'open';
    const isFuture = kind === 'future';

    return (
      <View key={dateStr} style={styles.cellSlot}>
        <View
          style={[
            styles.cell,
            isPlanted && styles.cellPlanted,
            isOpen && styles.cellOpen,
            isFuture && styles.cellFuture,
            isToday && styles.cellToday,
            isToday && isPlanted && styles.cellTodayPlanted,
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              isPlanted && styles.dayNumberPlanted,
              isFuture && styles.dayNumberFuture,
              isToday && styles.dayNumberToday,
            ]}
          >
            {day}
          </Text>
          <StatusIcon kind={kind} size={isPlanted ? 17 : 15} />
        </View>
      </View>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Campo"
            subtitle={
              plantedCount === 1
                ? '1 semente plantada este mês'
                : `${plantedCount} sementes plantadas este mês`
            }
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          <View style={styles.calendarCard}>
            <View style={styles.monthRow}>
              <View style={styles.monthTitleBlock}>
                <Text style={styles.monthLabel}>{monthPretty}</Text>
                <Text style={styles.yearLabel}>{year}</Text>
              </View>
              <View style={styles.plantedPill}>
                <Sprout size={12} color={colors.accent} strokeWidth={2.4} fill={colors.ambar08} />
                <Text style={styles.plantedPillText}>{plantedCount}</Text>
              </View>
            </View>

            <View style={styles.dayHeaders}>
              {DAY_LABELS.map((d, i) => (
                <View key={i} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>{cells.map((day, i) => renderCell(day, i))}</View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchPlanted]}>
                <StatusIcon kind="planted" size={13} />
              </View>
              <Text style={styles.legendText}>Plantada</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchOpen]}>
                <StatusIcon kind="open" size={13} />
              </View>
              <Text style={styles.legendText}>Não plantada</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={styles.legendSwatch}>
                <StatusIcon kind="future" size={13} />
              </View>
              <Text style={styles.legendText}>Futuros</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: space.gutter,
  },

  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 12,
    ...(shadows.sm as object),
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  monthTitleBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  monthLabel: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 26,
    color: colors.foreground,
    letterSpacing: -0.35,
  },
  yearLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.foregroundMuted,
    letterSpacing: 0.2,
  },
  plantedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAccent,
  },
  plantedPillText: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.1,
  },

  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingBottom: 4,
  },
  dayHeaderText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundSubtle,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellSlot: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 3,
  },
  cell: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'transparent',
  },
  cellPlanted: {
    backgroundColor: 'rgba(192, 120, 38, 0.16)',
  },
  cellOpen: {
    backgroundColor: colors.surfaceSoft,
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  cellTodayPlanted: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(192, 120, 38, 0.22)',
  },

  dayNumber: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  dayNumberPlanted: {
    color: colors.accent,
    fontFamily: fonts.sansSemi,
  },
  dayNumberFuture: {
    color: colors.foregroundSubtle,
  },
  dayNumberToday: {
    color: colors.accent,
  },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: colors.casca20,
  },
  legendSwatch: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  legendSwatchPlanted: {
    backgroundColor: 'rgba(192, 120, 38, 0.16)',
  },
  legendSwatchOpen: {
    backgroundColor: colors.surface,
  },
  legendText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.foregroundMuted,
    letterSpacing: -0.1,
  },
});
