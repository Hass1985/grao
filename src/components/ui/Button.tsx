import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  View,
  ViewStyle,
  StyleProp,
  Animated,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/radius';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'soft';
type Size = 'md' | 'sm';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: Variant;
  size?: Size;
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** CTA do planner: um accent caramelo, raio confortável, sem brilho pesado. */
export default function Button({
  title,
  onPress,
  disabled,
  testID,
  variant = 'primary',
  size = 'md',
  uppercase = false,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const compact = size === 'sm';

  const pressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: Platform.OS !== 'web',
      friction: 6,
      tension: 240,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      friction: 5,
      tension: 180,
    }).start();
  };

  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';
  const isOutline = variant === 'outline';
  const isSoft = variant === 'soft';
  const isGhost = variant === 'ghost';
  const labelClara = (isPrimary || isDark) && !disabled;

  const fillSize = compact ? styles.fillSm : styles.fillMd;
  const labelSize = compact ? styles.labelSm : styles.labelMd;
  const label = uppercase ? title.toUpperCase() : title;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style as any]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [
          styles.hit,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.base,
            fillSize,
            isPrimary && !disabled && styles.primary,
            isDark && !disabled && styles.dark,
            isOutline && styles.outline,
            isSoft && styles.soft,
            isGhost && styles.ghost,
            disabled && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.label,
              labelSize,
              uppercase && styles.labelCaps,
              labelClara && styles.labelOnPrimary,
              isOutline && styles.labelOutline,
              (isSoft || isGhost) && styles.labelMuted,
              disabled && styles.labelDisabled,
            ]}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hit: {
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.92,
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  primary: {
    backgroundColor: colors.earth,
  },
  dark: {
    backgroundColor: colors.earth,
  },
  outline: {
    backgroundColor: colors.warmWhite,
    borderWidth: 1.5,
    borderColor: colors.oat,
  },
  soft: {
    backgroundColor: colors.sand,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: colors.sand,
  },
  fillMd: {
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 26,
  },
  fillSm: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: fonts.sansSemi,
    letterSpacing: 0.2,
  },
  labelCaps: {
    letterSpacing: 0.7,
    fontSize: 13,
  },
  labelMd: {
    fontSize: 16,
  },
  labelSm: {
    fontSize: 15,
  },
  labelOnPrimary: {
    color: colors.accentForeground,
  },
  labelOutline: {
    color: colors.earth,
  },
  labelMuted: {
    color: colors.earth,
    fontFamily: fonts.sansMedium,
  },
  labelDisabled: {
    color: colors.mist,
  },
});
