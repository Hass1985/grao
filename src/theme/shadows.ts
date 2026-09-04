import { Platform, ViewStyle } from 'react-native';

const warm = '#3B2208';

export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    android: { elevation: 1 },
    default: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 28,
    },
    android: { elevation: 3 },
    default: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 28,
    },
  }),
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.10,
      shadowRadius: 32,
    },
    android: { elevation: 8 },
    default: {
      shadowColor: warm,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.09,
      shadowRadius: 32,
    },
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#C07826',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#C07826',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
    },
  }),
};
