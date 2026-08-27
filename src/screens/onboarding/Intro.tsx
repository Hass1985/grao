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
import { useIsFocused } from '@react-navigation/native';
import IntroScene from './IntroArt';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { webScreenFill } from '../../theme/webScreen';

type Props = { navigation: StackNavigationProp<any> };

const SLIDES = [
  {
    art: 'sunset',
    title: 'Fé no seu\ndia a dia.',
    sub: 'O Grão é o seu devocional diário, no lugar onde você já vive: o WhatsApp.',
  },
  {
    art: 'field',
    title: 'Todo dia,\numa semente.',
    sub: 'A Palavra de Deus, no horário que você escolher.',
  },
  {
    art: 'family',
    title: 'A Palavra de Deus\nna sua rotina.',
    sub: 'No trabalho, em casa ou em qualquer lugar. Além do culto, todo dia da semana, do jeito que sua vida pede.',
  },
  {
    art: 'prayer',
    title: 'Fiel à sua\ncaminhada.',
    sub: 'A semente que Deus plantou em você é única. Por isso, antes de qualquer coisa, queremos entender onde você está e pra onde o Senhor está te levando.',
  },
];

export default function Intro({ navigation }: Props) {
  const win = Dimensions.get('window');
  const [w, setW] = useState(win.width);
  const [scrollH, setScrollH] = useState(0);
  const [index, setIndex] = useState(0);
  const scRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const focused = useIsFocused();

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / w);
        if (i !== index) setIndex(i);
      },
    }
  );

  const goAbertura = () => navigation.navigate('Abertura');
  const next = () => {
    if (index < SLIDES.length - 1) {
      scRef.current?.scrollTo({ x: (index + 1) * w, animated: true });
      setIndex(index + 1);
    } else {
      goAbertura();
    }
  };

  const illoW = Math.max(1, Math.min(w - 44, 360));
  const illoH = Math.round(illoW * 0.72);

  return (
    <SafeAreaView
      style={[styles.container, webScreenFill]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.topbar}>
        <TouchableOpacity onPress={goAbertura} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
              : null;
          const scale = rel ? rel.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.9, 1, 0.9] }) : 1;
          const cardTy = rel ? rel.interpolate({ inputRange: [-1, 0, 1], outputRange: [22, 0, 22] }) : 0;
          const cardOp = rel ? rel.interpolate({ inputRange: [-1, -0.4, 0, 0.4, 1], outputRange: [0.3, 0.9, 1, 0.9, 0.3] }) : 1;
          const textOp = rel ? rel.interpolate({ inputRange: [-1, -0.5, 0, 0.5, 1], outputRange: [0, 0.5, 1, 0.5, 0] }) : 1;
          const textTy = rel ? rel.interpolate({ inputRange: [-1, 0, 1], outputRange: [28, 0, 28] }) : 0;
          return (
            <View key={i} style={[styles.page, { width: w, height: scrollH || undefined }]}>
              <Animated.View
                style={[
                  styles.illo,
                  { width: illoW, height: illoH, opacity: cardOp, transform: [{ scale }, { translateY: cardTy }] },
                ]}
              >
                {focused && illoW > 40 ? <IntroScene name={sl.art} w={illoW} rel={rel} /> : null}
              </Animated.View>
              <Animated.View style={{ alignItems: 'center', opacity: textOp, transform: [{ translateY: textTy }] }}>
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
        <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.85}>
          <Text style={styles.buttonText}>
            {index === SLIDES.length - 1 ? 'Vamos começar' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 10,
    height: 44,
    zIndex: 2,
  },
  skip: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foregroundMuted },
  scroll: { flex: 1 },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  illo: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 34,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 31,
    lineHeight: 37,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.foregroundMuted,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: 14,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 8,
    zIndex: 2,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.casca20 },
  dotActive: { width: 22, backgroundColor: colors.accent },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accentForeground,
    letterSpacing: 0.3,
  },
});
