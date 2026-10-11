import { Platform, ViewStyle } from 'react-native';

const deep = '#120C06';

export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: deep,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: deep,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: deep,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 28,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: deep,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
    },
  }),
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: deep,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.45,
      shadowRadius: 32,
    },
    android: { elevation: 8 },
    default: {
      shadowColor: deep,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.4,
      shadowRadius: 32,
    },
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#C07826',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#C07826',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 18,
    },
  }),
};
