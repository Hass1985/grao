import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import BackButton from '../components/ui/BackButton';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { space } from '../theme/spacing';
import { webScreenFill, webScroll } from '../theme/webScreen';

type Props = { navigation: any };

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

export default function PrivacyPolicy({ navigation }: Props) {
  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Privacidade e dados</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={webScroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Disclaimer de conforto */}
        <View style={styles.disclaimer}>
          <GraoSymbol size={28} color={colors.accent} filled={false} />
          <Text style={styles.disclaimerTitle}>Aqui você pode se abrir com tranquilidade.</Text>
          <Text style={styles.disclaimerBody}>
            O que você compartilha com o Grão, sua fé, o que sente, o que tem pedido a Deus, fica
            guardado só entre você e o Grão, protegido, e serve apenas para escolher a semente
            certa pra você. Nunca vendemos, nunca expomos, e você pode apagar tudo quando quiser.
          </Text>
        </View>

        <Text style={styles.updated}>Última atualização: agosto de 2026</Text>

        <Section title="O que a gente guarda">
          <P>• Seu nome e número de WhatsApp, para te entregar a semente diária.</P>
          <P>
            • O que você conta na conversa inicial e no dia a dia, inclusive sobre a sua fé e o seu
            momento. Isso é um dado sensível, e a gente trata com o cuidado que ele merece.
          </P>
          <P>• Seu histórico de sementes (o que foi plantado), para montar o seu Campo e a sua Raiz.</P>
        </Section>

        <Section title="Quando você grava um áudio">
          <P>
            Na Abertura, você pode falar em vez de escrever. Quem transforma a sua fala em texto não
            é o Grão: é o serviço de voz do próprio navegador do seu celular, do Google, se você usa
            Chrome, ou da Apple, se usa Safari.
          </P>
          <P>
            Na prática, isso significa que o áudio passa pelos servidores dessa empresa antes de
            virar texto. Até nós chega só o texto: o Grão nunca recebe nem guarda a gravação.
          </P>
          <P>
            Preferindo não usar a voz, é só tocar em "Prefiro escrever". A experiência é a mesma, e
            aí nada de áudio sai do seu aparelho.
          </P>
        </Section>

        <Section title="Pra que a gente usa">
          <P>
            Só para uma coisa: te conhecer melhor do que qualquer app já te conheceu, e com isso
            entregar a palavra, a oração e a prática que confortam a sua necessidade, do seu jeito.
          </P>
        </Section>

        <Section title="O que a gente NÃO faz">
          <P>• Não vendemos os seus dados.</P>
          <P>• Não compartilhamos seu número ou suas conversas com terceiros.</P>
          <P>• Não expomos publicamente nada do que você conta.</P>
        </Section>

        <Section title="Seus direitos (LGPD)">
          <P>
            A Lei Geral de Proteção de Dados (Lei 13.709/2018) trata convicção religiosa como dado
            pessoal sensível. Por isso, você tem controle total:
          </P>
          <P>• Acessar e corrigir seus dados a qualquer momento.</P>
          <P>• Ajustar o seu momento nas configurações, quando a fase mudar.</P>
          <P>• Pedir a exclusão completa dos seus dados, e a gente apaga tudo.</P>
          <P>• Retirar o consentimento quando quiser.</P>
        </Section>

        <Section title="Segurança">
          <P>
            Seus dados ficam protegidos em servidores no Brasil, com acesso restrito. As conversas
            com a nossa inteligência acontecem por canais seguros, e a chave que dá acesso a essa
            inteligência nunca fica no seu celular.
          </P>
        </Section>

        <Section title="Contato">
          <P>
            Dúvidas sobre seus dados? Fale com a gente em privacidade@graoapp.com.br. Respondemos
            com o mesmo cuidado que você tem com a sua fé.
          </P>
        </Section>

        <View style={styles.verseWrap}>
          <Text style={styles.verse}>
            "O Senhor te guardará de todo o mal; ele guardará a tua alma."
          </Text>
          <Text style={styles.verseRef}>SALMOS 121:7</Text>
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
    paddingHorizontal: space.gutter,
    paddingVertical: 8,
  },
  title: { fontFamily: fonts.serifMedium, fontSize: fontSizes.xl, color: colors.foreground },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 48, paddingTop: 20 },

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

  updated: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
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
