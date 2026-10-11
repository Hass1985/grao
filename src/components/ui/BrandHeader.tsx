// Cabeçalho de marca compartilhado: foto do campo, símbolo e frase hero.
// Usado no fluxo Plantio → Assinar → WhatsApp → Momento.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from '../icons';
import GraoSymbol from '../GraoSymbol';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { space } from '../../theme/spacing';

type Props = {
  onClose: () => void;
  titulo?: string;
};

export default function BrandHeader({
  onClose,
  titulo = 'Desbloqueie sua jornada com Deus, guiada pela Palavra.',
}: Props) {
  return (
    <ImageBackground
      source={require('../../../assets/campo-trigo.jpg')}
      style={styles.headerBrand}
      imageStyle={styles.headerImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[
          'rgba(36, 23, 8, 0.42)',
          'rgba(36, 23, 8, 0.62)',
          'rgba(36, 23, 8, 0.82)',
        ]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView>
        <View style={styles.topbar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
            <X size={22} color={colors.warmWhite} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.brandBlock}>
          <GraoSymbol size={48} color={colors.warmWhite} filled={false} />
          <Text style={styles.tituloHero}>{titulo}</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    backgroundColor: '#241708',
    paddingHorizontal: space.gutter,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  headerImage: {
    transform: [{ scale: 1.08 }],
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  tituloHero: {
    fontFamily: fonts.sansSemi,
    fontSize: 20,
    lineHeight: 28,
    color: colors.warmWhite,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
