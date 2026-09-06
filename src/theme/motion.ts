import { Easing } from 'react-native';

/**
 * Ritmo único de movimento no app.
 * Dwell começa depois da animação de entrada (não soma os dois às cegas).
 */
export const motion = {
  /** Splash Welcome → Intro */
  splashMs: 2200,
  /** Tempo de leitura em slides automáticos (Intro, Plantio) */
  slideDwellMs: 4000,
  /** Fade/sobe ao trocar slide interno */
  enterMs: 480,
  enterRise: 22,
  /** Stack navigate (tela → tela) */
  stackOpenMs: 300,
  stackCloseMs: 260,
  easingOut: Easing.out(Easing.cubic),
  easingIn: Easing.in(Easing.cubic),
} as const;
