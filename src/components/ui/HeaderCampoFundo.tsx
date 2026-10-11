// Fundo do cabeçalho das telas principais: foto do campo recortada no pé
// (céu + trigo) com véu escuro por cima.

import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  SafeAreaView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { space } from '../../theme/spacing';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Respiro inferior do bloco (antes do sheet). */
  paddingBottom?: number;
};

export default function HeaderCampoFundo({
  children,
  style,
  paddingBottom = 28,
}: Props) {
  return (
    <View style={[styles.headerBrand, { paddingBottom }, style]}>
      <Image
        source={require('../../../assets/campo-trigo.jpg')}
        style={styles.headerBg}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <LinearGradient
        colors={[
          'rgba(36, 23, 8, 0.42)',
          'rgba(36, 23, 8, 0.62)',
          'rgba(36, 23, 8, 0.82)',
        ]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    backgroundColor: '#241708',
    paddingHorizontal: space.gutter,
    overflow: 'hidden',
    position: 'relative',
  },
  // Altura maior + bottom 0: recorte com campo e uma faixa de céu.
  headerBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '165%',
  },
});
