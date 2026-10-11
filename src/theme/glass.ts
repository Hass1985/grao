import { StyleSheet, ViewStyle } from 'react-native';
import { colors } from './colors';

/** Cards do planner: superfície clara, borda Sand, sem vidro pesado. */
export const glassBlur: ViewStyle = {};

export const glassCard: ViewStyle = {
  backgroundColor: colors.warmWhite,
  borderWidth: 1,
  borderColor: colors.sand,
};
