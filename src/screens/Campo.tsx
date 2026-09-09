import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Sprout, Circle } from '../components/icons';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import { pastSeeds, todaySeed, Seed } from '../data/seeds';
import { fetchHistory, resumoDeLeitura, ResumoLeitura } from '../onboarding/seedDelivery';
import { meusGraos, type ResumoGraos } from '../onboarding/graos';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';

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
    return (
      <Sprout size={size} color={colors.foregroundMuted} strokeWidth={2} />
    );
  }
  return (
    <Circle
      size={Math.max(7, Math.round(size * 0.48))}
      color={colors.foregroundSubtle}
      fill={colors.foregroundSubtle}
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
  const [resumo, setResumo] = useState<ResumoLeitura | null>(null);
  const [graos, setGraos] = useState<ResumoGraos | null>(null);
  const carregar = useCallback(async () => {
    try {
      const [historico, r, g] = await Promise.all([
        fetchHistory(), resumoDeLeitura(), meusGraos(),
      ]);
      setSementes(historico);
      setResumo(r);
      setGraos(g);
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

  // O gratuito lê devocional e confirma leitura; quem assina recebe semente e
  // planta. É a mesma tela contando duas histórias, e a palavra errada faz a
  // pessoa procurar um gesto que não existe no plano dela.
  const ehDevocional = sementes.length > 0 && sementes.every((s) => s.tipo !== 'semente');
  const rotulo = ehDevocional
    ? { feito: 'Lido', aberto: 'Não lido', unidade: plantedCount === 1 ? 'dia lido' : 'dias lidos' }
    : { feito: 'Plantada', aberto: 'Aberta', unidade: plantedCount === 1 ? 'semente plantada' : 'sementes plantadas' };

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
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Campo"
            subtitle={`${plantedCount} ${rotulo.unidade} este mês`}
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          {/* Os grãos e o nível.
              Duas coisas diferentes de propósito: o grão é o retorno de cada
              gesto, o nível é o arco longo. O nível conta DIAS, não grãos,
              porque "um ano" significa alguma coisa e "2.000 pontos" não. */}
          {graos ? (
            <View style={styles.graosCard}>
              <View style={styles.graosLinha}>
                <View>
                  <Text style={styles.graosRotulo}>Seus grãos</Text>
                  <Text style={styles.graosValor}>{graos.saldo}</Text>
                </View>
                <View style={styles.nivelBloco}>
                  <Text style={styles.graosRotulo}>Nível</Text>
                  <Text style={styles.nivelNome}>
                    {graos.nivel ? graos.nivel.nome : 'Primeiro dia'}
                  </Text>
                </View>
              </View>

              {graos.proximo ? (
                <>
                  <View style={styles.trilho}>
                    <View
                      style={[
                        styles.trilhoCheio,
                        { width: `${Math.min(100, Math.round((graos.acumulado / graos.proximo.dias) * 100))}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.graosApoio}>
                    Faltam {graos.faltam} {graos.faltam === 1 ? 'dia' : 'dias'} para {graos.proximo.nome}
                    {graos.sequencia > 1 ? ' · dia seguido conta em dobro' : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.graosApoio}>
                  Você chegou ao último nível. Obrigado por caminhar até aqui.
                </Text>
              )}
            </View>
          ) : null}

          {/* Sequência e total.
              A sequência conta até ontem, então quem ainda não leu hoje de
              manhã não vê o número zerado às 7h. E quando ela realmente zera, o
              texto convida em vez de cobrar: um devocional que culpa quem
              faltou empurra para longe justamente quem mais precisa voltar. */}
          {ehDevocional && resumo ? (
            <View style={styles.numeros}>
              <View style={styles.numeroCard}>
                <Text style={styles.numeroValor}>
                  {resumo.sequencia > 0 ? resumo.sequencia : '—'}
                </Text>
                <Text style={styles.numeroRotulo}>
                  {resumo.sequencia === 0
                    ? 'Comece hoje'
                    : resumo.sequencia === 1
                      ? 'dia seguido'
                      : 'dias seguidos'}
                </Text>
                {resumo.maiorSequencia > resumo.sequencia ? (
                  <Text style={styles.numeroNota}>
                    sua marca: {resumo.maiorSequencia}
                  </Text>
                ) : null}
              </View>

              <View style={styles.numeroCard}>
                <Text style={styles.numeroValor}>{resumo.total}</Text>
                <Text style={styles.numeroRotulo}>
                  {resumo.total === 1 ? 'dia no total' : 'dias no total'}
                </Text>
                {resumo.total > 0 ? (
                  <Text style={styles.numeroNota}>desde o começo</Text>
                ) : null}
              </View>
            </View>
          ) : null}

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
              <Text style={styles.legendText}>{rotulo.feito}</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendSwatchOpen]}>
                <StatusIcon kind="open" size={13} />
              </View>
              <Text style={styles.legendText}>{rotulo.aberto}</Text>
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

  graosCard: {
    ...glassCard,
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    ...(shadows.sm as object),
  },
  graosLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nivelBloco: { alignItems: 'flex-end' },
  graosRotulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginBottom: 6,
  },
  graosValor: {
    fontFamily: fonts.serifMedium,
    fontSize: 38,
    lineHeight: 40,
    color: colors.palha,
    letterSpacing: -0.8,
  },
  nivelNome: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    lineHeight: 30,
    color: colors.accent,
    letterSpacing: -0.3,
  },
  trilho: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.casca20,
    overflow: 'hidden',
    marginTop: 18,
  },
  trilhoCheio: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  graosApoio: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.foregroundSubtle,
    marginTop: 10,
  },
  numeros: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  numeroCard: {
    ...glassCard,
    flex: 1,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...(shadows.sm as object),
  },
  numeroValor: {
    fontFamily: fonts.serifMedium,
    fontSize: 30,
    lineHeight: 34,
    color: colors.accent,
    letterSpacing: -0.5,
  },
  numeroRotulo: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.palha,
    marginTop: 2,
  },
  numeroNota: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.foregroundSubtle,
    marginTop: 6,
  },
  calendarCard: {
    ...glassCard,
    marginTop: 16,
    borderRadius: 28,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
    backgroundColor: 'rgba(247, 240, 226, 0.08)',
  },
  legendSwatchPlanted: {
    backgroundColor: 'rgba(192, 120, 38, 0.16)',
  },
  legendSwatchOpen: {
    backgroundColor: 'rgba(247, 240, 226, 0.08)',
  },
  legendText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.foregroundMuted,
    letterSpacing: -0.1,
  },
});
