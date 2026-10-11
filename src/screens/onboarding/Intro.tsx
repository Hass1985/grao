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
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';
import { motion } from '../../theme/motion';
import { webScreenFill } from '../../theme/webScreen';
import { marcarApresentacaoVista } from '../../onboarding/authFlow';
import { setDevocionalOptIn } from '../../onboarding/userProfile';

type Props = {
  navigation: StackNavigationProp<any>;
  /** Mantido pela pilha; o fim do fluxo sai por CodigoIndicacao / ComoChamar. */
  onFinish?: () => void;
};

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
  const [fechando, setFechando] = useState(false);
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

  /** Fim da apresentação: código de indicação, depois nome (se faltar) e Hoje. */
  const concluir = async () => {
    if (fechando) return;
    setFechando(true);
    try {
      await marcarApresentacaoVista();
      await setDevocionalOptIn(true);
      navigation.replace('CodigoIndicacao');
    } finally {
      setFechando(false);
    }
  };

  const opacity = enter.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 1],
  });
  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.enterRise, 0],
  });

  return (
    <View style={[styles.root, webScreenFill]}>
      <ImageBackground
        source={require('../../../assets/campo-trigo.jpg')}
        style={styles.bg}
        imageStyle={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(36,23,8,0.55)', 'rgba(28,18,6,0.78)', 'rgba(36,23,8,0.94)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <View style={styles.topbar}>
          <TouchableOpacity
            onPress={concluir}
            disabled={fechando}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
          >
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
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Ir para a tela ${i + 1} de ${SLIDES.length}`}
                accessibilityState={{ selected: i === index }}
              >
                <View style={[styles.dot, i === index && styles.dotActive]} />
              </Pressable>
            ))}
          </View>
          {isLast ? (
            <Pressable
              onPress={concluir}
              disabled={fechando}
              style={({ pressed }) => [
                styles.ctaPreto,
                (pressed || fechando) && { opacity: 0.92 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Vamos começar"
            >
              <Text style={styles.ctaPretoTexto}>VAMOS COMEÇAR</Text>
            </Pressable>
          ) : (
            <View style={styles.ctaPlaceholder} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#241708',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    transform: [{ scale: 1.12 }],
  },
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
    color: 'rgba(252, 250, 246, 0.78)',
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
    color: colors.warmWhite,
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(252, 250, 246, 0.82)',
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
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(252, 250, 246, 0.35)' },
  dotActive: { width: 22, backgroundColor: colors.warmWhite },
  ctaPreto: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 26,
  },
  ctaPretoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    letterSpacing: 0.7,
    color: colors.warmWhite,
  },
  ctaPlaceholder: {
    height: 56,
  },
});
