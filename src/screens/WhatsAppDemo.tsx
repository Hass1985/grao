import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import GraoSymbol from '../components/GraoSymbol';
import { todaySeed } from '../data/seeds';
import { getDisplayName } from '../onboarding/userProfile';
import { fonts } from '../theme/typography';
import { webScreenFill, webScroll } from '../theme/webScreen';

// Paleta fiel do WhatsApp (não usa os tokens do Grão de propósito).
const WA = {
  header: '#075E54',
  headerText: '#FFFFFF',
  headerSub: '#CFE9E5',
  chatBg: '#ECE5DD',
  inBubble: '#FFFFFF',
  outBubble: '#DCF8C6',
  text: '#111B21',
  time: '#667781',
  link: '#027EB5',
  divider: '#D0E7D8',
  dividerText: '#54656F',
  inputBg: '#FFFFFF',
  green: '#25D366',
};

type Msg =
  | { kind: 'text'; text: string }
  | { kind: 'passage'; text: string; ref: string }
  | { kind: 'music'; title: string; artist: string; url?: string };

function buildMessages(firstName: string): Msg[] {
  const hi = firstName ? `Bom dia, ${firstName} 🌱` : 'Bom dia 🌱';
  return [
    {
      kind: 'text',
      text: `${hi}\nSua semente de hoje chegou. Um minuto, só entre você e Deus.`,
    },
    {
      kind: 'passage',
      text:
        '"Porque eu sei os planos que tenho para vocês, planos de prosperar e não de causar dano, de dar a vocês esperança e um futuro."',
      ref: todaySeed.reference,
    },
    {
      kind: 'text',
      text:
        'Mesmo quando o presente parece incerto, existe um projeto maior traçado com cuidado pra sua vida. Hoje, confie no que você ainda não consegue ver.',
    },
    {
      kind: 'text',
      text:
        '🌱 Prática de hoje: escreva uma coisa boa que aconteceu, por menor que seja. Deixa ela ser prova de que há cuidado no seu caminho.',
    },
    {
      kind: 'music',
      title: todaySeed.music.title,
      artist: todaySeed.music.artist,
      url: todaySeed.music.spotifyUrl,
    },
  ];
}

const now = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Bolha que entra animada (fade + subida) ao montar.
function Bubble({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// Indicador "digitando…" com três pontinhos pulsando.
function Typing() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={[styles.bubbleIn, styles.typingBubble]}>
      <View style={styles.typingRow}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[styles.typingDot, { opacity: d }]} />
        ))}
      </View>
    </View>
  );
}

