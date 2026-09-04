import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Fundo creme limpo — estilo Pi: sem vinheta, sem glow. */
export default function ScreenBackground({ children, style }: Props) {
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
