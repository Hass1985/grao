// O fim do caminho do dia: a semente foi plantada.
//
// POR QUE UMA TELA, E NÃO UM AVISO
//
// Plantar é o único gesto que o Grão pede por dia, e até aqui ele acontecia em
// silêncio: o botão sumia, o card mudava de estado, e pronto. Um produto que
// chama o seu conteúdo de semente e o seu histórico de campo não pode tratar o
// ato de plantar como a confirmação de um formulário.
//
// A tela existe para dar peso a cinco segundos. Ela não pede nada, não vende
// nada e tem uma saída só.
//
// SOBRE A ANIMAÇÃO
//
// Um broto que cresce, um anel que se abre em volta e o texto que chega
// depois. Nada de confete: o gesto é de recolhimento, não de prêmio, e a
// celebração certa para uma oração é discreta.
//
// `useNativeDriver` em tudo — opacidade e escala rodam na thread de animação,
// e numa lista de celulares antigos é a diferença entre crescer e tremer.
//
// E quem pediu menos movimento no sistema recebe o quadro final, direto, sem
// animação nenhuma. Em público que inclui gente mais velha e com vertigem,
// isso não é detalhe de acessibilidade, é não passar mal.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  StatusBar,
  AccessibilityInfo,
} from 'react-native';
import GraoSymbol from '../components/GraoSymbol';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { space } from '../theme/spacing';
import { radius } from '../theme/radius';
import { webScreenFill } from '../theme/webScreen';

export default function SementePlantada({ navigation }: { navigation: any }) {
  const broto = useRef(new Animated.Value(0)).current;
  const anel = useRef(new Animated.Value(0)).current;
  const texto = useRef(new Animated.Value(0)).current;
  const [semMovimento, setSemMovimento] = useState(false);

  useEffect(() => {
    let vivo = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduzir) => {
        if (!vivo) return;
        if (reduzir) {
          // Sem animação: o quadro final, de uma vez.
          setSemMovimento(true);
          broto.setValue(1);
          anel.setValue(1);
          texto.setValue(1);
          return;
        }
        Animated.sequence([
          Animated.timing(broto, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(anel, {
              toValue: 1,
              duration: 620,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(texto, {
              toValue: 1,
              duration: 420,
              delay: 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      })
      .catch(() => {
        if (vivo) {
          broto.setValue(1);
          anel.setValue(1);
          texto.setValue(1);
        }
      });

    return () => { vivo = false; };
  }, [broto, anel, texto]);

  const voltar = () => {
    // Para o Hoje, e sem deixar esta tela na pilha: ninguém volta para uma
    // confirmação.
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <View style={[styles.root, webScreenFill]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.centro}>
        <View style={styles.palco}>
          {/* O anel se abre em volta do broto, e some ao chegar no fim: é o
              movimento da terra se acomodando, não um alvo. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.anel,
              {
                opacity: anel.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0, 0.5, 0],
                }),
                transform: [{
                  scale: anel.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }),
                }],
              },
            ]}
          />
          <Animated.View
            style={{
              opacity: broto,
              transform: [{
                scale: broto.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              }],
            }}
          >
            <GraoSymbol size={92} color={colors.earth} filled={false} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.dizeres,
            {
              opacity: texto,
              transform: [{
                translateY: texto.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
              }],
            },
          ]}
        >
          <Text style={styles.titulo}>Semente plantada</Text>
          <Text style={styles.texto}>
            Ela fica guardada no seu Campo. Amanhã, no seu horário, chega outra
            escolhida para o momento em que você estiver.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.rodape, { opacity: semMovimento ? 1 : texto }]}>
        <Pressable onPress={voltar} style={styles.botao} accessibilityRole="button">
          <Text style={styles.botaoTexto}>Voltar para o Hoje</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.gutter,
  },
  palco: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  anel: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.earth,
  },
  dizeres: { alignItems: 'center', gap: 12, maxWidth: 360 },
  titulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 30,
    lineHeight: 36,
    color: colors.charcoal,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 26,
    color: colors.foregroundMuted,
    textAlign: 'center',
  },
  rodape: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  botao: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.earth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
  },
});
