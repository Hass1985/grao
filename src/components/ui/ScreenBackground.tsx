import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Mantido por compatibilidade: no tema claro o fundo já é plano. */
  plain?: boolean;
};

/**
 * Fundo Ivory do planner. Foto de campo só em momentos hero (Welcome),
 * não atrás de todo o conteúdo.
 */
export default function ScreenBackground({ children, style }: Props) {
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
});
