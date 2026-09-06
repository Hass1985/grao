import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Sprout, Circle } from '../components/icons';
import SeedCard from '../components/SeedCard';
import CircleBack from '../components/ui/CircleBack';
import ScreenBackground from '../components/ui/ScreenBackground';
import { Seed } from '../data/seeds';
import { fetchHistoricoTeste } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';
import { webScreenFill, webScroll } from '../theme/webScreen';

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * Campo e Raiz do fluxo de teste do plano pago.
 *
 * Telas próprias, e não as do app: no plano gratuito o Campo e a Raiz contam a
 * história do devocional lido, e misturar ali as sementes da demonstração faria
 * as duas telas contarem duas histórias ao mesmo tempo — nenhuma delas a da
 * pessoa. Aqui vive só o que a demonstração entregou.
 *
 * As duas visões dividem uma tela só de propósito: no teste elas são
 * consultadas juntas, e voltar e entrar de novo para trocar de aba é atrito
 * onde não precisa haver.
 */
export default function HistoricoTeste({ navigation }: { navigation: any }) {
  const [aba, setAba] = useState<'campo' | 'raiz'>('campo');
  const [sementes, setSementes] = useState<Seed[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setSementes(await fetchHistoricoTeste());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const un = navigation?.addListener?.('focus', carregar);
    return un;
  }, [carregar, navigation]);

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long' });

  const porData: Record<string, Seed> = {};
  sementes.forEach((s) => { porData[s.date] = s; });

  const celulas: Array<number | null> = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  const dataDoDia = (d: number) =>
    `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        <View style={styles.topbar}>
          <CircleBack onPress={() => navigation.goBack()} />
          <View style={styles.topTitles}>
            <Text style={styles.topTitle}>{aba === 'campo' ? 'Campo' : 'Raiz'}</Text>
            <Text style={styles.topHint}>Modo teste · Plantio</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.abas}>
          {(['campo', 'raiz'] as const).map((id) => (
            <Pressable
              key={id}
              onPress={() => setAba(id)}
              style={[styles.aba, aba === id && styles.abaAtiva]}
              accessibilityRole="button"
              accessibilityState={{ selected: aba === id }}
            >
              <Text style={[styles.abaTexto, aba === id && styles.abaTextoAtivo]}>
                {id === 'campo' ? 'Campo' : 'Raiz'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={webScroll}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {carregando ? (
            <Text style={styles.aviso}>Carregando…</Text>
          ) : sementes.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>Nada por aqui ainda.</Text>
              <Text style={styles.vazioTexto}>
                As sementes que a demonstração entregar aparecem aqui: o Campo
                marca o dia, a Raiz guarda o conteúdo inteiro.
              </Text>
            </View>
          ) : aba === 'campo' ? (
            <View style={styles.calendario}>
              <View style={styles.mesRow}>
                <View>
                  <Text style={styles.mesNome}>
                    {nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}
                  </Text>
                  <Text style={styles.mesAno}>{ano}</Text>
                </View>
                <View style={styles.pilula}>
                  <Sprout size={12} color={colors.accent} strokeWidth={2.4} fill={colors.ambar08} />
                  <Text style={styles.pilulaTexto}>{sementes.length}</Text>
                </View>
              </View>

              <View style={styles.linhaDias}>
                {DIAS.map((d, i) => (
                  <View key={i} style={styles.celulaSlot}>
                    <Text style={styles.diaLetra}>{d}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.grade}>
                {celulas.map((dia, i) => {
                  if (dia === null) return <View key={`v-${i}`} style={styles.celulaSlot} />;
                  const data = dataDoDia(dia);
                  const temSemente = !!porData[data];
                  const ehHoje = data === hojeStr;
                  const futuro = data > hojeStr;
                  return (
                    <View key={data} style={styles.celulaSlot}>
                      <View
                        style={[
                          styles.celula,
                          temSemente && styles.celulaCheia,
                          ehHoje && styles.celulaHoje,
                        ]}
                      >
                        <Text
                          style={[
                            styles.celulaNumero,
                            temSemente && styles.celulaNumeroCheia,
                            futuro && styles.celulaNumeroFuturo,
                          ]}
                        >
                          {dia}
                        </Text>
                        {temSemente ? (
                          <Sprout size={16} color={colors.accent} strokeWidth={2.35} fill={colors.ambar08} />
                        ) : (
                          <Circle
                            size={7}
                            color={colors.foregroundSubtle}
                            fill={colors.foregroundSubtle}
                            strokeWidth={0}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.rodape}>
                {sementes.length === 1
                  ? '1 semente entregue na demonstração'
                  : `${sementes.length} sementes entregues na demonstração`}
              </Text>

              <Pressable
                onPress={() => navigation.navigate('HojeSementeTeste', { reler: true })}
                style={styles.atalho}
                hitSlop={8}
              >
                <Text style={styles.atalhoTexto}>Abrir a semente de hoje</Text>
              </Pressable>
            </View>
          ) : (
            sementes.map((s, i) => (
              <View key={s.id} style={styles.entrada}>
                <Text style={styles.entradaData}>
                  {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </Text>
                <SeedCard seed={s} compact featured embedMusic />
                {i < sementes.length - 1 ? <View style={styles.separador} /> : null}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  topTitles: { flex: 1, alignItems: 'center' },
  topTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 20,
    color: colors.palha,
    letterSpacing: -0.3,
  },
  topHint: {
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginTop: 2,
  },
  topSpacer: { width: 40 },

  abas: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: space.gutter,
    paddingTop: 14,
    paddingBottom: 6,
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  abaAtiva: { backgroundColor: colors.surfaceAccent },
  abaTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  abaTextoAtivo: { color: colors.accent, fontFamily: fonts.sansSemi },

  scroll: { paddingHorizontal: space.gutter, paddingTop: 10, paddingBottom: 40 },
  aviso: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    paddingTop: 24,
  },

  vazio: { paddingTop: 28, gap: 12 },
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

  calendario: {
    ...glassCard,
    borderRadius: 28,
    padding: 20,
    ...(shadows.sm as object),
  },
  mesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mesNome: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    color: colors.palha,
    letterSpacing: -0.3,
  },
  mesAno: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.foregroundSubtle,
    marginTop: 2,
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAccent,
  },
  pilulaTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    color: colors.accent,
  },

  linhaDias: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  diaLetra: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    color: colors.ambarSoft,
    textAlign: 'center',
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  celulaSlot: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  celula: {
    width: 40,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  celulaCheia: { backgroundColor: colors.surfaceAccent },
  celulaHoje: { borderWidth: 1, borderColor: colors.accent },
  celulaNumero: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.foregroundMuted,
  },
  celulaNumeroCheia: { color: colors.accent, fontFamily: fonts.sansSemi },
  celulaNumeroFuturo: { color: colors.foregroundSubtle },
  rodape: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    marginTop: 16,
  },
  atalho: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  atalhoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
  },

  entrada: { marginBottom: 4 },
  entradaData: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  separador: { height: 1, backgroundColor: colors.hairline, marginVertical: 24 },
});
