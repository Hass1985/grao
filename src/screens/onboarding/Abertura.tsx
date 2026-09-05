// A Abertura — o onboarding sem fricção do Grão.
//
// Em vez de um questionário, um único momento: a pessoa grava um áudio de até
// 1 minuto (ou escreve) contando o que tem vivido e pedido a Deus. A resposta
// do Grão cita o que ela disse — a prova de que foi ouvida.
//
// Transcrição pelo navegador (Web Speech API). ATENÇÃO ao que isso significa
// de verdade: o áudio NÃO é processado no aparelho — o navegador o envia para
// o servidor do fornecedor (Google no Chrome, Apple no Safari) e devolve o
// texto. Para o Grão só o texto trafega, mas o áudio já saiu do dispositivo
// antes disso. Como relato de fé é dado sensível na LGPD, isso precisa estar
// na política de privacidade antes de abrir para usuários reais — e não pode
// ser descrito como "transcrição no aparelho" em lugar nenhum.
// Sem suporte a voz (ou permissão negada), cai para texto com a mesma
// experiência.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import GraoSymbol from '../../components/GraoSymbol';
import { AI_MODE, getUserId, postOpening } from '../../onboarding/aiClient';
import { saveMinimalProfile, scoreFreeText, emotionalHintFromText, Channel } from '../../onboarding/profile';
import { setMoment } from '../../onboarding/seedDelivery';
import { setDisplayName } from '../../onboarding/userProfile';
import { EmotionalFamily } from '../../data/seeds';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { radius } from '../../theme/radius';
import { logoSize, logoSlot, space } from '../../theme/spacing';
import { webScreenFill, webScroll } from '../../theme/webScreen';
import Button from '../../components/ui/Button';
import StepProgress from '../../components/ui/StepProgress';
import Reveal from '../../components/ui/Reveal';
import ScreenBackground from '../../components/ui/ScreenBackground';

type Props = { navigation: any };
type Phase = 'name' | 'share' | 'recording' | 'thinking' | 'response';

const MAX_SECONDS = 60;
const NATIVE = Platform.OS !== 'web';

// Acolhimento local (modo demo, sem backend) — 1 por família emocional.
const LOCAL_RESPONSES: Record<string, string> = {
  ansiedade: 'Dá pra sentir o peso que você tem carregado. Respira: a partir de hoje, você não carrega sozinho. Vou te lembrar, um dia de cada vez, de entregar o que aperta.',
  paz: 'Que bom te ouvir buscando descanso. É desse lugar quieto que a Palavra fala mais alto.',
  esperança: 'Tem esperança plantada no que você contou, mesmo no meio da espera. Vamos regar isso juntos, um dia de cada vez.',
  propósito: 'Você está buscando direção, e isso já é um passo. Deus costuma falar no caminho, não só na chegada.',
  gratidão: 'Que bonito ouvir gratidão no meio da correria. Coração grato enxerga o que a pressa esconde.',
  fé: 'A sua busca por confiar mais já é fé em movimento. Vamos fortalecer esse músculo todo dia.',
  solidão: 'Obrigado por dividir isso comigo. Você não vai caminhar só: todo dia, uma palavra vai te encontrar.',
  luto: 'Sinto muito pela sua dor. Não tem pressa aqui, só presença. Deus está perto de quem tem o coração partido, e eu vou estar por perto também.',
  culpa: 'O que pesa em você não é maior que a graça. Um recomeço por dia: é assim que a gente vai.',
  alegria: 'Que alegria boa de ouvir! Vamos cuidar dela, porque alegria também se rega todo dia.',
  medo: 'O medo aperta, mas você não precisa enfrentar sozinho. Vamos colocar luz no que assusta, um dia de cada vez.',
  tristeza: 'Sua tristeza tem lugar aqui. Sem pressa para sorrir: a Palavra também abraça quem chora.',
  raiva: 'Raiva também é um pedido de cuidado. Vamos transformar esse fogo em caminho, com honestidade e graça.',
};

