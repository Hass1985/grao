import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { colors } from './colors';

/** Glass do Hoje: marrom claro translúcido, borda peneira, blur suave. */
export const glassBlur: ViewStyle =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(26px)', WebkitBackdropFilter: 'blur(26px)' } as ViewStyle)
    : {};

export const glassCard: ViewStyle = {
  backgroundColor: colors.surface,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  ...glassBlur,
};
