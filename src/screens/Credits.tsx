import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking } from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { webScreenFill, webScroll } from '../theme/webScreen';

type Props = { navigation: any };

const LICENSE_URL = 'https://creativecommons.org/licenses/by/3.0/br/';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export default function Credits({ navigation }: Props) {
  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Créditos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={webScroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.disclaimer}>
          <GraoSymbol size={28} color={colors.accent} filled={false} />
          <Text style={styles.disclaimerTitle}>Toda palavra aqui tem procedência.</Text>
          <Text style={styles.disclaimerBody}>
            O texto bíblico do Grão não é escrito nem parafraseado por nós: vem de uma tradução
            publicada, guardada por inteiro no nosso banco. Cada versículo que você lê é o texto
            original dessa tradução.
          </Text>
        </View>

        <Section title="Texto bíblico">
          <P>Bíblia Livre (BLIVRE) — tradução em português brasileiro, 66 livros.</P>
          <P>
            Usada sob a licença Creative Commons Atribuição 3.0 Brasil (CC BY 3.0 BR), que permite
            o uso e a distribuição mediante crédito à fonte.
          </P>
          <TouchableOpacity onPress={() => Linking.openURL(LICENSE_URL)} accessibilityRole="link">
            <Text style={styles.link}>Ver os termos da licença ›</Text>
          </TouchableOpacity>
          <P>
            Modificações: corrigimos erros evidentes de digitação do texto-fonte, como uma palavra
            duplicada em Salmos 25:16. Nenhuma correção altera o sentido da tradução, e cada uma
            fica registrada no nosso código.
          </P>
        </Section>

        <Section title="Reflexões, orações e práticas">
          <P>
            Escritas para o Grão a partir da passagem do dia, com revisão editorial e teológica
            antes de qualquer semente chegar até você.
          </P>
        </Section>

        <Section title="Músicas">
          <P>
            O Grão não hospeda nem reproduz áudio. Cada louvor indicado é um link para o catálogo
            oficial da plataforma onde ele está publicado, e toda faixa foi conferida contra esse
            catálogo antes de entrar na nossa base.
          </P>
          <P>Os direitos das obras permanecem com seus autores, intérpretes e gravadoras.</P>
        </Section>

        <Section title="Fale com a gente">
          <P>
            Encontrou um erro no texto bíblico ou um crédito faltando? Escreva para
            ola@graoapp.com.br. A gente corrige.
          </P>
        </Section>

        <View style={styles.verseWrap}>
          <Text style={styles.verse}>
            "A erva seca, e a flor cai; mas a palavra de nosso Deus subsiste eternamente."
          </Text>
          <Text style={styles.verseRef}>ISAÍAS 40:8</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backBtnText: { fontSize: 30, color: colors.accent, lineHeight: 34, fontFamily: fonts.sans },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.foreground },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 20 },

  disclaimer: {
    backgroundColor: colors.surfaceAccent,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
    marginBottom: 24,
    ...(shadows.sm as object),
  },
  disclaimerTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    lineHeight: 26,
  },
  disclaimerBody: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    lineHeight: 22,
  },

  section: { marginBottom: 24 },
  h2: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    marginBottom: 8,
  },
  p: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foregroundMuted,
    lineHeight: 24,
    marginBottom: 6,
  },
  link: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accent,
    marginTop: 2,
    marginBottom: 10,
  },

  verseWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 24,
    marginTop: 8,
    alignItems: 'center',
    gap: 8,
  },
  verse: {
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    fontSize: fontSizes.base,
    color: colors.foregroundMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  verseRef: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundSubtle,
    letterSpacing: 2,
  },
});
