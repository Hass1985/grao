import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronLeft } from '../../components/icons';
import {
  marcarIndicacaoVista,
  normalizarCodigo,
  salvarCodigoIndicacao,
} from '../../onboarding/indicacao';
import { hasDisplayName } from '../../onboarding/userProfile';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';
import { webScreenFill } from '../../theme/webScreen';

type Props = {
  navigation: any;
  onFinish: () => void;
};

/**
 * Depois da apresentação e antes do Hoje: código de indicação opcional.
 *
 * O código fica guardado no aparelho para a assinatura usar quando o desconto
 * existir no servidor. Validar aqui só confirma o formato; pular segue sem ele.
 */
export default function CodigoIndicacao({ navigation, onFinish }: Props) {
  const [codigo, setCodigo] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ok = normalizarCodigo(codigo).length >= 3;

  const seguir = async () => {
    const named = await hasDisplayName();
    if (named) onFinish();
    else navigation.replace('ComoChamar');
  };

  const validar = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErro(null);
    try {
      await salvarCodigoIndicacao(codigo);
      await marcarIndicacaoVista();
      await seguir();
    } finally {
      setBusy(false);
    }
  };

  const pular = async () => {
    if (busy) return;
    setBusy(true);
    setErro(null);
    try {
      await marcarIndicacaoVista();
      await seguir();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, webScreenFill]}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topo}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => [styles.voltar, pressed && { opacity: 0.65 }]}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <ChevronLeft size={22} color={colors.mist} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.trilho}>
              <View style={styles.trilhoCheio} />
            </View>
            <View style={styles.voltarEspaco} />
          </View>

          <View style={styles.corpo}>
            <Text style={styles.titulo}>Tem um código de indicação?</Text>
            <Text style={styles.sub}>
              Se um influenciador te indicou, digite o código dele aqui pra ganhar
              desconto na assinatura.
            </Text>

            {/* O exemplo diz "Pastor", não "Padre".
                
                O Grão é evangélico, e o texto cinza do campo vazio é uma das
                primeiras coisas que dizem de quem é este app. Padre Fábio é
                católico e conhecidíssimo — o exemplo errado faz quem chega
                parar por um segundo e duvidar se veio ao lugar certo. */}
            <TextInput
              style={styles.campo}
              value={codigo}
              onChangeText={(t) => {
                setCodigo(t);
                setErro(null);
              }}
              placeholder="PASTOR_FABIO"
              placeholderTextColor={colors.mist}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={validar}
            />

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          </View>

          <View style={styles.rodape}>
            <Pressable
              onPress={validar}
              disabled={!ok || busy}
              style={({ pressed }) => [
                styles.ctaPreto,
                (!ok || busy) && styles.disabled,
                pressed && ok && !busy && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Validar código"
            >
              <Text style={styles.ctaPretoTexto}>Validar código</Text>
            </Pressable>

            <Pressable
              onPress={pular}
              disabled={busy}
              style={({ pressed }) => [
                styles.ctaSecundario,
                pressed && { opacity: 0.88 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Pular esta etapa"
            >
              <Text style={styles.ctaSecundarioTexto}>Pular esta etapa</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 12,
  },
  voltar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voltarEspaco: { width: 40, height: 40 },
  trilho: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  trilhoCheio: {
    width: '72%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  corpo: {
    flex: 1,
    paddingHorizontal: space.gutter,
    paddingTop: 36,
  },
  titulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 28,
    lineHeight: 34,
    color: '#000000',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.warmGray,
    marginBottom: 28,
    maxWidth: 340,
  },
  campo: {
    backgroundColor: '#EDEDED',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    letterSpacing: 0.6,
    color: '#000000',
    textTransform: 'uppercase',
  },
  erro: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.perigo,
    marginTop: 12,
  },
  rodape: {
    paddingHorizontal: space.gutter,
    paddingBottom: 28,
    gap: 10,
  },
  ctaPreto: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaPretoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
  },
  ctaSecundario: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaSecundarioTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: '#000000',
  },
  disabled: { opacity: 0.4 },
});
