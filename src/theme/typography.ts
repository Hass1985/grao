/**
 * Tipografia — Guia Visual Grão
 *
 * DM Serif Display: editorial (títulos, âncoras emocionais)
 * Manrope: interface (labels, botões, corpo de UI)
 */
export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  serifMedium: 'DMSerifDisplay_400Regular',
  serifSemi: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemi: 'Manrope_600SemiBold',
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};

export const type = {
  display: {
    fontFamily: fonts.serifMedium,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.25,
  },
  titleSm: {
    fontFamily: fonts.serifMedium,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.15,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 27,
    letterSpacing: -0.1,
  },
  bodySans: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  tab: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.15,
  },
} as const;
