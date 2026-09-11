import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Button from '../../components/ui/Button';
import ScreenBackground from '../../components/ui/ScreenBackground';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { space } from '../../theme/spacing';
import { motion } from '../../theme/motion';
import { webScreenFill } from '../../theme/webScreen';

type Props = { navigation: StackNavigationProp<any> };

const NATIVE = Platform.OS !== 'web';

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
  const [index, setIndex] = useState(0);
  /**
   * Quem tocou assumiu o comando.
   *
   * Um carrossel que continua andando sozinho depois que a pessoa voltou uma
   * tela briga com ela: ela toca para reler, e a apresentação arrasta de novo
   * para a frente. A partir do primeiro toque, só ela decide.
   */
  const [manual, setManual] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  useEffect(() => {
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    enter.setValue(0);
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: motion.enterMs,
      easing: motion.easingOut,
      useNativeDriver: NATIVE,
    });
    anim.start(({ finished }) => {
      if (cancelled || !finished || isLast || manual) return;
      dwellTimer = setTimeout(() => {
        setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      }, motion.slideDwellMs);
    });
    return () => {
      cancelled = true;
      anim.stop();
      if (dwellTimer) clearTimeout(dwellTimer);
    };
  }, [index, isLast, manual, enter]);

  const irPara = (i: number) => {
    setManual(true);
    setIndex(Math.max(0, Math.min(i, SLIDES.length - 1)));
  };

  const goAuth = () => navigation.navigate('Auth');

  const opacity = enter.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 1],
  });
  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.enterRise, 0],
  });

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        {/* A barra de progresso do topo saiu: os pontos embaixo já contam a
            mesma coisa, e dois indicadores do mesmo estado na mesma tela fazem
            a pessoa procurar a diferença entre eles. */}
        <View style={styles.topbar}>
          <TouchableOpacity onPress={goAuth} hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}>
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

          {/* Metade esquerda volta, metade direita avança — o gesto que todo
              mundo já conhece de story. Fica por cima do texto e por baixo dos
              pontos e do botão, para não roubar o toque de nenhum dos dois. */}
          <View style={styles.toques} pointerEvents="box-none">
            <Pressable
              style={styles.toque}
              onPress={() => irPara(index - 1)}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Tela anterior"
            />
            <Pressable
              style={styles.toque}
              onPress={() => irPara(index + 1)}
              disabled={isLast}
              accessibilityRole="button"
              accessibilityLabel="Próxima tela"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => irPara(i)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Ir para a tela ${i + 1} de ${SLIDES.length}`}
                accessibilityState={{ selected: i === index }}
              >
                <View style={[styles.dot, i === index && styles.dotActive]} />
              </Pressable>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 14,
    paddingBottom: 8,
  },
  skip: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  toques: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  toque: { flex: 1 },
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
