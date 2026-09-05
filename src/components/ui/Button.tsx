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
import { LinearGradient } from 'expo-linear-gradient';
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
  /** Estilo Glorify: rótulo em caixa alta. */
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
};

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
      toValue: 0.97,
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
        {isPrimary && !disabled ? (
          <View style={styles.primaryShell}>
            <LinearGradient
              colors={['#F0A53A', '#E0891A', '#C46E10']}
              locations={[0, 0.45, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[styles.primaryFill, fillSize]}
            >
              <View style={styles.sheen} pointerEvents="none" />
              <Text
                style={[
                  styles.label,
                  styles.labelPrimary,
                  labelSize,
                  uppercase && styles.labelCaps,
                ]}
              >
                {label}
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <View
            style={[
              styles.base,
              fillSize,
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
                isDark && !disabled && styles.labelOnDark,
                isOutline && styles.labelOutline,
                (isSoft || isGhost) && styles.labelMuted,
                disabled && styles.labelDisabled,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hit: {
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.94,
  },
  primaryShell: {
    borderRadius: radius.pill,
    ...Platform.select({
      ios: {
        shadowColor: '#C46E10',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: '#C46E10',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
      },
    }),
  },
  primaryFill: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fillMd: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  fillSm: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: '46%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  dark: {
    backgroundColor: '#0A0704',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.palha,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: 'rgba(247, 240, 226, 0.22)',
  },
  label: {
    fontFamily: fonts.sansSemi,
    letterSpacing: 0.2,
  },
  labelCaps: {
    letterSpacing: 0.8,
    fontSize: 13,
  },
  labelMd: {
    fontSize: 16,
  },
  labelSm: {
    fontSize: 15,
  },
  labelPrimary: {
    color: colors.accentForeground,
  },
  labelOnDark: {
    color: colors.palha,
  },
  labelOutline: {
    color: colors.palha,
  },
  labelMuted: {
    color: colors.palha,
    fontFamily: fonts.sansMedium,
  },
  labelDisabled: {
    color: colors.foregroundSubtle,
  },
});
