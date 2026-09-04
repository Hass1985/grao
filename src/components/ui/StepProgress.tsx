import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';

type Props = {
  step: number;
  total?: number;
};

/**
 * Progresso do onboarding — trilho fino contínuo com preenchimento âmbar.
 * Gutter interno alinha as bordas com o logo (space.gutter).
 */
export default function StepProgress({ step, total = 6 }: Props) {
  const insets = useSafeAreaInsets();
  const t = Math.max(total, 1);
  const filled = Math.min(Math.max(step, 0), t);
  const ratio = filled / t;

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 12) + 8 : 12;

  return (
    <View
      style={[styles.wrap, { paddingTop: topPad }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: t, now: filled }}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
  },
  track: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.casca12,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
