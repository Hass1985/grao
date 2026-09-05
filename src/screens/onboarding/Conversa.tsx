import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GraoSymbol from '../../components/GraoSymbol';
import {
  QUESTIONS,
  INTRO_MESSAGES,
  NAME_ACK,
  DEFLECTION,
  VAGUE_FOLLOWUPS,
  CLOSING_BY_CHANNEL,
  ChipOption,
} from '../../data/onboardingScript';
import { ProfileBuilder, scoreFreeText, saveProfile, saveMinimalProfile, Channel } from '../../onboarding/profile';
import { AI_MODE, getUserId, postTurn, ApiMessage } from '../../onboarding/aiClient';
import { setMoment } from '../../onboarding/seedDelivery';
import { EmotionalFamily } from '../../data/seeds';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { radius } from '../../theme/radius';
import { logoSize, logoSlot, space } from '../../theme/spacing';
import Button from '../../components/ui/Button';
import StepProgress from '../../components/ui/StepProgress';

type Props = { navigation: any };

interface Msg {
  id: string;
  from: 'grao' | 'user';
  text: string;
}

const TYPING_DELAY = 550;
const DEFLECTION_RE = /(pra que|para que|por que|pq)[^?]*?(pergunt|isso|serve|quer saber)|serve isso/i;
const VAGUE_RE = /^(não sei|nao sei|sei lá|sei la|nada|hm+|\.+)$/i;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let msgSeq = 0;
const nextId = () => `m${++msgSeq}`;

// No web, KeyboardAvoidingView não limita a altura (a lista transborda a viewport).
// Usamos uma View com flex:1 + minHeight:0 para a FlatList encolher e rolar por dentro,
// mantendo chips e input sempre visíveis. No mobile, mantemos o keyboard-avoiding.
const Body = ({ children }: { children: React.ReactNode }) =>
  Platform.OS === 'web' ? (
    <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
  ) : (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );

