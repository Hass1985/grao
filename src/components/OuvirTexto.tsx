import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import * as Speech from 'expo-speech';
import { useFocusEffect } from '@react-navigation/native';
import { Play, Pause } from './icons';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';

/**
 * Ouvir o texto, com a voz do próprio aparelho.
 *
 * Sem custo, sem rede e sem licença: quem lê é o sintetizador que já existe no
 * celular. A qualidade varia — a voz em português do iPhone é boa, a do Android
 * varia com a versão, a do navegador é a mais fraca. É o suficiente para
 * descobrir se o público usa áudio antes de investir em narração gravada.
 *
 * Três cuidados que decidem se isso soa como produto ou como gambiarra:
 *
 * 1. O TEXTO É PREPARADO. Lido cru, um capítulo sai "um O Senhor é meu pastor,
 *    dois Ele me faz deitar" — o número do versículo no meio da oração. Quem
 *    chama manda os trechos já limpos, um por versículo ou seção.
 *
 * 2. FALA EM PEDAÇOS. Enunciado gigante trava em alguns aparelhos e não dá
 *    para parar no meio. Em trechos, a pausa entre eles vira respiração — que
 *    é justamente o que falta numa leitura de máquina.
 *
 * 3. CALA A BOCA AO SAIR DA TELA. Sem isso, a pessoa navega para outra aba e a
 *    voz continua lendo Levítico por baixo do devocional de hoje.
 */
export function useLeituraEmVoz(trechos: string[], velocidade = 0.95) {
  const [tocando, setTocando] = useState(false);
  const cancelado = useRef(false);

  const parar = useCallback(() => {
    cancelado.current = true;
    Speech.stop();
    setTocando(false);
  }, []);

  // Ao sair da tela, a voz para. É o cuidado nº 3.
  useFocusEffect(useCallback(() => () => { parar(); }, [parar]));

  useEffect(() => {
    // Aquece a lista de vozes. No navegador ela carrega de forma assíncrona:
    // logo depois de abrir a página, `getVoices()` devolve vazio, e o primeiro
    // toque no botão pode sair com a voz padrão do sistema — inglês lendo
    // português. Pedir a lista uma vez ao montar resolve antes de alguém tocar.
    Speech.getAvailableVoicesAsync().catch(() => {});
    return () => { Speech.stop(); };
  }, []);

  const alternar = useCallback(() => {
    if (tocando) return parar();
    const fila = trechos.map((t) => t.trim()).filter(Boolean);
    if (!fila.length) return;

    cancelado.current = false;
    setTocando(true);

    const falar = (i: number) => {
      if (cancelado.current || i >= fila.length) {
        if (!cancelado.current) setTocando(false);
        return;
      }
      Speech.speak(fila[i], {
        language: 'pt-BR',
        rate: velocidade,
        onDone: () => falar(i + 1),
        // Erro num trecho não pode matar a leitura inteira: segue para o
        // próximo. Aparelho sem voz em português cai aqui em todos, e o
        // botão volta sozinho para o estado parado.
        onError: () => falar(i + 1),
      });
    };
    falar(0);
  }, [tocando, trechos, velocidade, parar]);

  return { tocando, alternar, parar };
}

export default function OuvirTexto({
  trechos,
  rotulo = 'Ouvir',
  velocidade,
  style,
}: {
  trechos: string[];
  rotulo?: string;
  velocidade?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { tocando, alternar } = useLeituraEmVoz(trechos, velocidade);

  return (
    <Pressable
      onPress={alternar}
      style={[styles.botao, tocando && styles.botaoAtivo, style]}
      accessibilityRole="button"
      accessibilityLabel={tocando ? 'Parar a leitura' : rotulo}
      hitSlop={8}
    >
      {tocando ? (
        <Pause size={15} color={colors.accent} strokeWidth={2.2} />
      ) : (
        <Play size={15} color={colors.foregroundMuted} strokeWidth={2.2} />
      )}
      <Text style={[styles.texto, tocando && styles.textoAtivo]}>
        {tocando ? 'Parar' : rotulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  botaoAtivo: { backgroundColor: colors.surfaceAccent },
  texto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  textoAtivo: { color: colors.accent },
});
