import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Button from '../../components/ui/Button';
import ScreenBackground from '../../components/ui/ScreenBackground';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';
import { webScreenFill } from '../../theme/webScreen';

type Props = { navigation: StackNavigationProp<any> };

const NATIVE = Platform.OS !== 'web';

const SLIDES = [
  {
    title: 'Entre um culto\ne outro.',
    sub: 'A fé continua além da igreja. O Grão caminha com você todos os dias.',
    dwellMs: 5500,
  },
  {
    title: 'Fale com Deus\nde onde estiver.',
    sub: 'No trabalho, no ônibus, na cozinha. Conte como está o seu coração e receba a Palavra certa para o seu dia.',
    dwellMs: 7000,
  },
  {
    title: 'A Palavra na palma\nda sua mão.',
    sub: 'No lugar que você mais conhece: o seu WhatsApp. Simples assim.',
    dwellMs: 5500,
  },
  {
    title: 'De grão em grão,\nmais perto de Deus.',
    sub: 'Uma semente por dia para você e para quem você ama. Compartilhe com sua família e seus irmãos na fé.',
    dwellMs: 0,
  },
];

export default function Intro({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const enter = useRef(new Animated.Value(1)).current;
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const playEnter = () => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  };

  useEffect(() => {
    playEnter();
  }, [index]);

  // Avança sozinho, com tempo para ler. Para na última.
  useEffect(() => {
    if (isLast) return;
    const t = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
    }, slide.dwellMs);
    return () => clearTimeout(t);
  }, [index, isLast, slide.dwellMs]);

  const goAuth = () => navigation.navigate('Auth');

  const opacity = enter.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.55, 1],
  });
  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
  });

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        <View style={styles.topbar}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((index + 1) / SLIDES.length) * 100}%` },
              ]}
            />
          </View>
          <TouchableOpacity onPress={goAuth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skip}>Pular</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stage}>
          <Animated.View
            style={{
              alignItems: 'center',
              gap: 14,
              opacity,
              transform: [{ translateY }],
              paddingHorizontal: 8,
            }}
          >
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.sub}>{slide.sub}</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          {isLast ? (
            <Button title="Vamos começar" onPress={goAuth} variant="dark" uppercase />
          ) : (
            <View style={styles.ctaPlaceholder} />
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  skip: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.gutter,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 34,
    lineHeight: 40,
    color: colors.palha,
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foregroundMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.casca20 },
  dotActive: { width: 22, backgroundColor: colors.accent },
  ctaPlaceholder: {
    height: 56,
  },
});
