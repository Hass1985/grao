/**
 * Tipografia Grão
 *
 * Newsreader — voz editorial (títulos, oração, versículo)
 * DM Sans — interface (labels, meta, botões, tabs)
 *
 * Regra: serif carrega significado; sans carrega navegação.
 */
export const fonts = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemi: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemi: 'DMSans_600SemiBold',
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

/** Escala semântica — use quando quiser ritmo tipográfico consistente. */
export const type = {
  display: {
    fontFamily: fonts.serifMedium,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.35,
  },
  titleSm: {
    fontFamily: fonts.serifMedium,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.25,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
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
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
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
