import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import FamilyIcon from './FamilyIcon';
import { emotionalFamilies, EmotionalFamily } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

type Props = {
  onSelect: (family: EmotionalFamily) => void;
  selected?: EmotionalFamily | null;
};

const NATIVE = Platform.OS !== 'web';

function EmotionCard({
  id,
  label,
  selected,
  onPress,
}: {
  id: EmotionalFamily;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!selected) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [selected, pulse]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <FamilyIcon family={id} size={30} color={selected ? colors.accent : colors.foreground} />
      </Animated.View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function EmotionPicker({ onSelect, selected = null }: Props) {
  return (
    <FlatList
      data={emotionalFamilies}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <EmotionCard
          id={item.id}
          label={item.label}
          selected={selected === item.id}
          onPress={() => onSelect(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 14,
  },
  row: {
    gap: 14,
  },
  card: {
    flex: 1,
    minHeight: 148,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.xl,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cardSelected: {
    backgroundColor: colors.surface,
    ...(shadows.md as object),
  },
  label: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.accent,
    fontFamily: fonts.serifMedium,
  },
});
