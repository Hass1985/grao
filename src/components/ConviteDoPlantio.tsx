// A tela Hoje de quem ainda não assina.
//
// Antes era um bloco pequeno no pé do devocional, e o caminho até o teste
// passava por cinco telas de apresentação: a pessoa tinha que querer muito
// para chegar na oferta, e quase ninguém quer tanto assim. Cinco toques entre
// a curiosidade e a decisão é atrito, não construção de desejo.
//
// Agora é a própria tela: o que o Plantio é, como funciona, o que entra, e o
// botão no fim — depois do conteúdo, nunca antes dele. Quem chegou ao fim da
// página leu os argumentos; quem não chegou não seria convencido por um botão
// no topo.
//
// O devocional gratuito não é anunciado aqui: quem navega pelo app encontra a
// Raiz sozinho, e é lá, no topo dela, que está escrito o que ela é. Uma placa
// nesta tela apontando para outra só disputaria atenção com o que esta tem a
// dizer.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Check, Mic, MessageCircle, Sprout } from './icons';
import Button from './ui/Button';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { configuracaoDeCobranca, emReais } from '../onboarding/assinatura';

const PASSOS = [
  {
    icone: 'mic' as const,
    titulo: 'Você conta o seu momento',
    texto: 'Em áudio ou por escrito. Como está o seu coração hoje, sem filtro e sem pressa.',
  },
  {
    icone: 'sprout' as const,
    titulo: 'O Grão escuta e escolhe',
    texto: 'A partir do que você contou, a Palavra certa para o seu dia — não o mesmo texto de todo mundo.',
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
  'Bíblia completa, com leitura em áudio',
  'Seu Campo e sua Raiz guardados para sempre',
];

function PassoIcone({ nome }: { nome: (typeof PASSOS)[number]['icone'] }) {
  const cor = colors.ambarSoft;
  if (nome === 'mic') return <Mic size={20} color={cor} strokeWidth={1.9} />;
  if (nome === 'sprout') return <Sprout size={20} color={cor} strokeWidth={1.9} />;
  if (nome === 'whats') return <MessageCircle size={20} color={cor} strokeWidth={1.9} />;
  return <BookOpen size={20} color={cor} strokeWidth={1.9} />;
}

export default function ConviteDoPlantio({ onAssinar }: { onAssinar: () => void }) {
  const [preco, setPreco] = useState<string | null>(null);

  // O preço vem do servidor, do lado de onde a cobrança é criada. Preço escrito
  // na tela é preço que um dia diverge do que o gateway cobra.
  useEffect(() => {
    let vivo = true;
    configuracaoDeCobranca().then((c) => {
      if (!vivo || !c) return;
      const p = c.planos.find((x) => x.id === 'plantio');
      if (p) setPreco(`${emReais(p.valorCentavos)} por ${p.ciclo}`);
    });
    return () => { vivo = false; };
  }, []);

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
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(251, 246, 236, 0.20)',
            'rgba(251, 246, 236, 0.12)',
            'rgba(251, 246, 236, 0.16)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.brilho}
        />
        <Text style={styles.incluiTitulo}>O que entra</Text>
        <View style={styles.lista}>
          {INCLUI.map((item) => (
            <View key={item} style={styles.linha}>
              <Check size={15} color={colors.ambarSoft} strokeWidth={2.4} />
              <Text style={styles.item}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* O botão vem depois do conteúdo, e o preço vem antes do botão: quem
          aperta já sabe quanto custa e quando começa a custar. */}
      <View style={styles.fecho}>
        <Text style={styles.precoLinha}>
          {preco
            ? `7 dias grátis. Depois, ${preco} — e você cancela quando quiser.`
            : '7 dias grátis. Você cancela quando quiser.'}
        </Text>
        <Button
          title="Teste grátis por 7 dias"
          onPress={onAssinar}
          variant="dark"
          uppercase
        />
        <Text style={styles.rodape}>
          Hoje você não paga nada. A gente avisa um dia antes da primeira cobrança,
          com o valor escrito. Cancelar não tira o devocional diário.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  hero: { gap: 12, marginBottom: 30 },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
  },
  titulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 32,
    lineHeight: 38,
    color: colors.palha,
    letterSpacing: -0.7,
  },
  subtitulo: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 25,
    color: colors.foregroundMuted,
  },
  passos: { gap: 22, marginBottom: 30 },
  passo: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  passoIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(192, 120, 38, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: { flex: 1, gap: 4, paddingTop: 2 },
  passoTitulo: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.base,
    color: colors.palha,
  },
  passoCorpo: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.foregroundMuted,
  },
  caixa: {
    overflow: 'hidden',
    backgroundColor: 'rgba(72, 48, 24, 0.28)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 12,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 10px 28px rgba(36, 23, 8, 0.16)',
        } as object)
      : {
          shadowColor: '#241708',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 18,
          elevation: 4,
        }),
  },
  brilho: { ...StyleSheet.absoluteFillObject },
  incluiTitulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
  },
  lista: { gap: 10 },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  item: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.foregroundMuted,
  },
  fecho: { marginTop: 28, gap: 14 },
  precoLinha: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.palha,
    textAlign: 'center',
  },
  rodape: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.foregroundMuted,
    textAlign: 'center',
  },
});
