// Uma parte da semente, em tela cheia: Versículo, Reflexão, Prática, Oração
// ou Louvor.
//
// POR QUE TELA, E NÃO O CARD QUE ABRE NO LUGAR
//
// No desenho anterior cada parte era um card sanfona na tela Hoje: tocava,
// expandia ali mesmo, e o texto dividia espaço com os outros cinco cards
// fechados logo abaixo. Funciona para espiar, não para ler — e a Reflexão tem
// três minutos de leitura, a Oração é para ser rezada devagar.
//
// Em tela cheia o texto fica sozinho, com a largura e o respiro de uma página.
// É a diferença entre mostrar que o conteúdo existe e entregar o conteúdo.
//
// UMA TELA PARA AS CINCO
//
// `parte` escolhe o que mostrar. Cinco arquivos quase idênticos seriam cinco
// lugares para corrigir o mesmo espaçamento, e um dia quatro estariam certos.
//
// O OUVIR FICA FIXO EMBAIXO
//
// Não rola junto com o texto. Quem prefere escutar decide isso ANTES de
// começar a ler, e procurar o botão no fim de três minutos de rolagem é pedir
// para a pessoa ler o que ela já tinha dito que não queria ler.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft, ChevronRight, Feather, Heart, MessageCircle, Music2,
  Pause, Play, Sprout,
} from '../components/icons';
import type { LucideIcon } from '../components/icons';
import { useLeituraEmVoz } from '../components/OuvirTexto';
import MusicPlayer from '../components/MusicPlayer';
import HeaderCampoFundo from '../components/ui/HeaderCampoFundo';
import HeaderGamificacao from '../components/ui/HeaderGamificacao';
import { Seed, todaySeed } from '../data/seeds';
import { selectTodaySeed, plantarSementeDeHoje } from '../onboarding/seedDelivery';
import { partesDaReferencia } from '../onboarding/biblia';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { radius } from '../theme/radius';
import { webScreenFill, webScroll } from '../theme/webScreen';

export type ParteId = 'versiculo' | 'reflexao' | 'pratica' | 'oracao' | 'louvor';

const TITULOS: Record<ParteId, { titulo: string; Icon: LucideIcon }> = {
  versiculo: { titulo: 'Versículo', Icon: Sprout },
  reflexao: { titulo: 'Reflexão', Icon: Feather },
  pratica: { titulo: 'Prática', Icon: MessageCircle },
  oracao: { titulo: 'Oração', Icon: Heart },
  louvor: { titulo: 'Louvor', Icon: Music2 },
};

/** O texto de cada parte, ou null quando o plano da pessoa não abre aquela. */
/**
 * A ordem da leitura, e ela não é arbitrária.
 *
 * Primeiro a Palavra, depois o que ela diz para esta pessoa hoje, depois o
 * gesto, depois a conversa com Deus, e o louvor por último — é a sequência de
 * um devocional, e é a mesma do WhatsApp. Quem lê um pedaço por dia não perde
 * nada; quem quer o caminho inteiro agora tem para onde seguir sem voltar ao
 * índice a cada parte.
 */
const ORDEM: ParteId[] = ['versiculo', 'reflexao', 'pratica', 'oracao', 'louvor'];

/**
 * A próxima parte que TEM conteúdo hoje.
 *
 * Pula o que veio vazio do servidor. Oferecer "continuar para a Prática"
 * quando não há prática leva a pessoa a uma tela que diz "não disponível" —
 * um beco com o nome de caminho.
 */
function proximaParte(atual: ParteId, seed: Seed | null): ParteId | null {
  if (!seed) return null;
  const i = ORDEM.indexOf(atual);
  for (let k = i + 1; k < ORDEM.length; k++) {
    const p = ORDEM[k];
    const tem = p === 'louvor' ? !!seed.music : !!textoDa(p, seed);
    if (tem) return p;
  }
  return null;
}

function textoDa(parte: ParteId, seed: Seed): string | null {
  if (parte === 'versiculo') return seed.passage?.trim() || null;
  if (parte === 'reflexao') return seed.reflection?.trim() || null;
  if (parte === 'pratica') return seed.practice?.trim() || null;
  if (parte === 'oracao') return seed.prayer?.trim() || null;
  return null; // louvor não é texto
}

