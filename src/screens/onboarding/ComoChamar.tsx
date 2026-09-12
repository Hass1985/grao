import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Button from '../../components/ui/Button';
import ScreenBackground from '../../components/ui/ScreenBackground';
import { setDisplayName, getDisplayName, setDevocionalOptIn } from '../../onboarding/userProfile';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { space } from '../../theme/spacing';
import { webScreenFill } from '../../theme/webScreen';

type Props = {
  navigation: any;
  onFinish: () => void;
};

/** Pós-login: confirma a conta e pergunta como a pessoa gosta de ser chamada. */
export default function ComoChamar({ navigation, onFinish }: Props) {
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = nome.trim().length >= 2;

  React.useEffect(() => {
    getDisplayName()
      .then((n) => {
        if (n && n !== 'Você') setNome(n);
      })
      .catch(() => {});
  }, []);

  const continuar = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await setDisplayName(nome.trim());
      // O opt-in do devocional vem junto com o nome.
      //
      // Havia uma tela inteira só para confirmar que a pessoa queria receber o
      // devocional diário — uma pergunta cuja resposta já estava dada: ela
      // acabou de criar uma conta num app de devocional. Pedir confirmação do
      // óbvio é atrito disfarçado de cuidado, e era a última coisa entre o
      // cadastro e o produto.
      await setDevocionalOptIn(true);
      onFinish();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.inner}>
            <Text style={styles.eyebrow}>Tudo certo</Text>
            <Text style={styles.title}>Sua conta{'\n'}está pronta.</Text>
            <Text style={styles.sub}>
              Como você gosta de ser chamado por aqui? Esse nome aparece no seu
              perfil e nas mensagens do Grão.
            </Text>

            <Text style={styles.label}>Como quer ser chamado</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              editable={!busy}
              placeholderTextColor={colors.foregroundSubtle}
              returnKeyType="done"
              onSubmitEditing={continuar}
            />

            <View style={styles.footer}>
              <Button
                title="Continuar"
                onPress={continuar}
                disabled={!ok || busy}
                variant="dark"
                uppercase
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: space.gutter,
    paddingTop: 48,
    paddingBottom: 36,
  },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 34,
    lineHeight: 40,
    color: colors.palha,
    letterSpacing: -0.7,
    marginBottom: 14,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foregroundMuted,
    marginBottom: 40,
    maxWidth: 340,
  },
  label: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.palha,
    marginBottom: 10,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderStrong,
    paddingVertical: 12,
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    color: colors.palha,
    letterSpacing: -0.3,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
});
