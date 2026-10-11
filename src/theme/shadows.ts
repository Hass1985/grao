import { Platform, ViewStyle } from 'react-native';

/** Sombras mínimas: o guia pede quase imperceptíveis. */
const warm = '#65452F';

export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 1 },
    default: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 16,
    },
  }),
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: { elevation: 3 },
    default: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.09,
      shadowRadius: 20,
    },
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#B47735',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: '#B47735',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
    },
  }),
};
