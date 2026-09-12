// Momento do fluxo pago: áudio até 1 min ou texto → motor emocional → semente
// personalizada. Reaproveita a lógica da Abertura, no design atual.
//
// A MESMA tela serve os dois modos, escolhidos pelo parâmetro `real` da rota:
//
//   MomentoSementeTeste  (real: false)  demonstração — não grava nada, e a
//                                       família viaja pela navegação
//   MomentoSemente       (real: true)   valendo — grava o relato, o perfil e o
//                                       momento, e /seed/today passa a devolver
//                                       a semente escolhida a partir dele
//
// São a mesma tela porque são o mesmo gesto. Duplicar 500 linhas para mudar um
// booleano garantiria que uma das duas cópias fosse ficando para trás, e a que
// ficaria para trás seria justamente a de verdade.
//
// Sem o modo real, o produto pago não tinha entrada: a pessoa terminava de
// assinar e caía num devocional igual ao de todo mundo, sem nunca ter contado
// nada. A semente personalizada é a promessa inteira do Plantio, e ela começa
// aqui.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import GraoSymbol from '../components/GraoSymbol';
import CircleBack from '../components/ui/CircleBack';
import Button from '../components/ui/Button';
import Reveal from '../components/ui/Reveal';
import ScreenBackground from '../components/ui/ScreenBackground';
import { AI_MODE, getUserId, postOpening } from '../onboarding/aiClient';
import { setMoment, reescolherSementeDeHoje } from '../onboarding/seedDelivery';
import {
  scoreFreeText,
  emotionalHintFromText,
  Channel,
} from '../onboarding/profile';
import { getDisplayName } from '../onboarding/userProfile';
import { EmotionalFamily } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { radius } from '../theme/radius';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';
import { motion } from '../theme/motion';
import { webScreenFill, webScroll } from '../theme/webScreen';

type Props = { navigation: any; route?: { params?: { real?: boolean } } };
type Phase = 'share' | 'recording' | 'thinking' | 'response' | 'care';

const MAX_SECONDS = 60;
const NATIVE = Platform.OS !== 'web';

