import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
            {/* Sem título aqui: ele desceu para a folha, onde tem tamanho de
                página. No cabeçalho sobram o avatar e a contagem de grãos. */}
            <View style={styles.headerVazio} />
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
          <Text style={styles.heroTitle}>Loja</Text>

          {/* O card de saldo saiu: o número já está no cabeçalho, a um palmo
              daqui. Dizer a mesma coisa duas vezes na mesma tela não reforça,
              divide a atenção — e empurrava para baixo o texto que explica
              como os grãos funcionam, que é a única coisa nova desta tela
              enquanto a Loja não abre. */}
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
  headerVazio: { flex: 1 },
  heroTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.earth,
    letterSpacing: -0.4,
    marginBottom: 16,
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
