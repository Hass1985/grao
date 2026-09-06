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
            {seed.tipo === 'semente'
              ? seed.planted ? 'Plantada' : 'Não plantada'
              : 'Lido'}
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

  // A Raiz guarda o que a pessoa VIVEU, não o calendário inteiro. No gratuito,
  // isso é o devocional que ela confirmou ter lido; listar todos os dias do ano
  // seria dizer que ela leu tudo, e o histórico perderia o sentido.
  const guardadas = sementes.filter((s) => s.tipo === 'semente' || s.planted);
  const ehDevocional = guardadas.every((s) => s.tipo !== 'semente');

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <FlatList
          data={guardadas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <AppHeader
                title="Raiz"
                subtitle={
                  guardadas.length === 0
                    ? 'O que você guardar aparece aqui.'
                    : ehDevocional
                      ? `${guardadas.length} ${guardadas.length === 1 ? 'devocional lido' : 'devocionais lidos'}.`
                      : 'Suas sementes, guardadas.'
                }
                onLogoPress={() => navigation.navigate('Settings')}
                onProfilePress={() => navigation.navigate('Settings')}
              />
              <View style={{ height: 16 }} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>Sua raiz começa hoje.</Text>
              <Text style={styles.vazioTexto}>
                Leia o devocional de hoje e toque em confirmar leitura. Cada dia
                confirmado fica guardado aqui, para você voltar quando quiser.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <>
              <SeedEntry seed={item} />
              {index < guardadas.length - 1 && <View style={styles.separator} />}
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
  vazio: { paddingTop: 32, paddingHorizontal: 4, gap: 12 },
  vazioTitulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    lineHeight: 30,
    color: colors.palha,
    letterSpacing: -0.3,
  },
  vazioTexto: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 25,
    color: colors.foregroundMuted,
  },
  plantedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plantedEmoji: { fontSize: 14 },
  plantedLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.accent },
  plantedLabelEmpty: { color: colors.foregroundSubtle },
  separator: { height: 1, backgroundColor: colors.hairline, marginVertical: 24 },
});