export default function ParteDaSemente({
  navigation,
  route,
}: { navigation: any; route: any }) {
  const parte: ParteId = route?.params?.parte ?? 'versiculo';
  const { titulo, Icon } = TITULOS[parte] ?? TITULOS.versiculo;

  const [seed, setSeed] = useState<Seed | null>(null);
  const [carregando, setCarregando] = useState(true);
  /** Já plantada hoje, por qualquer porta. Decide se o fim oferece plantar. */
  const [plantada, setPlantada] = useState(false);
  const [plantando, setPlantando] = useState(false);

  // Recarrega ao ganhar foco. A semente pode ter sido plantada no WhatsApp
  // enquanto esta tela estava empilhada atrás, e aí o que ela mostra mudou.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        setCarregando(true);
        try {
          const dados = await selectTodaySeed();
          if (vivo) {
            setSeed(dados.seed);
            setPlantada(!!dados.plantada);
          }
        } catch {
          if (vivo) setSeed(todaySeed);
        } finally {
          if (vivo) setCarregando(false);
        }
      })();
      return () => { vivo = false; };
    }, [])
  );

  const texto = seed ? textoDa(parte, seed) : null;
  // A fala vai em trechos: lido de uma vez, um parágrafo emenda no outro sem
  // respiro, e oração sem pausa não soa como oração.
  const trechos = texto ? texto.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean) : [];
  const leitura = useLeituraEmVoz(trechos);

  const referencia = seed ? partesDaReferencia(seed.reference) : null;
  const abrirCapitulo = referencia
    ? () => navigation.navigate('Main', {
        screen: 'Biblia',
        params: { livro: referencia.livro, capitulo: referencia.capitulo },
      })
    : undefined;

  const podeOuvir = parte !== 'louvor' && trechos.length > 0;

  const proxima = proximaParte(parte, seed);
  /**
   * O fim da última parte é o gesto do dia.
   *
   * Plantar FECHA o dia, não o abre: quem chegou até aqui passou pelas cinco
   * fases e agora efetiva a semente. Por isso o fim não depende de `plantada`
   * — antes dependia, e como só se entrava aqui DEPOIS de plantar, o botão
   * nunca aparecia uma única vez.
   *
   * Quem já plantou no WhatsApp de manhã também tem um fim, com outra palavra:
   * plantar de novo não é o que o gesto faz para ele.
   */
  const fecharODia = !proxima && !carregando && !!seed;
  const rotuloDoFim = plantada ? 'Concluir o dia' : 'Finalizar e plantar a semente';

  const seguir = () => {
    if (proxima) {
      // replace, não push: a pilha não deve guardar as cinco partes. Quem
      // chega ao fim e toca em voltar quer o Hoje, não refazer o caminho.
      navigation.replace('ParteDaSemente', { parte: proxima });
      return;
    }
    if (!fecharODia || plantando) return;
    setPlantando(true);
    plantarSementeDeHoje()
      .then((ok) => {
        if (ok) navigation.replace('SementePlantada');
        else setPlantando(false);
      })
      .catch(() => setPlantando(false));
  };

  return (
    <View style={[styles.root, webScreenFill]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <HeaderCampoFundo>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.voltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ChevronLeft size={22} color={colors.warmWhite} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitulo} numberOfLines={1}>{titulo}</Text>
          <HeaderGamificacao navigation={navigation} />
        </View>
      </HeaderCampoFundo>

      <View style={styles.folha}>
        <ScrollView
          style={webScroll}
          contentContainerStyle={[
            styles.scroll,
            // Espaço para o botão fixo não cobrir a última linha.
            podeOuvir ? { paddingBottom: 120 } : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.marca}>
            <Icon size={20} color={colors.earth} strokeWidth={2} />
            <Text style={styles.marcaTexto}>{titulo}</Text>
          </View>

          {carregando ? (
            <ActivityIndicator color={colors.earth} style={styles.carregando} />
          ) : parte === 'louvor' ? (
            seed?.music ? (
              <MusicPlayer music={seed.music} />
            ) : (
              <Text style={styles.vazio}>
                O louvor de hoje ainda não está disponível.
              </Text>
            )
          ) : texto ? (
            <>
              {parte === 'versiculo' && seed?.reference ? (
                <Pressable onPress={abrirCapitulo} disabled={!abrirCapitulo}>
                  <Text style={styles.referencia}>{seed.reference}</Text>
                </Pressable>
              ) : null}
              <Text style={styles.corpo}>
                {texto}
              </Text>
            </>
          ) : (
            <Text style={styles.vazio}>
              Esta parte ainda não está disponível hoje.
            </Text>
          )}

          {/* O caminho continua aqui, no fim do que ela acabou de ler.
              
              Sem isto, terminar uma parte era um beco: voltar, achar o próximo
              card, tocar. Três gestos para seguir lendo o mesmo devocional. O
              convite aparece onde o olho já está, e na última parte ele deixa
              de ser "continuar" e vira o gesto do dia. */}
          {proxima ? (
            <Pressable
              onPress={seguir}
              style={styles.seguir}
              accessibilityRole="button"
              accessibilityLabel={`Continuar para ${TITULOS[proxima].titulo}`}
            >
              <Text style={styles.seguirTexto}>
                Continuar para {TITULOS[proxima].titulo}
              </Text>
              <ChevronRight size={18} color={colors.earth} strokeWidth={2.2} />
            </Pressable>
          ) : fecharODia ? (
            <Pressable
              onPress={seguir}
              disabled={plantando}
              style={[styles.plantar, plantando && styles.plantarOcupado]}
              accessibilityRole="button"
              accessibilityLabel={rotuloDoFim}
            >
              {plantando ? (
                <ActivityIndicator color={colors.warmWhite} size="small" />
              ) : (
                <>
                  <Sprout size={18} color={colors.warmWhite} strokeWidth={2.2} />
                  <Text style={styles.plantarTexto}>{rotuloDoFim}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </ScrollView>

        {podeOuvir ? (
          <View style={styles.rodape}>
            <Pressable
              onPress={leitura.alternar}
              style={styles.btnOuvir}
              accessibilityRole="button"
              accessibilityLabel={leitura.tocando ? `Parar de ouvir ${titulo}` : `Ouvir ${titulo}`}
            >
              {leitura.tocando
                ? <Pause size={18} color={colors.warmWhite} strokeWidth={2.2} />
                : <Play size={18} color={colors.warmWhite} strokeWidth={2.2} />}
              <Text style={styles.btnOuvirTexto}>
                {leitura.tocando ? 'Parar' : 'Ouvir'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.headerBrand },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    gap: 12,
  },
  voltar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: {
    flex: 1,
    fontFamily: fonts.serifMedium,
    fontSize: fontSizes.xl,
    color: colors.warmWhite,
  },

  folha: {
    flex: 1,
    backgroundColor: colors.ivory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    overflow: 'hidden',
  },
  scroll: { paddingHorizontal: space.gutter, paddingTop: 28, paddingBottom: 48 },
  carregando: { marginTop: 48 },

  marca: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  marcaTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.earth,
  },

  referencia: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.sm,
    color: colors.earth,
    marginBottom: 10,
  },
  /** Mesma tipografia do Versículo nas outras partes: serifada, com respiro. */
  corpo: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 36,
    color: colors.charcoal,
  },
  vazio: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 26,
    color: colors.foregroundMuted,
  },

  /** Fixo: quem prefere escutar decide antes de começar a ler. */
  /* O convite para a próxima parte: discreto, no fim do texto. */
  seguir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.warmWhite,
  },
  seguirTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.earth,
  },
  /* O último não é um link: é o gesto do dia, e parece um. */
  plantar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.earth,
  },
  plantarOcupado: { opacity: 0.7 },
  plantarTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
  },

  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: colors.ivory,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnOuvir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.earth,
  },
  btnOuvirTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.base,
    color: colors.warmWhite,
  },
});
