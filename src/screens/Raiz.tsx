// A Raiz: o devocional diário.
//
// Ele morava na tela Hoje, e isso obrigava um app com dois produtos a caber
// numa tela só — o devocional do dia para quem é gratuito, a semente escolhida
// para quem assina. Quem entrava não conseguia ver os dois, e a tela precisava
// mudar de identidade conforme o plano.
//
// Agora cada coisa tem endereço fixo: Hoje é a semente (e, para quem ainda não
// assina, o convite a ela), a Raiz é o devocional anual — 365 páginas fixas,
// iguais para todo mundo, uma por dia — e o Campo é o calendário.
//
// A Raiz vale para os DOIS planos. O devocional não é o consolo de quem não
// paga: é outro material, e quem assina também quer lê-lo. Por isso ela busca
// /devocional/:userId/hoje, e não /seed/today, que troca de conteúdo conforme
// o acesso.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Share2, Sprout } from '../components/icons';
import SeedCard from '../components/SeedCard';
import OuvirTexto from '../components/OuvirTexto';
import Responder from '../components/Responder';
import Button from '../components/ui/Button';
import ScreenBackground from '../components/ui/ScreenBackground';
import AppHeader from '../components/ui/AppHeader';
import { TAB_DOCK_CLEARANCE } from '../components/ui/FloatingTabBar';
import { Seed } from '../data/seeds';
import { devocionalDeHoje, confirmarLeitura } from '../onboarding/seedDelivery';
import { partesDaReferencia } from '../onboarding/biblia';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';

export default function Raiz({ navigation }: { navigation: any }) {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [lido, setLido] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  // Recarrega ao voltar o foco porque a página vira à meia-noite: quem deixa o
  // app aberto de um dia para o outro leria a página de ontem para sempre.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        const r = await devocionalDeHoje();
        if (!vivo) return;
        if (r) { setSeed(r.seed); setLido(r.lido); }
        setCarregando(false);
      })();
      return () => { vivo = false; };
    }, [])
  );

  const confirmar = async () => {
    if (confirmando || lido) return;
    setConfirmando(true);
    // Marca na tela antes da resposta: confirmar leitura é um gesto de leitura,
    // não uma transação. Travar o botão esperando a rede é pior do que
    // reenviar na próxima abertura.
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

  // O versículo é um recorte; o capítulo é o contexto. Como a Bíblia já está
  // dentro do app, a referência vira porta em vez de enfeite.
  const referencia = seed ? partesDaReferencia(seed.reference) : null;
  const abrirCapitulo = referencia
    ? () => navigation.navigate('Biblia', {
        livro: referencia.livro, capitulo: referencia.capitulo,
      })
    : undefined;

  const dataLonga = new Date()
    .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: TAB_DOCK_CLEARANCE + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Raiz"
            subtitle={dataLonga}
            onLogoPress={() => navigation.navigate('Settings')}
            onProfilePress={() => navigation.navigate('Settings')}
          />

          {carregando ? (
            <View style={styles.carregando}>
              <ActivityIndicator color={colors.ambarSoft} />
            </View>
          ) : !seed ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTitulo}>O devocional de hoje não carregou</Text>
              <Text style={styles.vazioTexto}>
                Pode ser a conexão. Puxe a tela para baixo ou volte daqui a pouco —
                a página do dia continua aqui esperando.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>Devocional diário</Text>
                <Text style={styles.titulo}>
                  {seed.title || seed.reference || 'Página de hoje'}
                </Text>
              </View>

              {/* Ouvir vale muito aqui: é o público que não tem e-mail e cansa
                  a vista que mais pediu isso. A ordem é a da leitura. */}
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

              {/* É este gesto que constrói o histórico: marca o dia no Campo e
                  conta os grãos. Sem ele o calendário seria um lugar onde nada
                  acontece. */}
              <View style={styles.leituraWrap}>
                {lido ? (
                  <View style={styles.leituraFeita}>
                    <Sprout size={16} color={colors.accent} strokeWidth={2.2} />
                    <Text style={styles.leituraFeitaText}>Leitura de hoje confirmada</Text>
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

              {seed.compartilhavel ? (
                <TouchableOpacity
                  onPress={compartilhar}
                  style={styles.shareBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Compartilhar"
                  hitSlop={8}
                >
                  <Share2 size={15} color={colors.foregroundMuted} strokeWidth={2} />
                  <Text style={styles.shareText}>Compartilhar</Text>
                </TouchableOpacity>
              ) : null}

              {/* Responder alimenta a memória. Sem obrigação e sem contador:
                  quem não escreve não perde nada. */}
              <Responder />

              <TouchableOpacity
                onPress={() => navigation.navigate('Campo')}
                style={styles.outrosDias}
                hitSlop={8}
              >
                <Text style={styles.outrosDiasTexto}>Ver os outros dias</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: space.gutter },
  carregando: { paddingVertical: 60, alignItems: 'center' },
  vazio: { paddingVertical: 48, gap: 10 },
  vazioTitulo: {
    fontFamily: fonts.sansSemi, fontSize: fontSizes.base, color: colors.palha,
  },
  vazioTexto: {
    fontFamily: fonts.sans, fontSize: fontSizes.sm, lineHeight: 22,
    color: colors.foregroundMuted,
  },
  hero: { marginTop: 8, marginBottom: 18, gap: 8 },
  eyebrow: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.3,
    textTransform: 'uppercase', color: colors.ambarSoft,
  },
  titulo: {
    fontFamily: fonts.serifMedium, fontSize: 28, lineHeight: 34,
    color: colors.palha, letterSpacing: -0.6,
  },
  ouvir: { marginBottom: 16 },
  leituraWrap: { marginTop: 24 },
  leituraFeita: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  leituraFeitaText: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.accent,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  shareText: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foregroundMuted,
  },
  outrosDias: { alignSelf: 'center', marginTop: 18, paddingVertical: 10 },
  outrosDiasTexto: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.ambarSoft,
  },
});
