import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Esconde a foto de fundo (ex.: modais densos). */
  plain?: boolean;
};

/**
 * Fundo oficial do Grão — campo de trigo com véu leve,
 * para o dourado do campo aparecer sem pesar a tela.
 */
export default function ScreenBackground({ children, style, plain = false }: Props) {
  if (plain) {
    return <View style={[styles.root, styles.plain, style]}>{children}</View>;
  }

  return (
    <View style={[styles.root, style]}>
      <ImageBackground
        source={require('../../../assets/campo-trigo.jpg')}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(36, 23, 8, 0.35)',
            'rgba(36, 23, 8, 0.55)',
            'rgba(36, 23, 8, 0.78)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cascaDeep,
    overflow: 'hidden',
  },
  plain: {
    backgroundColor: colors.cascaDeep,
  },
  image: {
    // Enquadra o campo como no site
    transform: [{ scale: 1.08 }],
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
