import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
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

const SLIDES = [
  {
    title: 'Entre um culto\ne outro.',
    sub: 'A fé continua além da igreja. O Grão caminha com você todos os dias.',
  },
  {
    title: 'Fale com Deus\nde onde estiver.',
    sub: 'No trabalho, no ônibus, na cozinha. Conte como está o seu coração e receba a Palavra certa para o seu dia.',
  },
  {
    title: 'A Palavra na palma\nda sua mão.',
    sub: 'No lugar que você mais conhece: o seu WhatsApp. Simples assim.',
  },
  {
    title: 'De grão em grão,\nmais perto de Deus.',
    sub: 'Uma semente por dia para você e para quem você ama. Compartilhe com sua família e seus irmãos na fé.',
  },
];

export default function Intro({ navigation }: Props) {
  const win = Dimensions.get('window');
  const [w, setW] = useState(win.width);
  const [scrollH, setScrollH] = useState(0);
  const [index, setIndex] = useState(0);
  const scRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / w);
        if (i !== index && i >= 0 && i < SLIDES.length) setIndex(i);
      },
    }
  );

  const goAuth = () => navigation.navigate('Auth');
  const next = () => {
    if (index < SLIDES.length - 1) {
      const nextIndex = index + 1;
      scRef.current?.scrollTo({ x: nextIndex * w, animated: true });
      setIndex(nextIndex);
    } else {
      goAuth();
    }
  };

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView
        style={styles.container}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
      >
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

        <Animated.ScrollView
          ref={scRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(e) => setScrollH(e.nativeEvent.layout.height)}
          style={styles.scroll}
        >
          {SLIDES.map((sl, i) => {
            const rel =
              w > 0
                ? scrollX.interpolate({
                    inputRange: [(i - 1) * w, i * w, (i + 1) * w],
                    outputRange: [-1, 0, 1],
                    extrapolate: 'clamp',
                  })
                : new Animated.Value(0);
            const opacity = rel.interpolate({
              inputRange: [-1, -0.35, 0, 0.35, 1],
              outputRange: [0.2, 0.75, 1, 0.75, 0.2],
            });
            const translateY = rel.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [28, 0, 28],
            });
            const scale = rel.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.96, 1, 0.96],
            });
            return (
              <View key={i} style={[styles.page, { width: w, height: scrollH || undefined }]}>
                <Animated.View
                  style={{
                    alignItems: 'center',
                    gap: 14,
                    opacity,
                    transform: [{ translateY }, { scale }],
                    paddingHorizontal: 8,
                  }}
                >
                  <Text style={styles.title}>{sl.title}</Text>
                  <Text style={styles.sub}>{sl.sub}</Text>
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button
            title={index === SLIDES.length - 1 ? 'Vamos começar' : 'Continuar'}
            onPress={next}
            variant="dark"
            uppercase
          />
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
    zIndex: 2,
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
  scroll: { flex: 1 },
  page: {
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
    zIndex: 2,
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
});
