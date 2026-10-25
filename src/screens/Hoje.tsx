import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Share,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Linking,
  Pressable,
  Modal,
} from 'react-native';
import {
  BookOpen,
  Feather,
  Heart,
  Lock,
  MessageCircle,
  Mic,
  Music2,
  Share2,
  Sprout,
  type LucideIcon,
} from '../components/icons';
import AvaliarSemente from '../components/AvaliarSemente';
import Responder from '../components/Responder';
import { useLeituraEmVoz } from '../components/OuvirTexto';
import { partesDaReferencia } from '../onboarding/biblia';
import MusicPlayer from '../components/MusicPlayer';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import ProfileButton from '../components/ProfileButton';
import { AncoraDoGuia } from '../components/GuiaPrimeiroAcesso';
import HeaderCampoFundo from '../components/ui/HeaderCampoFundo';
import HeaderGamificacao from '../components/ui/HeaderGamificacao';
import { useFocusEffect } from '@react-navigation/native';
import { todaySeed, Seed, EmotionalFamily } from '../data/seeds';
import {
  selectTodaySeed,
  getMoment,
  plantarSementeDeHoje,
  devocionalDeHoje,
  resumoDeLeitura,
  type ResumoLeitura,
} from '../onboarding/seedDelivery';
import { minhaAssinatura, minhasPreferencias } from '../onboarding/assinatura';
import { meusGraos, type ResumoGraos } from '../onboarding/graos';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { space } from '../theme/spacing';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

const NATIVE = Platform.OS !== 'web';
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type TopicoId =
  | 'semente'
  | 'reflexao'
  | 'pratica'
  | 'oracao'
  | 'louvor';

function weekDates() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Como o plano pago se chama na tela.
 *
 * Num lugar só porque ele aparece quatro vezes no aviso, e porque o nome ainda
 * está em discussão: o servidor e a tela de assinatura dizem "Plantio", e a
 * palavra "semente" é o conteúdo de cada dia. Trocar aqui troca em todas.
 */
const NOME_DO_PLANO = 'Plantio';

