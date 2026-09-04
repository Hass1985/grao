import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle, Platform } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Re-dispara a animação quando a chave muda (ex.: id da semente). */
  triggerKey?: string | number;
  delay?: number;
  duration?: number;
  rise?: number;
  style?: StyleProp<ViewStyle>;
};

const NATIVE = Platform.OS !== 'web';

/** Fade-in + sobe suavemente — revelação calma da Palavra. */
export default function Reveal({
  children,
  triggerKey = 'default',
  delay = 0,
  duration = 720,
  rise = 18,
  style,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
  }, [triggerKey, delay, duration, progress]);

  const opacity = progress;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [rise, 0],
  });

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
