import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Sprout } from '../components/icons';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import { meusGraos, type ResumoGraos } from '../onboarding/graos';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { glassCard } from '../theme/glass';

/**
 * A Loja, ainda em construção.
 *
 * Mostra o saldo de grãos mesmo sem ter o que vender, e essa é a razão de a
 * tela existir agora: sem um destino, grão é número solto na tela do Campo.
 * Vendo o saldo aqui, a pessoa entende que está juntando para alguma coisa —
 * e é isso que faz o número valer antes de a loja abrir.
 */
export default function Loja({ navigation }: { navigation: any }) {
  const [graos, setGraos] = useState<ResumoGraos | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      meusGraos().then((r) => { if (vivo) setGraos(r); });
      return () => { vivo = false; };
    }, [])
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Loja"
            subtitle="Em breve."
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          <View style={styles.saldoCard}>
            <View style={styles.saldoTopo}>
              <Sprout size={18} color={colors.accent} strokeWidth={2.3} fill={colors.ambar08} />
              <Text style={styles.saldoRotulo}>Seus grãos</Text>
            </View>
            <Text style={styles.saldoValor}>{graos ? graos.saldo : '—'}</Text>
            <Text style={styles.saldoApoio}>
              Guardados desde o seu primeiro dia. Nada aqui expira.
            </Text>
          </View>

          <View style={styles.obra}>
            <Text style={styles.obraTitulo}>Estamos construindo esta parte.</Text>
            <Text style={styles.obraTexto}>
              A Loja é onde os seus grãos vão virar alguma coisa. Ainda estamos
              decidindo o quê, com calma, porque não queremos encher esta tela de
              enfeite — o que estiver aqui precisa valer a caminhada que te trouxe
              até ele.
            </Text>
            <Text style={styles.obraTexto}>
              Enquanto isso, continue juntando. Cada leitura confirmada, cada
              semente plantada e cada convite aceito somam — e vão continuar
              valendo quando a Loja abrir.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter },

  saldoCard: {
    ...glassCard,
    borderRadius: 28,
    padding: 24,
    marginTop: 16,
    ...(shadows.sm as object),
  },
  saldoTopo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  saldoRotulo: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.3,
    textTransform: 'uppercase', color: colors.ambarSoft,
  },
  saldoValor: {
    fontFamily: fonts.serifMedium, fontSize: 52, lineHeight: 56,
    color: colors.palha, letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  saldoApoio: {
    fontFamily: fonts.sans, fontSize: fontSizes.sm, lineHeight: 21,
    color: colors.foregroundSubtle, marginTop: 10,
  },

  obra: { marginTop: 30 },
  obraTitulo: {
    fontFamily: fonts.serifMedium, fontSize: 26, lineHeight: 32,
    color: colors.palha, letterSpacing: -0.4, marginBottom: 14,
  },
  obraTexto: {
    fontFamily: fonts.sans, fontSize: fontSizes.base, lineHeight: 26,
    color: colors.foregroundMuted, marginBottom: 14,
  },
});
