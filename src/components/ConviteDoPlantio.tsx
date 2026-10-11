// A tela Hoje de quem ainda não assina.
//
// Antes era um bloco pequeno no pé do devocional, e o caminho até o teste
// passava por cinco telas de apresentação: a pessoa tinha que querer muito
// para chegar na oferta, e quase ninguém quer tanto assim.
//
// Agora é a própria tela: o que o Plantio é, como funciona, o que entra, e o
// botão no fim. Depois dele: dados de cobrança → horário WhatsApp → relato
// do momento → tópicos liberados na Hoje.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BookOpen, Check, Mic, MessageCircle, Sprout } from './icons';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

const PASSOS = [
  {
    icone: 'mic' as const,
    titulo: 'Você conta o seu momento',
    texto: 'Em áudio ou por escrito. Como está o seu coração hoje, sem filtro e sem pressa.',
  },
  {
    icone: 'sprout' as const,
    titulo: 'O Grão escuta e escolhe',
    texto: 'A partir do que você contou, a Palavra certa para o seu dia, não o mesmo texto de todo mundo.',
  },
  {
    icone: 'book' as const,
    titulo: 'A semente chega inteira',
    texto: 'Reflexão, oração guiada, uma prática para viver a Palavra e um louvor escolhido para o seu dia.',
  },
  {
    icone: 'whats' as const,
    titulo: 'E também no WhatsApp',
    texto: 'No horário que você escolher, onde você já está. Sem precisar lembrar de abrir o app.',
  },
];

const INCLUI = [
  'Uma semente escolhida para o seu momento, todo dia',
  'Oração guiada e prática para viver a Palavra',
  'Louvor escolhido para o seu dia',
  'A semente também no WhatsApp, no seu horário',
  'Seu Campo e sua Raiz guardados para sempre',
];

function PassoIcone({ nome }: { nome: (typeof PASSOS)[number]['icone'] }) {
  const cor = colors.earth;
  if (nome === 'mic') return <Mic size={20} color={cor} strokeWidth={1.9} />;
  if (nome === 'sprout') return <Sprout size={20} color={cor} strokeWidth={1.9} />;
  if (nome === 'whats') return <MessageCircle size={20} color={cor} strokeWidth={1.9} />;
  return <BookOpen size={20} color={cor} strokeWidth={1.9} />;
}

export default function ConviteDoPlantio({ onAssinar }: { onAssinar: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Plantio</Text>
        <Text style={styles.titulo}>Uma Palavra{'\n'}escolhida para você.</Text>
        <Text style={styles.subtitulo}>
          O devocional é o mesmo para todo mundo, e é seu de graça, para sempre. A
          semente é diferente: ela nasce do que você está vivendo hoje.
        </Text>
      </View>

      <View style={styles.passos}>
        {PASSOS.map((p) => (
          <View key={p.titulo} style={styles.passo}>
            <View style={styles.passoIcone}>
              <PassoIcone nome={p.icone} />
            </View>
            <View style={styles.passoTexto}>
              <Text style={styles.passoTitulo}>{p.titulo}</Text>
              <Text style={styles.passoCorpo}>{p.texto}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.caixa}>
        <Text style={styles.incluiTitulo}>O que entra</Text>
        <View style={styles.lista}>
          {INCLUI.map((item) => (
            <View key={item} style={styles.linha}>
              <Check size={15} color={colors.earth} strokeWidth={2.4} />
              <Text style={styles.item}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.fecho}>
        <Pressable
          onPress={onAssinar}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Quero meus 7 dias grátis"
        >
          <Text style={styles.ctaTexto}>Quero meus 7 dias grátis</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  hero: { gap: 12, marginBottom: 28 },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.earth,
  },
  titulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 32,
    lineHeight: 38,
    color: colors.earth,
    letterSpacing: -0.7,
  },
  subtitulo: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 25,
    color: colors.warmGray,
  },
  passos: { gap: 20, marginBottom: 28 },
  passo: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  passoIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.warmWhite,
    borderWidth: 1,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: { flex: 1, gap: 4, paddingTop: 2 },
  passoTitulo: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.base,
    color: colors.earth,
  },
  passoCorpo: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.warmGray,
  },
  caixa: {
    backgroundColor: colors.warmWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.sand,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 12,
    ...(shadows.sm as object),
  },
  incluiTitulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.earth,
  },
  lista: { gap: 10 },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  item: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.warmGray,
  },
  fecho: { marginTop: 28, gap: 14 },
  cta: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
  },
});
