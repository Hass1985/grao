import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import GraoSymbol from '../GraoSymbol';
import { colors } from '../../theme/colors';
import { logoSize, logoSlot } from '../../theme/spacing';

type Props = {
  onPress: () => void;
};

/** Voltar com o logo Grão — mesmo slot/tamanho do AppHeader. */
export default function BackButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.hit, pressed && { opacity: 0.55 }]}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <GraoSymbol size={logoSize} color={colors.accent} filled={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: logoSlot,
    height: logoSlot,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
