import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { Mic, MessageCircle, Sprout, Smartphone } from '../components/icons';
import Button from '../components/ui/Button';
import CircleBack from '../components/ui/CircleBack';
import ScreenBackground from '../components/ui/ScreenBackground';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';
import { motion } from '../theme/motion';
import { webScreenFill } from '../theme/webScreen';

type Props = { navigation: any };

const NATIVE = Platform.OS !== 'web';

const STEPS = [
  {
    icon: 'mic' as const,
    eyebrow: 'Passo 1',
    title: 'Conte o seu\nmomento.',
    body: 'Em áudio ou por escrito. Como está o seu coração hoje, sem filtro e sem pressa.',
  },
  {
    icon: 'heart' as const,
    eyebrow: 'Passo 2',
    title: 'O Grão escuta\ncom cuidado.',
    body: 'A partir do que você compartilha, entendemos o momento emocional e escolhemos a Palavra certa para o seu dia.',
  },
  {
    icon: 'sprout' as const,
    eyebrow: 'Passo 3',
    title: 'A semente chega\nno app.',
    body: 'Reflexão, oração, prática e louvor, feitos para você. Não é o mesmo texto para todo mundo.',
  },
  {
    icon: 'whatsapp' as const,
    eyebrow: 'Passo 4',
    title: 'E também no\nWhatsApp.',
    body: 'No horário que você escolher. Um toque em Plantar e a semente fica guardada no seu Campo.',
  },
  {
    icon: 'path' as const,
    eyebrow: 'Plantio',
    title: 'Alguém que caminha\nao seu lado.',
    body: 'De grão em grão, um acompanhamento personalizado. Do culto para a semana inteira, com você.',
  },
];

function StepIcon({ name }: { name: (typeof STEPS)[number]['icon'] }) {
  const color = colors.ambarSoft;
  const size = 28;
  if (name === 'mic') return <Mic size={size} color={color} strokeWidth={1.8} />;
  if (name === 'sprout') return <Sprout size={size} color={color} strokeWidth={1.8} />;
  if (name === 'whatsapp') return <MessageCircle size={size} color={color} strokeWidth={1.8} />;
  if (name === 'path') return <Smartphone size={size} color={color} strokeWidth={1.8} />;
  return (
    <View style={styles.hearDots}>
      <View style={styles.hearDot} />
      <View style={[styles.hearDot, styles.hearDotMid]} />
      <View style={styles.hearDot} />
    </View>
  );
}

export default function Plantio({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  /** Quem tocou assume o comando: a apresentação para de andar sozinha. */
  const [manual, setManual] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const isLast = index === STEPS.length - 1;
  const step = STEPS[index];

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
        setIndex((i) => Math.min(i + 1, STEPS.length - 1));
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
    setIndex(Math.max(0, Math.min(i, STEPS.length - 1)));
  };

  /**
   * O fim da explicação leva ao começo do teste.
   *
   * Antes este botão abria uma simulação: a pessoa via uma semente paga de
   * mentira e voltava para o mesmo lugar de onde saiu, sem nada ter mudado.
   * Servia para mostrar o produto a quem ainda não existia como cliente — e
   * era exatamente o que sobrava de andaime depois que o produto ficou pronto.
   *
   * Agora leva à tela de pagamento com 7 dias grátis: o mesmo toque, no mesmo
   * lugar, mas o que acontece depois dele é real.
   */
  const abrirAssinatura = () => {
    if (typeof navigation.push === 'function') {
      navigation.push('Assinar');
      return;
    }
    navigation.navigate('Assinar');
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
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        {/* A barra de progresso saiu daqui: os pontos do rodapé já dizem em
            que passo a pessoa está, e dois indicadores do mesmo estado na
            mesma tela fazem procurar diferença onde não existe. */}
        <View style={styles.topbar}>
          <CircleBack onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.stage}>
          <View style={styles.toques} pointerEvents="box-none">
            <Pressable
              style={styles.toque}
              onPress={() => irPara(index - 1)}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Passo anterior"
            />
            <Pressable
              style={styles.toque}
              onPress={() => irPara(index + 1)}
              disabled={isLast}
              accessibilityRole="button"
              accessibilityLabel="Próximo passo"
            />
          </View>
          <Animated.View
            style={[
              styles.card,
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.iconWrap}>
              <StepIcon name={step.icon} />
            </View>
            <Text style={styles.eyebrow}>{step.eyebrow}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => irPara(i)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Ir para o passo ${i + 1} de ${STEPS.length}`}
                accessibilityState={{ selected: i === index }}
              >
                <View style={[styles.dot, i === index && styles.dotActive]} />
              </Pressable>
            ))}
          </View>

          {isLast ? (
            <>
              <Button
                title="Testar trial de 7 dias"
                onPress={abrirAssinatura}
                variant="dark"
                uppercase
              />
              {/* O atalho para a semente de teste saiu daqui junto com o fluxo
                  simulado: ele levava a uma tela que só existe enquanto o
                  produto pago é encenado. */}
              <Button
                title="Ver exemplo no WhatsApp"
                onPress={() => navigation.navigate('WhatsAppDemo')}
                variant="soft"
                uppercase
                style={styles.secondBtn}
              />
              <Pressable onPress={() => navigation.goBack()} style={styles.softLink} hitSlop={8}>
                <Text style={styles.softLinkText}>Voltar ao devocional</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.ctaPlaceholder} />
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 8,
  },
  toques: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  toque: { flex: 1 },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.gutter,
  },
  card: {
    ...glassCard,
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(192, 120, 38, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hearDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hearDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.ambarSoft,
    opacity: 0.55,
  },
  hearDotMid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 1,
  },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 30,
    lineHeight: 36,
    color: colors.palha,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foregroundMuted,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 36,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(251, 246, 236, 0.38)' },
  dotActive: { width: 22, backgroundColor: colors.accent },
  ctaPlaceholder: { height: 120 },
  secondBtn: {
    marginTop: 12,
  },
  softLink: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  softLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
});
