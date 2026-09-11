import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.rotulo}>O que isso mexeu em você?</Text>
      <TextInput
        style={styles.campo}
        placeholder="Uma frase basta. Ninguém mais lê isto."
        placeholderTextColor={colors.foregroundSubtle}
        value={texto}
        onChangeText={setTexto}
        multiline
        editable={!salvando}
        maxLength={2000}
      />
      <Pressable
        onPress={enviar}
        disabled={!texto.trim() || salvando}
        style={[styles.botao, (!texto.trim() || salvando) && styles.botaoOff]}
      >
        {salvando ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Text style={styles.botaoTexto}>Guardar</Text>
        )}
      </Pressable>
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
  campo: {
    ...glassCard,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 92,
    textAlignVertical: 'top',
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: 24,
    color: colors.palha,
  },
  botao: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAccent,
  },
  botaoOff: { opacity: 0.45 },
  botaoTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
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
