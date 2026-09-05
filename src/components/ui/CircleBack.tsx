import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Voltar circular — contraste no fundo escuro do site. */
export default function CircleBack({ onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }, style]}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <ChevronLeft size={22} color={colors.palha} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(247, 240, 226, 0.12)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.sm as object),
  },
});
