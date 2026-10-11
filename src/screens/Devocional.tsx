// Devocional diário "De Grão em Grão": 365 páginas fixas, uma por data,
// iguais para todo mundo. Vale para os dois planos.
//
// Antes morava na aba Raiz. Agora segue o shell atual (cabeçalho de campo +
// sheet claro), como Hoje e Campo. Busca /devocional/:userId/hoje, não
// /seed/today, que troca de conteúdo conforme o acesso.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Share2, Sprout } from '../components/icons';
import SeedCard from '../components/SeedCard';
import OuvirTexto from '../components/OuvirTexto';
import Button from '../components/ui/Button';
import HeaderCampoFundo from '../components/ui/HeaderCampoFundo';
import HeaderGamificacao from '../components/ui/HeaderGamificacao';
import { Seed } from '../data/seeds';
import { devocionalDeHoje, confirmarLeitura } from '../onboarding/seedDelivery';
import { partesDaReferencia } from '../onboarding/biblia';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { webScreenFill, webScroll } from '../theme/webScreen';

function diaDoAno(d = new Date()) {
  const inicio = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - inicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Devocional({ navigation }: { navigation: any }) {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [lido, setLido] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  // Recarrega ao voltar o foco: a página vira à meia-noite.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        setCarregando(true);
        const r = await devocionalDeHoje();
        if (!vivo) return;
        if (r) {
          setSeed(r.seed);
          setLido(r.lido);
        } else {
          setSeed(null);
          setLido(false);
        }
        setCarregando(false);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  const confirmar = async () => {
    if (confirmando || lido) return;
    setConfirmando(true);
    setLido(true);
    try {
      await confirmarLeitura();
    } finally {
      setConfirmando(false);
    }
  };

  const compartilhar = async () => {
    const message = seed?.compartilhavel?.trim();
    if (!message) return;
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message } : { message, title: 'Grão' }
      );
    } catch {
      /* cancelou */
    }
  };

  const irCampo = () => {
    navigation.navigate('Main', { screen: 'Campo' });
  };

  const referencia = seed ? partesDaReferencia(seed.reference) : null;
  const abrirCapitulo = referencia
    ? () =>
        navigation.navigate('Main', {
          screen: 'Biblia',
          params: {
            livro: referencia.livro,
            capitulo: referencia.capitulo,
          },
        })
    : undefined;

  const dataLonga = new Date()
    .toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .replace(/^./, (c) => c.toUpperCase());

  const dateLine = (() => {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = agora
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${dia} ${mes} ${agora.getFullYear()}`;
  })();

  const pagina = diaDoAno();
  const progresso = Math.min(100, Math.round((pagina / 365) * 100));

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
            <Text style={styles.headerTitulo} numberOfLines={1}>
              Devocional
            </Text>
            <HeaderGamificacao navigation={navigation} />
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Página do ano</Text>
              <Text style={styles.progressPct}>
                {pagina} de 365
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progresso}%` }]} />
            </View>
          </View>
      </HeaderCampoFundo>

      <View style={styles.sheet}>
        <ScrollView
          style={webScroll}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {carregando ? (
            <View style={styles.carregando}>
              <ActivityIndicator color={colors.earth} />
            </View>
          ) : !seed ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>O devocional de hoje não carregou</Text>
              <Text style={styles.vazioTexto}>
                Pode ser a conexão. Volte daqui a pouco: a página do dia
                continua aqui esperando.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sheetHead}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.dateLine}>{dateLine}</Text>
                  <Text style={styles.heroTitle}>
                    {seed.title || 'De Grão em Grão'}
                  </Text>
                  <Text style={styles.heroApoio}>
                    Uma página nova por dia, a mesma para todo mundo. Sua de
                    graça, para sempre.
                  </Text>
                </View>
                {seed.compartilhavel ? (
                  <TouchableOpacity
                    onPress={compartilhar}
                    hitSlop={10}
                    accessibilityLabel="Compartilhar"
                  >
                    <Share2 size={18} color={colors.mist} strokeWidth={2} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.eyebrow}>{dataLonga}</Text>

              <OuvirTexto
                trechos={[
                  seed.title || '',
                  seed.passage || '',
                  seed.reference || '',
                  seed.reflection || '',
                ]}
                rotulo="Ouvir o devocional"
                style={styles.ouvir}
              />

              <SeedCard seed={seed} featured onLerCapitulo={abrirCapitulo} />

              <View style={styles.leituraWrap}>
                {lido ? (
                  <View style={styles.leituraFeita}>
                    <Sprout size={16} color={colors.earth} strokeWidth={2.2} />
                    <Text style={styles.leituraFeitaText}>
                      Leitura de hoje confirmada
                    </Text>
                  </View>
                ) : (
                  <Button
                    title="Confirmar leitura"
                    onPress={confirmar}
                    variant="dark"
                    uppercase
                    disabled={confirmando}
                  />
                )}
              </View>

              <Pressable
                onPress={irCampo}
                style={styles.outrosDias}
                hitSlop={8}
              >
                <Text style={styles.outrosDiasTexto}>Ver os outros dias</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241708' },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginTop: 10,
    marginBottom: 18,
    gap: 10,
  },
  voltar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.warmWhite,
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
  sheet: {
    flex: 1,
    marginTop: -16,
    backgroundColor: '#F4F4F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    minHeight: 0,
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 28,
    paddingBottom: 56,
  },
  carregando: { paddingVertical: 60, alignItems: 'center' },
  vazio: { paddingVertical: 48, gap: 10 },
  vazioTitulo: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.base,
    color: colors.earth,
  },
  vazioTexto: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.foregroundMuted,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateLine: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.mist,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.earth,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroApoio: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mist,
  },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.earth,
    marginBottom: 14,
    marginTop: 8,
  },
  ouvir: { marginBottom: 16 },
  leituraWrap: { marginTop: 24 },
  leituraFeita: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  leituraFeitaText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.earth,
  },
  outrosDias: { alignSelf: 'center', marginTop: 18, paddingVertical: 10 },
  outrosDiasTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.earth,
  },
});