const LOCAL_RESPONSES: Record<string, string> = {
  ansiedade:
    'Dá pra sentir o peso que você tem carregado. Respira: a partir de hoje, você não carrega sozinho. Vou te lembrar, um dia de cada vez, de entregar o que aperta.',
  paz: 'Que bom te ouvir buscando descanso. É desse lugar quieto que a Palavra fala mais alto.',
  esperança:
    'Tem esperança plantada no que você contou, mesmo no meio da espera. Vamos regar isso juntos, um dia de cada vez.',
  propósito:
    'Você está buscando direção, e isso já é um passo. Deus costuma falar no caminho, não só na chegada.',
  gratidão:
    'Que bonito ouvir gratidão no meio da correria. Coração grato enxerga o que a pressa esconde.',
  fé: 'A sua busca por confiar mais já é fé em movimento. Vamos fortalecer esse músculo todo dia.',
  solidão:
    'Obrigado por dividir isso comigo. Você não vai caminhar só: todo dia, uma palavra vai te encontrar.',
  luto: 'Sinto muito pela sua dor. Não tem pressa aqui, só presença. Deus está perto de quem tem o coração partido, e eu vou estar por perto também.',
  culpa:
    'O que pesa em você não é maior que a graça. Um recomeço por dia: é assim que a gente vai.',
  alegria: 'Que alegria boa de ouvir! Vamos cuidar dela, porque alegria também se rega todo dia.',
  medo: 'O medo aperta, mas você não precisa enfrentar sozinho. Vamos colocar luz no que assusta, um dia de cada vez.',
  tristeza:
    'Sua tristeza tem lugar aqui. Sem pressa para sorrir: a Palavra também abraça quem chora.',
  raiva:
    'Raiva também é um pedido de cuidado. Vamos transformar esse fogo em caminho, com honestidade e graça.',
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

/**
 * Entrada do fluxo pago de teste: contar o momento (áudio ou texto),
 * o motor lê o estado emocional e em seguida abre a semente.
 */
export default function MomentoSementeTeste({ navigation, route }: Props) {
  /** Valendo (grava) ou demonstração (não grava). A rota decide. */
  const real: boolean = route?.params?.real === true;
  const [phase, setPhase] = useState<Phase>('share');
  const [nome, setNome] = useState('');
  const [text, setText] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [responseMsg, setResponseMsg] = useState('');
  // Família lida na conversa de teste. Vive só nesta tela e é entregue à
  // seguinte pela navegação, sem passar por AsyncStorage nem pelo servidor.
  const [familiaDoTeste, setFamiliaDoTeste] = useState<EmotionalFamily | null>(null);
  /** O que ela contou. Segue para a curadoria pela navegação, sem ser gravado. */
  const [relatoDoTeste, setRelatoDoTeste] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);
  const phaseRef = useRef<Phase>('share');

  const SR: any =
    !NATIVE && typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const voiceAvailable = !!SR;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.06] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });

  useEffect(() => {
    getDisplayName()
      .then((n) => setNome(n === 'Você' ? '' : n))
      .catch(() => {});
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => stopEverything(), []);

  const stopEverything = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  };

  const firstName = () => {
    const n = nome.trim().split(/\s+/)[0] || '';
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
  };

  const startRecording = () => {
    if (!voiceAvailable) {
      setTextMode(true);
      return;
    }
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
      stopEverything();
      if (!doneRef.current) {
        setPhase('share');
        setTextMode(true);
        setMicNote(
          e?.error === 'not-allowed'
            ? 'Sem acesso ao microfone por aqui. Escreve pra mim do seu jeito.'
            : 'Não consegui te ouvir direito. Escreve pra mim do seu jeito.'
        );
      }
    };
    rec.onend = () => {
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
      setMicNote('Não consegui iniciar a gravação. Escreve pra mim do seu jeito.');
    }
  };

  const finishRecording = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopEverything();
    const transcript = (finalRef.current || liveTranscript).trim();
    if (transcript.length < 8) {
      setPhase('share');
      setTextMode(true);
      setMicNote(
        'Ficou curtinho e eu não quis arriscar entender errado. Tenta de novo, ou escreve pra mim.'
      );
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

    let message = '';
    let channel: Channel = 'visual';
    let family: EmotionalFamily | null = null;
    let needsCare = false;

    if (AI_MODE) {
      try {
        const userId = await getUserId();
        // O último argumento é `teste`. No modo real ele vai false, e é isso
        // que faz o servidor gravar o turno, salvar a leitura e definir o
        // momento — sem isso o relato morre na tela e /seed/today continua
        // escolhendo às cegas.
        const r = await postOpening(userId, n || 'você', transcript, source, !real);
        message = r.message;
        channel = r.channel as Channel;
        family = (r.emotionalHint as EmotionalFamily) ?? null;
        needsCare = !!r.needsCare;
      } catch {
        /* cai no fallback local */
      }
    }

    if (!message) {
      const vak = scoreFreeText(transcript);
      const best = (['v', 'a', 'k'] as const).reduce(
        (m, k) => ((vak[k] ?? 0) > (vak[m] ?? 0) ? k : m),
        'v' as 'v' | 'a' | 'k'
      );
      channel = best === 'a' ? 'auditivo' : best === 'k' ? 'sinestesico' : 'visual';
      family = emotionalHintFromText(transcript);
      if (family && LOCAL_RESPONSES[family]) {
        message = `${n ? n + ', o' : 'O'}brigado por se abrir comigo. ${LOCAL_RESPONSES[family]} Sua semente de hoje já está sendo preparada.`;
      } else {
        message = `${n ? n + ', o' : 'O'}brigado por se abrir comigo. Li com carinho cada palavra do que você dividiu. Sua semente de hoje já está sendo preparada, escolhida com cuidado.`;
      }
    }

    // Segurança emocional: mensagem fixa do servidor, sem alterar.
    if (needsCare) {
      setResponseMsg(message);
      setPhase('care');
      return;
    }

    // Modo teste NÃO grava nada: nem perfil, nem momento. A família fica só
    // aqui e viaja para a próxima tela pela navegação. Antes gravava, e a
    // demonstração passava a mandar na tela Hoje da pessoa que demonstrou.
    setFamiliaDoTeste(family);
    setRelatoDoTeste(transcript);

    // No modo real, o momento também é gravado NO APARELHO — e não só no
    // servidor. O Hoje mora dentro das abas e não desmonta: ele só recarrega
    // quando este valor local muda. Sem esta linha a pessoa contaria o próprio
    // momento, voltaria para o Hoje e encontraria a semente de antes, como se
    // nada do que ela disse tivesse chegado.
    if (real) {
      if (family) await setMoment(family).catch(() => {});
      // E a semente do dia é escolhida de novo a partir do que ela contou.
      // Sem isto, quem já tinha recebido a semente hoje — inclusive quem
      // acabou de assinar e passou pelo Hoje antes — continuaria com a
      // escolha feita às cegas, e o relato não mudaria uma vírgula da tela.
      await reescolherSementeDeHoje({ familia: family, relato: transcript }).catch(() => {});
    }

    setTimeout(() => {
      setResponseMsg(message);
      setPhase('response');
    }, AI_MODE ? 200 : motion.enterMs + 200);
  };

  const mm = `0:${String(MAX_SECONDS - seconds).padStart(2, '0')}`;
  const tituloShare = firstName()
    ? `${firstName()}, como está\no seu coração hoje?`
    : 'Como está o seu\ncoração hoje?';

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />

        <View style={styles.topbar}>
          <CircleBack
            onPress={() => {
              stopEverything();
              navigation.goBack();
            }}
          />
          <View style={styles.topTitles}>
            <Text style={styles.topTitle}>Plantio</Text>
            <Text style={styles.topHint}>{real ? 'Sua semente de hoje' : 'Modo teste'}</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        <ScrollView
          style={webScroll}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {phase === 'share' && (
            <View style={styles.center}>
              <Text style={styles.eyebrow}>Seu momento</Text>
              <Text style={styles.title}>{tituloShare}</Text>
              <Text style={styles.sub}>
                {textMode
                  ? 'Escreve pra mim, do seu jeito: o que você tem vivido e pedido a Deus.'
                  : 'Toque no microfone e conte, do seu jeito. Pode falar por até 1 minuto.'}
              </Text>
              <Text style={styles.hints}>família · trabalho · um sonho · uma dor · uma gratidão</Text>
              {micNote ? <Text style={styles.micNote}>{micNote}</Text> : null}

              {!textMode && voiceAvailable ? (
                <>
                  <View style={styles.micWrap}>
                    <Animated.View
                      style={[
                        styles.micRing,
                        { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                      ]}
                    />
                    <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                      <TouchableOpacity
                        style={styles.micBtn}
                        onPress={startRecording}
                        activeOpacity={0.85}
                        accessibilityLabel="Gravar áudio"
                      >
                        <MicIcon />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  <TouchableOpacity onPress={() => setTextMode(true)} hitSlop={8}>
                    <Text style={styles.link}>Prefiro escrever</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.textArea}
                    value={text}
                    onChangeText={setText}
                    placeholder="Pode escrever com suas palavras…"
                    placeholderTextColor={colors.foregroundSubtle}
                    multiline
                  />
                  <Button
                    title="Enviar"
                    disabled={text.trim().length < 4}
                    onPress={submitText}
                    variant="dark"
                    uppercase
                  />
                  {voiceAvailable ? (
                    <TouchableOpacity
                      onPress={() => {
                        setTextMode(false);
                        setMicNote(null);
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.link}>Prefiro gravar um áudio</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          )}

          {phase === 'recording' && (
            <View style={styles.center}>
              <Text style={styles.recTimer}>{mm}</Text>
              <View style={styles.micWrap}>
                <Animated.View
                  style={[
                    styles.micRing,
                    { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                  ]}
                />
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
              <Button title="Concluir" onPress={finishRecording} variant="dark" uppercase />
              <TouchableOpacity
                onPress={() => {
                  doneRef.current = true;
                  stopEverything();
                  setPhase('share');
                  setLiveTranscript('');
                }}
                hitSlop={8}
              >
                <Text style={styles.linkSubtle}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'thinking' && (
            <View style={styles.center}>
              <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                <GraoSymbol size={56} color={colors.ambarSoft} filled={false} />
              </Animated.View>
              <Text style={styles.thinkingText}>Ouvindo você…</Text>
            </View>
          )}

          {phase === 'care' && (
            <View style={styles.center}>
              <View style={styles.responseCard}>
                <Text style={styles.responseText}>{responseMsg}</Text>
              </View>
              <Button
                title="Voltar"
                onPress={() => navigation.goBack()}
                variant="dark"
                uppercase
              />
            </View>
          )}

          {phase === 'response' && (
            <Reveal triggerKey={responseMsg.slice(0, 40)} style={{ width: '100%' }}>
              <View style={styles.center}>
                <View style={styles.responseCard}>
                  <GraoSymbol size={30} color={colors.ambarSoft} filled={false} />
                  <Text style={styles.responseText}>{responseMsg}</Text>
                </View>
                <Button
                  title="Ver minha semente"
                  onPress={() =>
                    real
                      // No modo real a semente já é a do Hoje: o servidor
                      // gravou o momento, e /seed/today devolve a escolha feita
                      // a partir do que ela acabou de contar. Não existe tela
                      // separada, e é esse o ponto.
                      ? navigation.replace('Main', { screen: 'Hoje' })
                      : navigation.replace('HojeSementeTeste', {
                          family: familiaDoTeste,
                          relato: relatoDoTeste,
                        })
                  }
                  variant="dark"
                  uppercase
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
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  topTitles: { flex: 1, alignItems: 'center' },
  topTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 20,
    color: colors.palha,
    letterSpacing: -0.3,
  },
  topHint: {
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginTop: 2,
  },
  topSpacer: { width: 40 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space.gutter,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
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
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foregroundMuted,
    textAlign: 'center',
    maxWidth: 320,
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
    color: colors.ambarSoft,
    textAlign: 'center',
    maxWidth: 320,
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
  recTimer: {
    fontFamily: fonts.serifMedium,
    fontSize: 30,
    color: colors.palha,
  },
  recHint: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.ambarSoft,
  },
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
    ...glassCard,
    borderRadius: radius.lg,
    padding: 18,
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.palha,
    textAlignVertical: 'top',
  },
  thinkingText: {
    fontFamily: fonts.serifMedium,
    fontSize: fontSizes.lg,
    color: colors.foregroundMuted,
    fontStyle: 'italic',
  },
  responseCard: {
    width: '100%',
    maxWidth: 350,
    ...glassCard,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    ...(shadows.sm as object),
  },
  responseText: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    lineHeight: 28,
    color: colors.palha,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.ambarSoft,
    padding: 6,
  },
  linkSubtle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundSubtle,
    padding: 6,
  },
});
