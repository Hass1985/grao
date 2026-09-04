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

type Variant = 'primary' | 'ghost' | 'soft';
type Size = 'md' | 'sm';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: Variant;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  title,
  onPress,
  disabled,
  testID,
  variant = 'primary',
  size = 'md',
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
  const isSoft = variant === 'soft';
  const isGhost = variant === 'ghost';

  const fillSize = compact ? styles.fillSm : styles.fillMd;
  const labelSize = compact ? styles.labelSm : styles.labelMd;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style as any]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed, hovered }: any) => [
          styles.hit,
          pressed && !disabled && styles.pressed,
          hovered && isPrimary && !disabled && styles.hovered,
        ]}
      >
        {isPrimary && !disabled ? (
          <View style={styles.primaryShell}>
            <LinearGradient
              colors={['#D4924A', '#C07826', '#A8651C']}
              locations={[0, 0.45, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[styles.primaryFill, fillSize]}
            >
              <View style={styles.sheen} pointerEvents="none" />
              <Text style={[styles.label, styles.labelPrimary, labelSize]}>{title}</Text>
            </LinearGradient>
          </View>
        ) : (
          <View
            style={[
              styles.base,
              fillSize,
              isSoft && styles.soft,
              isGhost && styles.ghost,
              disabled && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.label,
                labelSize,
                (isSoft || isGhost) && styles.labelMuted,
                disabled && styles.labelDisabled,
              ]}
            >
              {title}
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
  hovered: {
    opacity: 0.97,
  },
  primaryShell: {
    borderRadius: radius.pill,
    ...Platform.select({
      ios: {
        shadowColor: '#8B4E12',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.32,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {
        shadowColor: '#8B4E12',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
      },
    }),
  },
  primaryFill: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  fillMd: {
    minHeight: 58,
    paddingVertical: 18,
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
  soft: {
    backgroundColor: colors.surfaceSoft,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: colors.peneira,
  },
  label: {
    fontFamily: fonts.sansSemi,
    letterSpacing: 0.3,
  },
  labelMd: {
    fontSize: 16,
  },
  labelSm: {
    fontSize: 15,
  },
  labelPrimary: {
    color: colors.accentForeground,
    textShadowColor: 'rgba(59, 34, 8, 0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  labelMuted: {
    color: colors.foreground,
    fontFamily: fonts.sansMedium,
  },
  labelDisabled: {
    color: colors.foregroundSubtle,
  },
});
