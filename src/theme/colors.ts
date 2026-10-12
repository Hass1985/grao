/**
 * Design system 1.0 — planner De Grão em Grão (Guia Visual, set/2026).
 *
 * Proporção: 70% claros · 20% neutros · 10% caramelo.
 * O visual escuro anterior está em `src/theme/legado/` e na branch
 * `visual/legado-campo-escuro`.
 */
export const colors = {
  // Tokens do guia
  ivory: '#F7F1E7',
  warmWhite: '#FCFAF6',
  sand: '#E8DDCD',
  oat: '#D7C5AD',
  /** Accent do planner: marrom terra (antes caramelo). */
  caramel: '#65452F',
  caramelDark: '#4A3224',
  earth: '#65452F',
  charcoal: '#292621',
  warmGray: '#746E66',
  mist: '#A79F94',

  // Compatibilidade com o código existente (aliases semânticos)
  ambar: '#65452F',
  ambarSoft: '#65452F',
  ambar08: 'rgba(101, 69, 47, 0.14)',
  /** Texto principal e títulos (antes era creme no tema escuro). */
  palha: '#292621',
  palhaWarm: '#FCFAF6',
  casca: '#65452F',
  cascaDeep: '#F7F1E7',
  peneira: '#E8DDCD',
  peneiraSoft: 'rgba(232, 221, 205, 0.55)',
  ceu: '#3D6EBD',
  white: '#FFFFFF',

  casca80: 'rgba(101, 69, 47, 0.80)',
  casca60: 'rgba(101, 69, 47, 0.58)',
  casca50: 'rgba(101, 69, 47, 0.48)',
  casca40: 'rgba(101, 69, 47, 0.38)',
  casca20: 'rgba(101, 69, 47, 0.16)',
  casca12: 'rgba(101, 69, 47, 0.10)',
  casca08: 'rgba(101, 69, 47, 0.07)',

  background: '#F7F1E7',
  backgroundElevated: '#FCFAF6',
  surface: '#FCFAF6',
  surfaceSolid: '#FCFAF6',
  surfaceCard: '#FCFAF6',
  surfaceSeed: '#FCFAF6',
  surfaceSeedSoft: '#F7F1E7',
  surfaceSeedNight: '#F7F1E7',
  surfaceSeedNightSoft: '#E8DDCD',
  surfaceMuted: '#E8DDCD',
  surfaceSoft: '#FCFAF6',
  surfaceAccent: 'rgba(101, 69, 47, 0.12)',
  bubble: '#FCFAF6',

  foreground: '#292621',
  foregroundMuted: '#746E66',
  foregroundSubtle: '#A79F94',
  foregroundInverse: '#FCFAF6',

  accent: '#65452F',
  accentSoft: '#4A3224',
  accentForeground: '#FFFFFF',

  /** Cabeçalho escuro do shell tipo BiblicAI, em tom terra do Grão. */
  headerBrand: '#65452F',
  headerBrandSoft: '#7A5638',

  /**
   * Vermelho de ação destrutiva, legível no fundo claro.
   *
   * #C45C4A media 3,76:1 sobre o ivory e 4,05:1 sobre o warmWhite — reprovado
   * em AA nos dois, e "Sair da conta" voltava a parecer desabilitado. Este
   * mede 5,29:1 e 5,70:1, mantendo o tom terroso do guia.
   */
  perigo: '#B3392A',

  backgroundFade: 'rgba(247, 241, 231, 0)',

  border: '#E8DDCD',
  borderStrong: '#D7C5AD',
  hairline: 'rgba(215, 197, 173, 0.7)',
};