export default function Conversa({ navigation }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [chips, setChips] = useState<ChipOption[] | null>(null);
  const [input, setInput] = useState('');
  const [inputEnabled, setInputEnabled] = useState(false);
  const [done, setDone] = useState(false);

  const listRef = useRef<FlatList<Msg>>(null);
  const builderRef = useRef(new ProfileBuilder());
  // -1 = esperando o nome; 0..19 = perguntas; 20 = encerrado
  const stageRef = useRef(-1);
  const vagueUsedRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);

  // Modo IA (backend Claude API)
  const apiHistoryRef = useRef<ApiMessage[]>([]);
  const userIdRef = useRef<string>('');
  const [aiTurns, setAiTurns] = useState(0);

  const scrollEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  // Gera o id FORA do updater (nextId é impuro; no StrictMode o updater roda 2x
  // e chamar nextId() dentro dele gera chaves duplicadas).
  const addMsg = (from: 'grao' | 'user', text: string) => {
    const id = nextId();
    setMessages((m) => [...m, { id, from, text }]);
  };

  const pushGrao = async (texts: string[]) => {
    for (const t of texts) {
      setTyping(true);
      scrollEnd();
      await wait(TYPING_DELAY);
      setTyping(false);
      addMsg('grao', t);
      scrollEnd();
      await wait(180);
    }
  };

  const pushUser = (t: string) => {
    addMsg('user', t);
    scrollEnd();
  };

  const askQuestion = async (index: number) => {
    const q = QUESTIONS[index];
    const name = builderRef.current.name;
    await pushGrao([q.text.replace('{name}', name)]);
    setChips(q.options ?? null);
    setInputEnabled(true);
  };

  const finishConversation = async () => {
    stageRef.current = QUESTIONS.length;
    const b = builderRef.current;
    try {
      const profile = b.build();
      await saveProfile(profile);
      const tmpl = CLOSING_BY_CHANNEL[profile.sensory.dominant] || CLOSING_BY_CHANNEL.visual;
      await pushGrao([tmpl.replace('{name}', b.name || 'você')]);
    } catch (err) {
      console.warn('[conversa] erro no encerramento:', err);
    } finally {
      // Garante que o botão "Continuar" aparece e o usuário segue o fluxo.
      setDone(true);
    }
  };

  const advance = async () => {
    const next = stageRef.current + 1;
    stageRef.current = next;
    if (next >= QUESTIONS.length) {
      await finishConversation();
    } else {
      await askQuestion(next);
    }
  };

  const handleAnswer = async (value: string, source: 'chip' | 'text', option?: ChipOption) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setChips(null);
    setInputEnabled(false);
    pushUser(value);

    const b = builderRef.current;

    try {
      // Estágio do nome
      if (stageRef.current === -1) {
        b.name = value.trim().split(/\s+/)[0] || 'você';
        b.name = b.name.charAt(0).toUpperCase() + b.name.slice(1);
        await pushGrao([NAME_ACK.replace('{name}', b.name)]);
        await advance();
        return;
      }

      const q = QUESTIONS[stageRef.current];

      // Se perguntarem "pra que serve isso?" — responde e repete a pergunta.
      if (source === 'text' && DEFLECTION_RE.test(value)) {
        await pushGrao([DEFLECTION]);
        setChips(q.options ?? null);
        setInputEnabled(true);
        return;
      }

      // Resposta vaga em texto livre: aprofunda uma vez.
      if (
        source === 'text' &&
        (value.trim().length < 4 || VAGUE_RE.test(value.trim())) &&
        !vagueUsedRef.current.has(q.id)
      ) {
        vagueUsedRef.current.add(q.id);
        const follow = VAGUE_FOLLOWUPS[Math.floor(Math.random() * VAGUE_FOLLOWUPS.length)];
        await pushGrao([follow]);
        setChips(q.options ?? null);
        setInputEnabled(true);
        return;
      }

      // Registra e pontua (silenciosamente).
      b.record(q.id, value, source);
      if (option) {
        b.addVak(option.vak);
        b.addOcean(option.ocean);
      } else {
        b.addVak(scoreFreeText(value));
      }

      const ack = q.acks[Math.floor(Math.random() * q.acks.length)] || 'Anotado. 🌱';
      await pushGrao([ack]);
      await advance();
    } catch (err) {
      // Nunca deixa a conversa travada: recupera e reabilita a interação.
      console.warn('[conversa] erro ao processar resposta:', err);
      setInputEnabled(true);
    } finally {
      busyRef.current = false;
    }
  };

  // ---------- Modo IA (backend Claude API) ----------
  const startAi = async () => {
    userIdRef.current = await getUserId();
    // Kickoff oculto para atender ao contrato da API (1ª mensagem = user).
    apiHistoryRef.current = [{ role: 'user', content: 'Oi! Pode começar.' }];
    setTyping(true);
    scrollEnd();
    try {
      const res = await postTurn(userIdRef.current, apiHistoryRef.current);
      setTyping(false);
      addMsg('grao', res.message);
      apiHistoryRef.current.push({ role: 'assistant', content: res.message });
      setInputEnabled(true);
    } catch {
      setTyping(false);
      addMsg('grao', 'Tive um probleminha pra começar. Tenta de novo daqui a pouco. 🌱');
      setInputEnabled(true);
    }
  };

  const sendAi = async (text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setInputEnabled(false);
    pushUser(text);
    apiHistoryRef.current.push({ role: 'user', content: text });
    setAiTurns((n) => n + 1);

    setTyping(true);
    scrollEnd();
    try {
      const res = await postTurn(userIdRef.current, apiHistoryRef.current);
      setTyping(false);
      addMsg('grao', res.message);
      apiHistoryRef.current.push({ role: 'assistant', content: res.message });

      if (res.done) {
        // O perfil já foi salvo no backend; guarda o mínimo localmente p/ a entrega.
        await saveMinimalProfile({
          name: builderRef.current.name || 'você',
          channel: (res.channel || 'visual') as Channel,
          emotionalHint: (res.emotionalHint as EmotionalFamily) || null,
        });
        if (res.emotionalHint) await setMoment(res.emotionalHint as EmotionalFamily);
        setDone(true);
      } else {
        setInputEnabled(true);
      }
    } catch {
      setTyping(false);
      addMsg('grao', 'Ops, não consegui responder agora. Pode repetir?');
      setInputEnabled(true);
    }
    busyRef.current = false;
  };

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    if (AI_MODE) sendAi(t);
    else handleAnswer(t, 'text');
  };

  // Pular a conversa: salva um perfil-base mínimo e segue direto no fluxo.
  const skipConversation = async () => {
    try {
      await saveMinimalProfile({
        name: builderRef.current.name || 'você',
        channel: 'visual',
        emotionalHint: null,
      });
    } catch {}
    navigation.navigate('Notification');
  };

  useEffect(() => {
    (async () => {
      if (AI_MODE) {
        await startAi();
      } else {
        await pushGrao(INTRO_MESSAGES);
        setInputEnabled(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = AI_MODE
    ? Math.max(0.05, Math.min(1, aiTurns / 20))
    : Math.max(0, Math.min(1, (stageRef.current + 1) / (QUESTIONS.length + 1)));

  // No web, o card do React Navigation não limita a altura à viewport, e o
  // flex-grow:1 do container faz o flexbox ignorar uma altura fixa. Então
  // fixamos a altura da janela E removemos o flex-grow (+ overflow hidden),
  // para a FlatList encolher e rolar por dentro, mantendo chips/input visíveis.
  const webHeight =
    Platform.OS === 'web'
      ? {
          height: Dimensions.get('window').height,
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: 'auto' as const,
          overflow: 'hidden' as const,
        }
      : null;

  return (
    <SafeAreaView style={[styles.container, webHeight]}>
      <StepProgress step={3} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoSlot}>
          <GraoSymbol size={logoSize} color={colors.accent} filled={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Grão</Text>
          <Text style={styles.headerSub}>Nossa conversa</Text>
        </View>
        {!done && (
          <TouchableOpacity
            onPress={skipConversation}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="chat-skip"
          >
            <Text style={styles.skip}>Pular</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Body>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollEnd}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.from === 'grao' ? styles.bubbleGrao : styles.bubbleUser,
              ]}
            >
              <Text style={item.from === 'grao' ? styles.bubbleGraoText : styles.bubbleUserText}>
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            typing ? (
              <View style={[styles.bubble, styles.bubbleGrao, styles.typingBubble]}>
                <Text style={styles.typingDots}>● ● ●</Text>
              </View>
            ) : null
          }
        />

        {/* Chips de resposta rápida */}
        {chips && !done && (
          <View style={styles.chipsWrap}>
            {chips.map((c, i) => (
              <TouchableOpacity
                key={c.label}
                testID={`chip-${i}`}
                style={styles.chip}
                activeOpacity={0.85}
                onPress={() => handleAnswer(c.label, 'chip', c)}
              >
                <Text style={styles.chipText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botão final */}
        {done ? (
          <Button
            testID="chat-continue"
            title="Continuar"
            onPress={() => navigation.navigate('Notification')}
            style={{ marginHorizontal: 20, marginBottom: 16 }}
          />
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              testID="chat-input"
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Escreva aqui…"
              placeholderTextColor={colors.foregroundSubtle}
              editable={inputEnabled}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              testID="chat-send"
              activeOpacity={0.85}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              {input.trim() ? (
                <LinearGradient
                  colors={['#F0A53A', '#E0891A', '#C46E10']}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={styles.sendBtn}
                >
                  <Text style={styles.sendText}>➤</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                  <Text style={styles.sendText}>➤</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.gutter,
    paddingVertical: 4,
    minHeight: logoSlot,
  },
  logoSlot: {
    width: logoSlot,
    height: logoSlot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  skip: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foregroundMuted },
  progressTrack: { height: 1, backgroundColor: colors.hairline, marginHorizontal: space.gutter },
  progressFill: { height: 1, backgroundColor: colors.accent },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: space.gutter, paddingTop: 20, paddingBottom: 16, gap: 18 },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleGrao: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    maxWidth: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bubble,
  },
  bubbleGraoText: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.foreground,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  bubbleUserText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.foreground,
    lineHeight: 26,
  },
  typingBubble: { paddingVertical: 8 },
  typingDots: { fontSize: 8, color: colors.foregroundSubtle, letterSpacing: 2 },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: { fontFamily: fonts.serif, fontSize: fontSizes.sm, color: colors.foreground },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    ...(shadows.sm as object),
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 12,
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.peneira },
  sendText: { color: colors.accentForeground, fontSize: 16 },
});