function MicIcon({ size = 34, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15z"
        fill={color}
      />
      <Path
        d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3.2M8.8 21.2h6.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Anel de progresso (0..1) ao redor do microfone durante a gravação.
function ProgressRing({ size, progress }: { size: number; progress: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill as any}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.casca12} strokeWidth={3} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.accent}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c}`}
        strokeDashoffset={c * (1 - progress)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function Abertura({ navigation }: Props) {
  const [phase, setPhase] = useState<Phase>('name');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [responseMsg, setResponseMsg] = useState('');

  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  // Voz disponível? (Web Speech API — transcrição no aparelho)
  const SR: any =
    !NATIVE && typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const voiceAvailable = !!SR;

  // pulso do microfone
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.06] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });

  useEffect(() => () => stopEverything(), []);

  const stopEverything = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { recRef.current?.stop?.(); } catch {}
    recRef.current = null;
  };

  const firstName = () => {
    const n = name.trim().split(/\s+/)[0] || '';
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
  };

  const startRecording = () => {
    if (!voiceAvailable) { setTextMode(true); return; }
    finalRef.current = '';
    setLiveTranscript('');
    setSeconds(0);
    doneRef.current = false;

    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + ' ';
        else interim += t;
      }
      setLiveTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e: any) => {
      // permissão negada / sem áudio → cai para texto com carinho
      stopEverything();
      if (!doneRef.current) {
        setPhase('share');
        setTextMode(true);
        setMicNote(
          e?.error === 'not-allowed'
            ? 'Sem acesso ao microfone por aqui. Escreve pra mim do seu jeito. 🌱'
            : 'Não consegui te ouvir direito. Escreve pra mim do seu jeito. 🌱'
        );
      }
    };
    rec.onend = () => {
      // o navegador pode encerrar sozinho (silêncio longo)
      if (!doneRef.current && phaseRef.current === 'recording') finishRecording();
    };
    recRef.current = rec;
    try {
      rec.start();
      setPhase('recording');
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) finishRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setTextMode(true);
      setMicNote('Não consegui iniciar a gravação. Escreve pra mim do seu jeito. 🌱');
    }
  };

  // phase em ref para o onend não usar valor velho
  const phaseRef = useRef<Phase>('name');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const finishRecording = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopEverything();
    const transcript = (finalRef.current || liveTranscript).trim();
    if (transcript.length < 8) {
      setPhase('share');
      setTextMode(true);
      setMicNote('Ficou curtinho e eu não quis arriscar entender errado. Tenta de novo, ou escreve pra mim. 🌱');
      return;
    }
    void submit(transcript, 'audio');
  };

  const submitText = () => {
    const t = text.trim();
    if (t.length < 4) return;
    void submit(t, 'text');
  };

  const submit = async (transcript: string, source: 'audio' | 'text') => {
    setPhase('thinking');
    const n = firstName();
    try { if (n) await setDisplayName(n); } catch {}

    let message = '';
    let channel: Channel = 'visual';
    let family: EmotionalFamily | null = null;

    if (AI_MODE) {
      try {
        const userId = await getUserId();
        const r = await postOpening(userId, n, transcript, source);
        message = r.message;
        channel = r.channel as Channel;
        family = (r.emotionalHint as EmotionalFamily) ?? null;
      } catch {
        // backend indisponível → mesma experiência com leitura local
      }
    }
    if (!message) {
      // FALLBACK LOCAL (modo demo, sem backend). Regra de honestidade:
      // só afirmamos uma leitura quando o sinal do léxico é claro e sem empate;
      // caso contrário, acolhemos sem "chutar" a emoção — errar a leitura
      // destrói a confiança logo no primeiro minuto.
      const vak = scoreFreeText(transcript);
      const best = (['v', 'a', 'k'] as const).reduce((m, k) => ((vak[k] ?? 0) > (vak[m] ?? 0) ? k : m), 'v');
      channel = best === 'a' ? 'auditivo' : best === 'k' ? 'sinestesico' : 'visual';
      family = emotionalHintFromText(transcript); // null = sinal fraco/ambíguo
      if (family && LOCAL_RESPONSES[family]) {
        message = `${n ? n + ', o' : 'O'}brigado por se abrir comigo. ${LOCAL_RESPONSES[family]} Sua primeira semente já está sendo preparada. 🌱`;
      } else {
        message = `${n ? n + ', o' : 'O'}brigado por se abrir comigo. Li com carinho cada palavra do que você dividiu, e é daí que a sua caminhada aqui começa. Sua primeira semente já está sendo preparada, escolhida com cuidado. 🌱`;
      }
    }

    try {
      await saveMinimalProfile({ name: n || 'você', channel, emotionalHint: family });
      if (family) await setMoment(family);
    } catch {}

    // um respiro antes da resposta — o cuidado também é percebido no ritmo
    setTimeout(() => {
      setResponseMsg(message);
      setPhase('response');
    }, AI_MODE ? 250 : 1400);
  };

  const skip = async () => {
    stopEverything();
    const n = firstName();
    try {
      if (n) await setDisplayName(n);
      await saveMinimalProfile({ name: n || 'você', channel: 'visual', emotionalHint: null });    } catch {}
    navigation.navigate('Notification');
  };

  const mm = `0:${String(MAX_SECONDS - seconds).padStart(2, '0')}`;

  return (
    <ScreenBackground>
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <StepProgress step={3} />
      {/* topo */}
      <View style={styles.topbar}>
        <View style={styles.logoSlot}>
          <GraoSymbol size={logoSize} color={colors.accent} filled={false} />
        </View>
        {(phase === 'name' || phase === 'share') && (
          <TouchableOpacity onPress={skip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} testID="abertura-skip">
            <Text style={styles.skip}>Pular</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={webScroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ---------- FASE 1: NOME ---------- */}
        {phase === 'name' && (
          <View style={styles.center}>
            <Text style={styles.eyebrow}>Nossa conversa · passo 3</Text>
            <Text style={styles.title}>Como você gosta{'\n'}de ser chamado?</Text>
            <TextInput
              testID="abertura-name"
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.foregroundSubtle}
              returnKeyType="next"
              onSubmitEditing={() => name.trim() && setPhase('share')}
            />
            <Button
              testID="abertura-name-continue"
              title="Continuar"
              disabled={!name.trim()}
              onPress={() => name.trim() && setPhase('share')}
            />
          </View>
        )}

        {/* ---------- FASE 2: O DESABAFO ---------- */}
        {phase === 'share' && (
          <View style={styles.center}>
            <Text style={styles.title}>{firstName() ? `${firstName()}, agora` : 'Agora'} é entre{'\n'}você e Deus.</Text>
            <Text style={styles.sub}>
              {textMode
                ? 'Escreve pra mim, do seu jeito: o que você tem vivido e pedido a Deus nessa fase?'
                : 'Toca no microfone e me conta, do seu jeito, o que você tem vivido e pedido a Deus. Pode falar por até 1 minuto.'}
            </Text>
            <Text style={styles.hints}>família · trabalho · um sonho · uma dor · uma gratidão</Text>
            {micNote ? <Text style={styles.micNote}>{micNote}</Text> : null}

            {!textMode && voiceAvailable ? (
              <>
                <View style={styles.micWrap}>
                  <Animated.View style={[styles.micRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                  <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                    <TouchableOpacity testID="abertura-mic" style={styles.micBtn} onPress={startRecording} activeOpacity={0.85}>
                      <MicIcon />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
                <TouchableOpacity onPress={() => setTextMode(true)} testID="abertura-prefer-text">
                  <Text style={styles.link}>Prefiro escrever</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  testID="abertura-text"
                  style={styles.textArea}
                  value={text}
                  onChangeText={setText}
                  placeholder="Pode escrever com suas palavras…"
                  placeholderTextColor={colors.foregroundSubtle}
                  multiline
                />
                <Button
                  testID="abertura-send"
                  title="Enviar"
                  disabled={text.trim().length < 4}
                  onPress={submitText}
                />
                {voiceAvailable && (
                  <TouchableOpacity onPress={() => { setTextMode(false); setMicNote(null); }}>
                    <Text style={styles.link}>Prefiro gravar um áudio</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity onPress={() => { stopEverything(); navigation.navigate('Conversa'); }}>
              <Text style={styles.linkSubtle}>Prefiro conversar por mensagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- GRAVANDO ---------- */}
        {phase === 'recording' && (
          <View style={styles.center}>
            <Text style={styles.recTimer}>{mm}</Text>
            <View style={styles.micWrap}>
              <Animated.View style={[styles.micRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
              <View>
                <View style={styles.micBtnRecording}>
                  <MicIcon />
                </View>
                <ProgressRing size={96} progress={seconds / MAX_SECONDS} />
              </View>
            </View>
            <Text style={styles.recHint}>Estou te ouvindo…</Text>
            <Text style={styles.liveTranscript} numberOfLines={6}>
              {liveTranscript || ' '}
            </Text>
            <Button testID="abertura-finish" title="Concluir" onPress={finishRecording} />
            <TouchableOpacity onPress={() => { doneRef.current = true; stopEverything(); setPhase('share'); setLiveTranscript(''); }}>
              <Text style={styles.linkSubtle}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- PENSANDO ---------- */}
        {phase === 'thinking' && (
          <View style={styles.center}>
            <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
              <GraoSymbol size={56} color={colors.accent} filled={false} />
            </Animated.View>
            <Text style={styles.thinkingText}>Ouvindo você…</Text>
          </View>
        )}

        {/* ---------- RESPOSTA ---------- */}
        {phase === 'response' && (
          <Reveal triggerKey={responseMsg.slice(0, 40)} style={{ width: '100%' }}>
            <View style={styles.center}>
              <View style={styles.responseCard}>
                <GraoSymbol size={30} color={colors.accent} filled={false} />
                <Text style={styles.responseText} testID="abertura-response">{responseMsg}</Text>
              </View>
              <Button
                testID="abertura-continue"
                title="Continuar"
                onPress={() => navigation.navigate('Notification')}
              />
            </View>
          </Reveal>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 4,
    minHeight: logoSlot,
  },
  logoSlot: {
    width: logoSlot,
    height: logoSlot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foregroundMuted },
  scroll: { flexGrow: 1, paddingHorizontal: space.gutter, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 16 },

  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 2,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 30,
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
    maxWidth: 330,
  },
  hints: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundSubtle,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  micNote: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.accent,
    textAlign: 'center',
    maxWidth: 320,
  },

  nameInput: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    textAlign: 'center',
  },

  micWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  micRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.accent,
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.md as object),
  },
  micBtnRecording: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.casca,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recTimer: { fontFamily: fonts.serif, fontSize: 30, color: colors.foreground },
  recHint: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.accent },
  liveTranscript: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    lineHeight: 27,
    color: colors.foregroundMuted,
    textAlign: 'center',
    maxWidth: 330,
    minHeight: 54,
    fontStyle: 'italic',
  },

  textArea: {
    width: '100%',
    maxWidth: 340,
    minHeight: 130,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    borderRadius: radius.lg,
    padding: 18,
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.foreground,
    textAlignVertical: 'top',
  },

  thinkingText: { fontFamily: fonts.serifMedium, fontSize: fontSizes.lg, color: colors.foregroundMuted, fontStyle: 'italic' },

  responseCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    ...(shadows.md as object),
  },
  responseText: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    lineHeight: 28,
    color: colors.foreground,
    textAlign: 'center',
  },

  link: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.accent, padding: 6 },
  linkSubtle: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.foregroundSubtle, padding: 6 },
});
