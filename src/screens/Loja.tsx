import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Sprout } from '../components/icons';
import ProfileButton from '../components/ProfileButton';
import HeaderCampoFundo from '../components/ui/HeaderCampoFundo';
import HeaderGamificacao from '../components/ui/HeaderGamificacao';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import { meusGraos, type ResumoGraos } from '../onboarding/graos';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { glassCard } from '../theme/glass';

const FUNDO_SHEET = '#F4F4F4';

/**
 * A Loja, ainda em construção.
 *
 * Mostra o saldo de grãos e explica como eles se acumulam até a loja abrir.
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <HeaderCampoFundo paddingBottom={22}>
          <View style={styles.headerTop}>
            <ProfileButton onPress={() => navigation.navigate('Settings')} size={36} />
            <Text style={styles.headerTitulo} numberOfLines={1}>Loja</Text>
            <HeaderGamificacao
              navigation={navigation}
              sequencia={graos?.sequencia ?? 0}
            />
          </View>
      </HeaderCampoFundo>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.saldoCard}>
            <View style={styles.saldoTopo}>
              <Sprout size={18} color={colors.earth} strokeWidth={2.3} fill={colors.ambar08} />
              <Text style={styles.saldoRotulo}>Seus grãos</Text>
            </View>
            <Text style={styles.saldoValor}>{graos ? graos.saldo : '·'}</Text>
            <Text style={styles.saldoApoio}>
              Guardados desde o seu primeiro dia. Nada aqui expira.
            </Text>
          </View>

          <View style={styles.obra}>
            <Text style={styles.obraTitulo}>A Loja do Grão está chegando!</Text>
            <Text style={styles.obraTexto}>
              Você ganha grãos ao confirmar sua leitura do dia, plantar sua semente
              ou convidar alguém que aceite seu convite.
            </Text>
            <Text style={styles.obraTexto}>
              Em breve, poderá trocar seus grãos por{' '}
              <Text style={styles.obraForte}>descontos em produtos e outras novidades!</Text>
            </Text>
            <Text style={styles.obraTexto}>
              Enquanto isso, continue acumulando! Seus grãos ficam guardados, não
              vencem e poderão ser usados quando a Loja abrir.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241708' },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.warmWhite,
  },
  sheet: {
    flex: 1,
    marginTop: -16,
    backgroundColor: FUNDO_SHEET,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 22,
  },
  saldoCard: {
    ...glassCard,
    alignSelf: 'flex-start',
    width: '68%',
    maxWidth: 240,
    borderRadius: 28,
    padding: 24,
    ...(shadows.sm as object),
  },
  saldoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  saldoRotulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.earth,
  },
  saldoValor: {
    fontFamily: fonts.serifMedium,
    fontSize: 52,
    lineHeight: 56,
    color: colors.earth,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  saldoApoio: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: colors.mist,
    marginTop: 10,
  },
  obra: { marginTop: 28 },
  obraTitulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 26,
    lineHeight: 32,
    color: colors.earth,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  obraTexto: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 26,
    color: colors.warmGray,
    marginBottom: 14,
  },
  obraForte: {
    fontFamily: fonts.sansSemi,
    color: colors.earth,
  },
});
