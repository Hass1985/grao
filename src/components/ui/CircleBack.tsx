import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { ChevronLeft } from '../icons';
import { colors } from '../../theme/colors';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Voltar circular, discreto no fundo ivory. */
export default function CircleBack({ onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }, style]}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <ChevronLeft size={22} color={colors.charcoal} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.warmWhite,
    borderWidth: 1,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
