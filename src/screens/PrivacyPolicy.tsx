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

        <Text style={styles.updated}>Última atualização: setembro de 2026</Text>

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
            Você pode falar em vez de escrever, e o caminho do áudio é diferente conforme onde você
            está. Vale a pena saber qual é qual.
          </P>
          <P>
            • <Text style={styles.forte}>No aplicativo</Text>, quem transforma a sua fala em texto é
            o serviço de voz do próprio navegador do seu celular: do Google, se você usa Chrome, ou
            da Apple, se usa Safari. O áudio passa pelos servidores dessa empresa antes de virar
            texto, e até nós chega só o texto. O Grão não recebe nem guarda a gravação.
          </P>
          <P>
            • <Text style={styles.forte}>No WhatsApp</Text>, é diferente, e a gente prefere dizer
            com todas as letras: o áudio que você manda chega até o Grão. A gente baixa esse áudio
            do WhatsApp e envia para um serviço de transcrição, que devolve o texto. Guardamos o
            texto; a gravação não fica com a gente depois disso.
          </P>
          <P>
            Nos dois casos, preferindo não usar a voz, é só escrever. A experiência é a mesma.
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

        <Section title="Quem mais encosta nos seus dados">
          <P>
            O Grão é feito de peças de outras empresas, e não dá para te contar o que guardamos sem
            te contar por onde isso passa. São estas, e nenhuma outra:
          </P>
          <P>
            • <Text style={styles.forte}>Supabase</Text> guarda o banco de dados, em São Paulo. É
            onde o seu histórico fica.
          </P>
          <P>
            • <Text style={styles.forte}>Render</Text> roda o servidor do Grão, nos Estados Unidos.
          </P>
          <P>
            • <Text style={styles.forte}>Anthropic</Text> é a inteligência que lê o que você conta e
            escolhe a semente, também nos Estados Unidos.
          </P>
          <P>
            • <Text style={styles.forte}>Meta</Text> entrega a mensagem no seu WhatsApp, e um
            serviço de transcrição converte o seu áudio em texto.
          </P>
          <P>
            • <Text style={styles.forte}>Asaas</Text> processa o pagamento de quem assina, no
            Brasil. O seu cartão e o seu CPF vão direto para eles; o Grão não guarda nenhum dos
            dois.
          </P>
          <P>
            Parte desses serviços fica fora do Brasil, o que a LGPD chama de transferência
            internacional. Nenhum deles usa o que você conta para outra coisa que não seja entregar
            a sua semente.
          </P>
        </Section>

        <Section title="Segurança">
          <P>
            O acesso ao banco é restrito e passa só pelo nosso servidor: o aplicativo no seu celular
            não fala direto com o banco. Cada pedido ao servidor precisa provar quem você é, e as
            chaves que dão acesso à inteligência e ao pagamento nunca ficam no seu aparelho.
          </P>
        </Section>

        <Section title="Por quanto tempo guardamos">
          <P>
            Enquanto a sua conta existir. Você pode pedir a exclusão a qualquer momento nas
            configurações, e aí apagamos o seu cadastro, o seu histórico, o que você contou e a sua
            identidade de login — tudo de uma vez, sem cópia guardada.
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

  /** O nome da empresa dentro do parágrafo, para a lista ser varrida de relance. */
  forte: {
    fontFamily: fonts.sansMedium,
    color: colors.foreground,
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
