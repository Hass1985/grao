import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Platform,
  Pressable,
} from 'react-native';
import { Mic, MessageCircle, Sprout, Smartphone } from 'lucide-react-native';
import Button from '../components/ui/Button';
import CircleBack from '../components/ui/CircleBack';
import ScreenBackground from '../components/ui/ScreenBackground';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';
import { webScreenFill } from '../theme/webScreen';

type Props = { navigation: any };

const NATIVE = Platform.OS !== 'web';

const STEPS = [
  {
    icon: 'mic' as const,
    eyebrow: 'Passo 1',
    title: 'Conte o seu\nmomento.',
    body: 'Em áudio ou por escrito. Como está o seu coração hoje, sem filtro e sem pressa.',
    dwellMs: 5500,
  },
  {
    icon: 'heart' as const,
    eyebrow: 'Passo 2',
    title: 'O Grão escuta\ncom cuidado.',
    body: 'A partir do que você compartilha, entendemos o momento emocional e escolhemos a Palavra certa para o seu dia.',
    dwellMs: 6500,
  },
  {
    icon: 'sprout' as const,
    eyebrow: 'Passo 3',
    title: 'A semente chega\nno app.',
    body: 'Reflexão, oração, prática e louvor, feitos para você. Não é o mesmo texto para todo mundo.',
    dwellMs: 6000,
  },
  {
    icon: 'whatsapp' as const,
    eyebrow: 'Passo 4',
    title: 'E também no\nWhatsApp.',
    body: 'No horário que você escolher. Um toque em Plantar e a semente fica guardada no seu Campo.',
    dwellMs: 6000,
  },
  {
    icon: 'path' as const,
    eyebrow: 'Plantio',
    title: 'Alguém que caminha\nao seu lado.',
    body: 'De grão em grão, um acompanhamento personalizado. Do culto para a semana inteira, com você.',
    dwellMs: 0,
  },
];

function StepIcon({ name }: { name: (typeof STEPS)[number]['icon'] }) {
  const color = colors.ambarSoft;
  const size = 28;
  if (name === 'mic') return <Mic size={size} color={color} strokeWidth={1.8} />;
  if (name === 'sprout') return <Sprout size={size} color={color} strokeWidth={1.8} />;
  if (name === 'whatsapp') return <MessageCircle size={size} color={color} strokeWidth={1.8} />;
  if (name === 'path') return <Smartphone size={size} color={color} strokeWidth={1.8} />;
  // heart / escuta
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
  const enter = useRef(new Animated.Value(1)).current;
  const isLast = index === STEPS.length - 1;
  const step = STEPS[index];

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [index, enter]);

  useEffect(() => {
    if (isLast) return;
    const t = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, step.dwellMs);
    return () => clearTimeout(t);
  }, [index, isLast, step.dwellMs]);

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
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        <View style={styles.topbar}>
          <CircleBack onPress={() => navigation.goBack()} />
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((index + 1) / STEPS.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.stage}>
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
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          {isLast ? (
            <>
              <Button
                title="Ver exemplo no WhatsApp"
                onPress={() => navigation.navigate('WhatsAppDemo')}
                variant="dark"
                uppercase
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
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: space.gutter,
    paddingTop: 8,
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
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.casca20 },
  dotActive: { width: 22, backgroundColor: colors.accent },
  ctaPlaceholder: { height: 88 },
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
