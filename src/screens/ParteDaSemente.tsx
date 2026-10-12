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
import { ChevronLeft, Feather, Heart, MessageCircle, Music2, Pause, Play, Sprout } from '../components/icons';
import type { LucideIcon } from '../components/icons';
import { useLeituraEmVoz } from '../components/OuvirTexto';
import MusicPlayer from '../components/MusicPlayer';
import HeaderCampoFundo from '../components/ui/HeaderCampoFundo';
import HeaderGamificacao from '../components/ui/HeaderGamificacao';
import { Seed, todaySeed } from '../data/seeds';
import { selectTodaySeed } from '../onboarding/seedDelivery';
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

  // Recarrega ao ganhar foco. A semente pode ter sido plantada no WhatsApp
  // enquanto esta tela estava empilhada atrás, e aí o que ela mostra mudou.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        setCarregando(true);
        try {
          const dados = await selectTodaySeed();
          if (vivo) setSeed(dados.seed);
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
              <Text style={parte === 'versiculo' ? styles.versiculo : styles.corpo}>
                {texto}
              </Text>
            </>
          ) : (
            <Text style={styles.vazio}>
              Esta parte ainda não está disponível hoje.
            </Text>
          )}
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
  /** O versículo é a Palavra: serifada, maior, com o respiro de uma página. */
  versiculo: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 36,
    color: colors.charcoal,
  },
  corpo: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 28,
    color: colors.charcoal,
  },
  vazio: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 26,
    color: colors.foregroundMuted,
  },

  /** Fixo: quem prefere escutar decide antes de começar a ler. */
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
