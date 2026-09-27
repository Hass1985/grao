import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Send } from './icons';
import { responderHoje, respostaDoDia } from '../onboarding/resposta';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { glassCard } from '../theme/glass';

/**
 * O lado dela da conversa.
 *
 * Até aqui o Grão falava e a pessoa só recebia. O único lugar onde ela escrevia
 * era a abertura — uma vez na vida —, então a memória longitudinal só tinha o
 * retrato do primeiro dia e envelhecia junto com ele.
 *
 * Um campo, uma frase, sem obrigação. Quem escreve alimenta o que o Grão vai
 * lembrar dias depois; quem não escreve não perde nada, e é por isso que não
 * há cobrança nem contador aqui.
 */
export default function Responder({
  data,
  somenteLeitura = false,
}: {
  /** Dia a reabrir. Sem data, é hoje. */
  data?: string;
  somenteLeitura?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [guardado, setGuardado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [cuidado, setCuidado] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    respostaDoDia(data).then((t) => {
      if (!vivo) return;
      setGuardado(t);
      if (t) setTexto(t);
    });
    return () => { vivo = false; };
  }, [data]);

  const enviar = useCallback(async () => {
    const limpo = texto.trim();
    if (!limpo || salvando) return;
    setSalvando(true);
    try {
      const r = await responderHoje(limpo);
      setGuardado(limpo);
      setEditando(false);
      // Sofrimento grave tem resposta fixa, igual em todos os canais. Ela
      // aparece no lugar do agradecimento — nunca junto, nunca depois.
      if (r?.cuidado) setCuidado(r.cuidado);
    } finally {
      setSalvando(false);
    }
  }, [texto, salvando]);

  if (cuidado) {
    return (
      <View style={[styles.wrap, styles.cuidadoWrap]}>
        <Text style={styles.cuidadoTexto}>{cuidado}</Text>
      </View>
    );
  }

  // Já respondeu e não está editando: mostra o que escreveu.
  if (guardado && !editando) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.rotulo}>O que você escreveu</Text>
        <Text style={styles.guardado}>{guardado}</Text>
        {!somenteLeitura ? (
          <Pressable onPress={() => setEditando(true)} hitSlop={8}>
            <Text style={styles.trocar}>Mudar o que escrevi</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (somenteLeitura) return null;

  const vazio = !texto.trim();

  return (
    <View style={styles.wrap}>
      <Text style={styles.rotulo}>Como essa semente falou com você?</Text>
      {/* O envio mora DENTRO do campo, no canto de baixo à direita.

          Era um botão "Guardar" solto embaixo do card, e ele empurrava o resto
          da página para baixo só para existir. Com o ícone no canto, o gesto
          fica onde a mão já está — é o mesmo lugar de todo aplicativo de
          mensagem, que é exatamente o que a pessoa acha que está fazendo. */}
      <View style={styles.cartao}>
        <TextInput
          style={styles.campo}
          placeholder="Uma frase basta."
          placeholderTextColor={colors.foregroundSubtle}
          value={texto}
          onChangeText={setTexto}
          multiline
          editable={!salvando}
          maxLength={2000}
        />
        <Pressable
          onPress={enviar}
          disabled={vazio || salvando}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Guardar o que escrevi"
          accessibilityState={{ disabled: vazio || salvando }}
          style={[styles.enviar, (vazio || salvando) && styles.enviarOff]}
        >
          {salvando ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Send size={17} color={colors.accent} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26 },
  rotulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginBottom: 12,
  },
  cartao: {
    ...glassCard,
    borderRadius: 20,
    // Espaço em baixo à direita para o ícone não sentar sobre a última linha
    // do que a pessoa escreveu.
    paddingBottom: 46,
  },
  campo: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
    minHeight: 76,
    textAlignVertical: 'top',
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.palha,
  },
  enviar: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAccent,
  },
  enviarOff: { opacity: 0.4 },
  guardado: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 27,
    color: colors.palha,
  },
  trocar: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundSubtle,
    marginTop: 12,
  },
  cuidadoWrap: {
    ...glassCard,
    borderRadius: 20,
    padding: 20,
  },
  cuidadoTexto: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 26,
    color: colors.palha,
  },
});