export default function Hoje({ navigation }: { navigation: any }) {
  const [pago, setPago] = useState<boolean | null>(null);
  const [seed, setSeed] = useState<Seed>(todaySeed);
  const [devocao, setDevocao] = useState<Seed | null>(null);
  const [trocaUsada, setTrocaUsada] = useState(false);
  const [plantada, setPlantada] = useState(true);
  const [waPref, setWaPref] = useState<{ numero: string; frase: string } | null>(null);
  const [plantando, setPlantando] = useState(false);
  const [ligacao, setLigacao] = useState<string | null>(null);
  const [cardAberto, setCardAberto] = useState<TopicoId | null>(null);
  /**
   * Qual parte a pessoa tocou estando sem o plano.
   *
   * Antes o toque no cadeado jogava direto na tela do Plantio, sem uma palavra:
   * a pessoa tocava em "Oração" e aparecia uma tela de planos. O salto deixava
   * a pergunta no ar — por que isto está fechado, e o que eu ganho abrindo.
   * O aviso responde antes de pedir qualquer coisa.
   */
  const [avisoPlano, setAvisoPlano] = useState<string | null>(null);
  const [graos, setGraos] = useState<ResumoGraos | null>(null);
  const [resumo, setResumo] = useState<ResumoLeitura | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const momentoCarregado = useRef<EmotionalFamily | null>(null);
  const seedCarregada = useRef(false);
  const days = weekDates();
  const todayIdx = new Date().getDay();

  useFocusEffect(
    React.useCallback(() => {
      let vivo = true;
      (async () => {
        const agora = await getMoment();
        if (!vivo) return;

        const [a, devo, g, r] = await Promise.all([
          minhaAssinatura(),
          devocionalDeHoje().catch(() => null),
          meusGraos().catch(() => null),
          resumoDeLeitura().catch(() => null),
        ]);
        if (!vivo) return;

        const completo = !!a?.completo;
        setPago(completo);
        if (devo) setDevocao(devo.seed);
        setGraos(g);
        setResumo(r);

        if (!completo) {
          reveal.setValue(1);
          return;
        }

        const precisaDaSemente =
          !seedCarregada.current || agora !== momentoCarregado.current;
        if (!precisaDaSemente) {
          reveal.setValue(1);
          return;
        }

        seedCarregada.current = true;
        reveal.setValue(0);
        try {
          const dados = await selectTodaySeed();
          if (!vivo) return;
          setSeed(dados.seed);
          setLigacao(dados.ligacao ?? null);
          setTrocaUsada(!!dados.trocaUsada);
          setPlantada(!!dados.plantada);
          momentoCarregado.current = agora;
        } catch {
          if (!vivo) return;
          setSeed(todaySeed);
        }
        Animated.timing(reveal, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE,
        }).start();
      })();
      return () => {
        vivo = false;
      };
    }, [reveal])
  );

  useEffect(() => {
    let vivo = true;
    minhasPreferencias().then((p) => {
      if (!vivo || !p?.whatsappLigado || !p.whatsappNumero || !p.pedidoDaSemente) return;
      setWaPref({ numero: p.whatsappNumero, frase: p.pedidoDaSemente });
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const refSemente = partesDaReferencia(seed.reference);
  const abrirCapituloSemente = refSemente
    ? () => navigation.navigate('Biblia', {
        livro: refSemente.livro,
        capitulo: refSemente.capitulo,
      })
    : undefined;

  const guardarNoWhatsapp = () => {
    if (!waPref) return;
    const url = `https://wa.me/${waPref.numero}?text=${encodeURIComponent(waPref.frase)}`;
    Linking.openURL(url).catch(() => {});
  };

  /**
   * Abre a parte em tela cheia.
   *
   * Antes o card abria no próprio lugar, dividindo a tela com os outros cinco
   * fechados logo abaixo. Serve para espiar, não para ler: a Reflexão tem três
   * minutos e a Oração é para ser rezada devagar. Em tela cheia o texto fica
   * sozinho, e o botão de ouvir fica fixo embaixo para quem prefere escutar.
   */
  const abrirParte = (parte: 'versiculo' | 'reflexao' | 'pratica' | 'oracao' | 'louvor') => {
    navigation.navigate('ParteDaSemente', { parte });
  };

  const plantar = async () => {
    if (plantando) return;
    setPlantando(true);
    setPlantada(true);
    const ok = await plantarSementeDeHoje();
    if (!ok) setPlantada(false);
    setPlantando(false);
  };

  const share = async () => {
    const message = (pago ? seed.compartilhavel : devocao?.compartilhavel)?.trim();
    if (!message) return;
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message } : { message, title: 'Grão' }
      );
    } catch {
      /* cancelou */
    }
  };

  // Plantio / Momento / Settings moram no stack pai; Hoje é aba.
  // Sem subir o parent, o navigate procura só nas tabs e a tela não abre.
  const irStack = (tela: string, params?: Record<string, unknown>) => {
    const pai = navigation.getParent?.();
    if (pai) {
      pai.navigate(tela as never, params as never);
      return;
    }
    navigation.navigate(tela, params);
  };
  const irPlantio = () => irStack('Plantio');
  const contarMomento = () => irStack('MomentoSemente', { real: true });

  const isPago = pago === true;
  const contentOp = reveal;
  const contentTy = reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const progresso = (() => {
    if (pago === null) return 0;
    if (!isPago) return devocao ? 25 : 0;
    if (!plantada) return 10;
    let p = 35;
    if (seed.reflection) p += 15;
    if (seed.practice) p += 15;
    if (seed.prayer) p += 20;
    if (seed.music) p += 15;
    return Math.min(100, p);
  })();

  const dateLine = (() => {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = agora
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${dia} ${mes} ${agora.getFullYear()}`;
  })();

  const heroTitulo = 'Semente do dia';

  // Mesmos números do Campo / app publicado: sequência e saldo de grãos.
  const sequencia =
    graos && graos.sequencia > 0
      ? graos.sequencia
      : resumo
        ? resumo.sequencia
        : 0;
  const diasNoAno = graos?.diasVividos ?? resumo?.total ?? null;

  const toggle = (id: TopicoId) =>
    setCardAberto((atual) => (atual === id ? null : id));

  // Paywall do servidor: null = bloqueado (gancho para assinar).
  const praticaBloqueada = isPago && plantada && seed.practice === null;
  const oracaoBloqueada = isPago && plantada && seed.prayer === null;
  const louvorBloqueado = isPago && plantada && seed.music === null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <HeaderCampoFundo>
          <View style={styles.headerTop}>
            <AncoraDoGuia id="hoje-perfil">
              <ProfileButton onPress={() => irStack('Settings')} size={36} />
            </AncoraDoGuia>
            <AncoraDoGuia id="hoje-sequencia">
              <HeaderGamificacao
                navigation={navigation}
                sequencia={sequencia}
              />
            </AncoraDoGuia>
          </View>

          <View style={styles.week}>
            {days.map((d, i) => {
              const active = i === todayIdx;
              return (
                <View key={i} style={styles.dayCol}>
                  <Text style={styles.dayLetter}>{WEEK[i]}</Text>
                  <View style={[styles.dayDot, active && styles.dayDotActive]}>
                    <Text style={[styles.dayNum, active && styles.dayNumActive]}>
                      {d.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progresso hoje</Text>
              <Text style={styles.progressPct}>{progresso}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progresso}%` }]} />
            </View>
            {diasNoAno !== null ? (
              <Text style={styles.progressAno}>
                {diasNoAno} de 365 dias
              </Text>
            ) : null}
          </View>
      </HeaderCampoFundo>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          {pago === null ? (
            <View style={styles.esperando}>
              <ActivityIndicator color={colors.earth} />
            </View>
          ) : (
            <Animated.View style={{ opacity: contentOp, transform: [{ translateY: contentTy }] }}>
              <View style={styles.sheetHead}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.dateLine}>{dateLine}</Text>
                  <Text style={styles.heroTitle}>{heroTitulo}</Text>
                </View>
                <TouchableOpacity onPress={share} hitSlop={10} accessibilityLabel="Compartilhar">
                  <Share2 size={18} color={colors.earth} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {ligacao && isPago ? (
                <Text style={styles.ligacao}>{ligacao}</Text>
              ) : null}

              <AncoraDoGuia id="hoje-cards">
              {/* 1. Devocional diário: abre a tela própria (365 páginas). */}
              <TopicoCard
                titulo="Devocional"
                tempo="5 min"
                Icon={BookOpen}
                aberto={false}
                onPress={() => irStack('Devocional')}
              />

              {/* 2. Versículo — só no plano pago */}
              <TopicoCard
                titulo="Versículo"
                tempo="5 min"
                Icon={Sprout}
                aberto={cardAberto === 'semente'}
                onPress={() => {
                  if (!isPago) {
                    setAvisoPlano('Versículo');
                    return;
                  }
                  if (!plantada) {
                    contarMomento();
                    return;
                  }
                  abrirParte('versiculo');
                }}
                bloqueado={!isPago || !plantada}
                cabecalho={
                  isPago && plantada
                    ? (seed.reference || seed.title || 'Sua semente')
                    : 'Disponível no Plantio'
                }
                trechosOuvir={
                  isPago && plantada
                    ? [seed.passage || '', seed.reference || '']
                    : undefined
                }
                onLer={isPago && plantada ? abrirCapituloSemente : undefined}
                textoLeitura={isPago && plantada ? seed.passage : undefined}
                onOuvirExtra={!plantada && isPago ? contarMomento : undefined}
                onLerExtra={!plantada && isPago ? () => { void plantar(); } : undefined}
                acoesExtras={
                  isPago && plantada && !trocaUsada ? (
                    <Pressable onPress={contarMomento} style={styles.linkMomento}>
                      <Mic size={14} color={colors.warmWhite} strokeWidth={2} />
                      <Text style={styles.linkMomentoTexto}>Meu sentimento mudou</Text>
                    </Pressable>
                  ) : null
                }
              />

              {/* 3. Reflexão — da semente, após plantar */}
              <TopicoCard
                titulo="Reflexão"
                tempo="3 min"
                Icon={Feather}
                aberto={cardAberto === 'reflexao'}
                onPress={() => {
                  if (!isPago) {
                    setAvisoPlano('Reflexão');
                    return;
                  }
                  if (!plantada) {
                    contarMomento();
                    return;
                  }
                  abrirParte('reflexao');
                }}
                bloqueado={!isPago || !plantada}
                cabecalho={
                  isPago && plantada
                    ? (seed.reference || seed.title || 'Reflexão')
                    : 'Disponível no Plantio'
                }
                trechosOuvir={
                  isPago && plantada && seed.reflection
                    ? [seed.reflection]
                    : undefined
                }
                textoLeitura={isPago && plantada ? seed.reflection : undefined}
              />

              {/* 4. Prática — null = bloqueado pelo servidor */}
              <TopicoCard
                titulo="Prática"
                tempo="2 min"
                Icon={MessageCircle}
                aberto={cardAberto === 'pratica'}
                onPress={() => {
                  if (!isPago || !plantada || praticaBloqueada || !seed.practice) {
                    if (!isPago) setAvisoPlano('Prática');
                    else if (!plantada) contarMomento();
                    return;
                  }
                  abrirParte('pratica');
                }}
                bloqueado={!isPago || !plantada || praticaBloqueada || !seed.practice}
                cabecalho={seed.practice ? 'Prática de hoje' : 'Disponível no Plantio'}
                trechosOuvir={seed.practice ? [seed.practice] : undefined}
                textoLeitura={seed.practice || undefined}
              />

              {/* 5. Oração */}
              <TopicoCard
                titulo="Oração"
                tempo="2 min"
                Icon={Heart}
                aberto={cardAberto === 'oracao'}
                onPress={() => {
                  if (!isPago || !plantada || oracaoBloqueada || !seed.prayer) {
                    if (!isPago) setAvisoPlano('Oração');
                    else if (!plantada) contarMomento();
                    return;
                  }
                  abrirParte('oracao');
                }}
                bloqueado={!isPago || !plantada || oracaoBloqueada || !seed.prayer}
                cabecalho={seed.prayer ? 'Oração de hoje' : 'Disponível no Plantio'}
                trechosOuvir={seed.prayer ? [seed.prayer] : undefined}
                textoLeitura={seed.prayer || undefined}
              />

              {/* 6. Louvor */}
              <TopicoCard
                titulo="Louvor"
                tempo="3 min"
                Icon={Music2}
                aberto={cardAberto === 'louvor'}
                onPress={() => {
                  if (!isPago || !plantada || louvorBloqueado || !seed.music) {
                    if (!isPago) setAvisoPlano('Louvor');
                    else if (!plantada) contarMomento();
                    return;
                  }
                  abrirParte('louvor');
                }}
                bloqueado={!isPago || !plantada || louvorBloqueado || !seed.music}
                cabecalho={
                  seed.music
                    ? `${seed.music.title}${seed.music.artist ? ` · ${seed.music.artist}` : ''}`
                    : 'Disponível no Plantio'
                }
                acoesExtras={
                  seed.music ? (
                    <MusicPlayer music={seed.music} inline style={{ marginTop: 4 }} />
                  ) : null
                }
              />
              </AncoraDoGuia>

              {isPago && plantada ? (
                <>
                  <AvaliarSemente seedId={seed.id} />
                  <Responder />
                  {waPref ? (
                    <TouchableOpacity onPress={guardarNoWhatsapp} style={styles.otherLink}>
                      <Text style={styles.otherLinkText}>Guardar no WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
            </Animated.View>
          )}
        </ScrollView>
      </View>

      {/* O aviso do plano, antes do salto.
          
          Tocar num cadeado levava direto à tela de planos, sem uma palavra: a
          pessoa tocava em "Oração" e aparecia um preço. Aqui ela lê o que está
          fechado e o que ganha abrindo, e só então decide — e "Agora não" é
          uma saída de verdade, que devolve para a tela onde ela estava. */}
      <Modal
        visible={!!avisoPlano}
        transparent
        animationType="fade"
        onRequestClose={() => setAvisoPlano(null)}
      >
        <Pressable style={styles.avisoFundo} onPress={() => setAvisoPlano(null)}>
          {/* O toque dentro do cartão não fecha: só o de fora. */}
          <Pressable style={styles.avisoCartao} onPress={() => {}}>
            <View style={styles.avisoSelo}>
              <Lock size={16} color={colors.earth} strokeWidth={2.2} />
              <Text style={styles.avisoSeloTexto}>Exclusivo no {NOME_DO_PLANO}</Text>
            </View>

            <Text style={styles.avisoTitulo}>
              {avisoPlano} faz parte do {NOME_DO_PLANO}
            </Text>

            <Text style={styles.avisoTexto}>
              No {NOME_DO_PLANO} você recebe o versículo, a reflexão, a prática,
              a oração e o louvor — tudo escolhido para o seu momento, todo dia.
            </Text>

            <Pressable
              style={styles.avisoBotao}
              onPress={() => { setAvisoPlano(null); irPlantio(); }}
              accessibilityRole="button"
            >
              <Text style={styles.avisoBotaoTexto}>Começar 7 dias grátis</Text>
            </Pressable>

            <Pressable
              onPress={() => setAvisoPlano(null)}
              style={styles.avisoAgoraNao}
              accessibilityRole="button"
            >
              <Text style={styles.avisoAgoraNaoTexto}>Agora não</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TopicoCard({
  titulo,
  tempo,
  Icon,
  aberto,
  onPress,
  bloqueado,
  cabecalho,
  trechosOuvir,
  onLer,
  onOuvirExtra,
  onLerExtra,
  textoLeitura,
  acoesExtras,
}: {
  titulo: string;
  tempo: string;
  Icon: LucideIcon;
  aberto: boolean;
  onPress: () => void;
  bloqueado?: boolean;
  /** Livro + referência (ou título curto) no estilo BiblicAI. */
  cabecalho?: string;
  trechosOuvir?: string[];
  onLer?: () => void;
  /** Quando ainda não há áudio da API (ex.: semente antes de plantar). */
  onOuvirExtra?: () => void;
  onLerExtra?: () => void;
  /** Texto mostrado ao tocar Ler, se não houver navegação de capítulo. */
  textoLeitura?: string | null;
  acoesExtras?: React.ReactNode;
}) {
  const leitura = useLeituraEmVoz(trechosOuvir ?? []);
  const [mostrandoTexto, setMostrandoTexto] = useState(false);
  const expandido = aberto && !bloqueado;

  const aoOuvir = () => {
    if (trechosOuvir?.length) leitura.alternar();
    else onOuvirExtra?.();
  };

  const aoLer = () => {
    if (onLer) {
      onLer();
      return;
    }
    if (onLerExtra) {
      onLerExtra();
      return;
    }
    if (textoLeitura) setMostrandoTexto((v) => !v);
  };

  const temOuvir = !!(trechosOuvir?.length || onOuvirExtra);
  const temLer = !!(onLer || onLerExtra || textoLeitura);

  if (expandido) {
    return (
      <View style={[styles.card, styles.cardDestaque]}>
        <Pressable onPress={onPress} style={styles.cardRow}>
          <Icon size={22} color={colors.white} strokeWidth={2} />
          <Text style={[styles.cardTitulo, styles.cardTituloLight]}>{titulo}</Text>
          <Text style={styles.cardTempoLight}>{tempo}</Text>
        </Pressable>

        {cabecalho ? <Text style={styles.destaqueTitulo}>{cabecalho}</Text> : null}

        {mostrandoTexto && textoLeitura ? (
          <Text style={styles.cardCorpoLight}>{textoLeitura}</Text>
        ) : null}

        {(temOuvir || temLer) ? (
          <View style={styles.cardAcoes}>
            {temOuvir ? (
              <Pressable onPress={aoOuvir} style={styles.btnPrimario}>
                <Text style={styles.btnPrimarioTexto}>
                  {leitura.tocando ? 'Parar' : 'Ouvir'}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {temLer ? (
              <Pressable onPress={aoLer} style={styles.btnSecundario}>
                <Text style={styles.btnSecundarioTexto}>Ler</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        ) : null}

        {acoesExtras}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={bloqueado ? `${titulo}, bloqueado` : titulo}
    >
      {bloqueado ? (
        <View style={styles.cadeadoBadge} accessibilityElementsHidden>
          <Lock size={12} color={colors.white} strokeWidth={2.4} />
        </View>
      ) : null}

      <View style={styles.cardRow}>
        <Icon size={20} color={colors.earth} strokeWidth={1.9} />
        <Text style={styles.cardTitulo}>{titulo}</Text>
        <Text style={styles.cardTempo}>{tempo}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avisoFundo: {
    flex: 1,
    backgroundColor: 'rgba(41, 38, 33, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avisoCartao: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.warmWhite,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  avisoSelo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAccent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  avisoSeloTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.earth,
  },
  avisoTitulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 29,
    color: colors.charcoal,
    letterSpacing: -0.3,
  },
  avisoTexto: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 26,
    color: colors.foregroundMuted,
  },
  avisoBotao: {
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avisoBotaoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
  },
  avisoAgoraNao: { alignItems: 'center', paddingVertical: 10 },
  avisoAgoraNaoTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.warmGray,
  },

  root: { flex: 1, backgroundColor: '#241708' },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginTop: 10,
    marginBottom: 18,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayCol: { alignItems: 'center', gap: 8, width: 36 },
  dayLetter: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(252,250,246,0.65)',
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(252,250,246,0.22)',
  },
  dayDotActive: {
    backgroundColor: colors.warmWhite,
    borderColor: colors.warmWhite,
  },
  dayNum: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: 'rgba(252,250,246,0.85)',
  },
  dayNumActive: {
    color: colors.headerBrand,
    fontFamily: fonts.sansSemi,
  },
  progressBlock: { gap: 8 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: 'rgba(252,250,246,0.75)',
  },
  progressPct: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    color: colors.warmWhite,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(252,250,246,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warmWhite,
    borderRadius: 2,
  },
  progressAno: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: 'rgba(252,250,246,0.65)',
    marginTop: 2,
  },
  sheet: {
    flex: 1,
    marginTop: -16,
    backgroundColor: '#F4F4F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 28,
  },
  esperando: { paddingVertical: 60, alignItems: 'center' },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  dateLine: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.earth,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.earth,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  ligacao: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 22,
    color: colors.warmGray,
    marginBottom: 14,
  },
  card: {
    position: 'relative',
    backgroundColor: colors.warmWhite,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sand,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    ...(shadows.sm as object),
  },
  cadeadoBadge: {
    position: 'absolute',
    top: -7,
    right: 14,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.warmWhite,
    ...(shadows.sm as object),
  },
  cardDestaque: {
    backgroundColor: colors.headerBrand,
    borderColor: colors.headerBrand,
    paddingBottom: 18,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardTitulo: {
    flex: 1,
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.earth,
  },
  cardTituloLight: {
    color: colors.white,
  },
  cardTempo: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.earth,
  },
  cardTempoLight: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: 'rgba(252,250,246,0.7)',
  },
  destaqueTitulo: {
    marginTop: 16,
    fontFamily: fonts.sansSemi,
    fontSize: 22,
    lineHeight: 28,
    color: colors.white,
  },
  cardCorpo: {
    marginTop: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
  cardCorpoLight: {
    marginTop: 10,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(252,250,246,0.88)',
  },
  cardAcoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cardAcoesClaras: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnPrimario: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimarioTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    letterSpacing: 0.6,
    color: colors.white,
    textTransform: 'uppercase',
  },
  btnSecundario: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(252,250,246,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecundarioTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    letterSpacing: 0.6,
    color: colors.white,
    textTransform: 'uppercase',
  },
  btnOutline: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.earth,
    textTransform: 'uppercase',
  },
  linkMomento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 6,
  },
  linkMomentoTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.warmWhite,
  },
  otherLink: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  otherLinkText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.earth,
  },
});