export default function WhatsAppDemo({ navigation }: { navigation: any }) {
  const [firstName, setFirstName] = useState('');
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(buildMessages(''));
  const scrollRef = useRef<ScrollView>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    (async () => {
      const n = await getDisplayName();
      const first = n && n !== 'Você' ? n.split(' ')[0] : '';
      setFirstName(first);
      setMessages(buildMessages(first));
    })();
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const play = () => {
    clearTimers();
    setVisible(0);
    setTyping(false);
    // Ritmo pensado para o vídeo: um respiro antes de começar, "digitando" com
    // duração de mensagem de verdade e uma pausa de leitura entre cada bolha.
    let delay = 800;
    messages.forEach((_, i) => {
      timers.current.push(setTimeout(() => setTyping(true), delay));
      delay += 1050; // tempo "digitando"
      timers.current.push(
        setTimeout(() => {
          setTyping(false);
          setVisible(i + 1);
        }, delay)
      );
      delay += 1000; // pausa de leitura antes da próxima
    });
  };

  useEffect(() => {
    play();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [visible, typing]);

  const openMusic = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('WhatsApp');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, webScreenFill]}>
      <StatusBar barStyle="light-content" backgroundColor={WA.header} />

      {/* Header do WhatsApp */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backHit}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <GraoSymbol size={22} color={WA.header} filled={false} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>Grão</Text>
            <View style={styles.verified}>
              <Svg width={11} height={11} viewBox="0 0 24 24">
                <Path
                  d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z"
                  fill="#FFFFFF"
                />
              </Svg>
            </View>
          </View>
          <Text style={styles.status}>online</Text>
        </View>
        <Text style={styles.headerIcon}>📞</Text>
      </View>

      {/* Área de conversa */}
      <ScrollView
        ref={scrollRef}
        style={[{ backgroundColor: WA.chatBg }, webScroll]}
        contentContainerStyle={styles.chat}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>HOJE</Text>
        </View>

        <View style={styles.encryptRow}>
          <Text style={styles.encryptText}>
            🔒 As mensagens são protegidas com criptografia de ponta a ponta.
          </Text>
        </View>

        {messages.slice(0, visible).map((m, i) => (
          <Bubble key={i}>
            {m.kind === 'text' && (
              <View style={styles.bubbleIn}>
                <Text style={styles.msgText}>{m.text}</Text>
                <Text style={styles.msgTime}>{now()}</Text>
              </View>
            )}
            {m.kind === 'passage' && (
              <View style={[styles.bubbleIn, styles.passageBubble]}>
                <Text style={styles.passageText}>{m.text}</Text>
                <Text style={styles.passageRef}>{m.ref}</Text>
                <Text style={styles.msgTime}>{now()}</Text>
              </View>
            )}
            {m.kind === 'music' && (
              <View style={[styles.bubbleIn, styles.musicBubble]}>
                <Text style={styles.musicLabel}>🎵 Música para hoje</Text>
                <TouchableOpacity
                  style={styles.musicRow}
                  activeOpacity={0.8}
                  onPress={() => openMusic(m.url)}
                >
                  <View style={styles.musicThumb}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.62.62 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.871 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 11-.452-1.492c3.632-1.102 8.147-.568 11.232 1.329a.78.78 0 01.257 1.072zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z"
                        fill="#FFFFFF"
                      />
                    </Svg>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.musicTitle}>{m.title}</Text>
                    <Text style={styles.musicArtist}>{m.artist}</Text>
                  </View>
                  <Text style={styles.musicPlay}>▶</Text>
                </TouchableOpacity>
                <Text style={styles.msgTime}>{now()}</Text>
              </View>
            )}
          </Bubble>
        ))}

        {typing && <Typing />}
      </ScrollView>

      {/* Barra de digitação (decorativa) */}
      <View style={styles.inputBar}>
        <View style={styles.inputPill}>
          <Text style={styles.inputPlaceholder}>Mensagem</Text>
        </View>
        <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85} onPress={play}>
          <Text style={styles.sendIcon}>↻</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WA.header },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WA.header,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backHit: { paddingVertical: 4, paddingRight: 6, justifyContent: 'center' },
  back: { color: WA.headerText, fontSize: 30, lineHeight: 32, fontFamily: fonts.sans },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F0E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: WA.headerText, fontSize: 16, fontFamily: fonts.sansMedium },
  verified: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: WA.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { color: WA.headerSub, fontSize: 12, fontFamily: fonts.sans, marginTop: 1 },
  headerIcon: { fontSize: 18, marginLeft: 6 },

  chat: { paddingHorizontal: 10, paddingVertical: 12, paddingBottom: 20 },

  datePill: {
    alignSelf: 'center',
    backgroundColor: '#E1F2E7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  datePillText: { color: WA.dividerText, fontSize: 11, fontFamily: fonts.sansMedium, letterSpacing: 0.5 },

  encryptRow: { alignItems: 'center', marginBottom: 12, paddingHorizontal: 20 },
  encryptText: {
    backgroundColor: '#FCF4CB',
    color: '#5B5637',
    fontSize: 11.5,
    fontFamily: fonts.sans,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    overflow: 'hidden',
  },

  bubbleIn: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    backgroundColor: WA.inBubble,
    borderRadius: 10,
    borderTopLeftRadius: 2,
    paddingHorizontal: 11,
    paddingTop: 7,
    paddingBottom: 6,
    marginBottom: 9,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  msgText: { color: WA.text, fontSize: 15, lineHeight: 21, fontFamily: fonts.sans },
  msgTime: { color: WA.time, fontSize: 10.5, fontFamily: fonts.sans, alignSelf: 'flex-end', marginTop: 3 },

  passageBubble: { backgroundColor: '#FFFDF5' },
  passageText: { color: WA.text, fontSize: 15, lineHeight: 22, fontFamily: fonts.sans, fontStyle: 'italic' },
  passageRef: { color: '#075E54', fontSize: 13, fontFamily: fonts.sansMedium, marginTop: 6 },

  musicBubble: { paddingBottom: 6, width: '82%' },
  musicLabel: { color: WA.time, fontSize: 12, fontFamily: fonts.sansMedium, marginBottom: 7 },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F5F5',
    borderRadius: 8,
    padding: 8,
  },
  musicThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicTitle: { color: WA.text, fontSize: 14, fontFamily: fonts.sansMedium },
  musicArtist: { color: WA.time, fontSize: 12, fontFamily: fonts.sans, marginTop: 1 },
  musicPlay: { color: '#075E54', fontSize: 16, marginRight: 4 },

  typingBubble: { paddingVertical: 12, paddingHorizontal: 14 },
  typingRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9AA6A2' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: WA.chatBg,
  },
  inputPill: {
    flex: 1,
    backgroundColor: WA.inputBg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  inputPlaceholder: { color: '#8696A0', fontSize: 15, fontFamily: fonts.sans },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WA.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#FFFFFF', fontSize: 20 },
});
