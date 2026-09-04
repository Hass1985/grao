import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { webScreenFill, webScroll } from '../../theme/webScreen';
import { space } from '../../theme/spacing';
import { getUserId, setUserId, linkWhatsApp } from '../../onboarding/aiClient';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import StepProgress from '../../components/ui/StepProgress';

type Props = {
  navigation: StackNavigationProp<any>;
  route?: { params?: { time?: string } };
};

export default function WhatsApp({ navigation, route }: Props) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const canContinue = phone.replace(/\D/g, '').length >= 10 && consent && !saving;

  /**
   * Aqui o cadastro do site vira um usuário de WhatsApp de verdade.
   *
   * O consentimento é pré-requisito: só chamamos o backend depois que ela
   * marcou a caixa. E a falha é silenciosa de propósito — se a rede cair, ela
   * segue para o plano e o WhatsApp fica pendente, em vez de travar o
   * onboarding num erro que ela não pode resolver.
   */
  async function continuar() {
    if (!canContinue) return;
    setSaving(true);
    try {
      const userId = await getUserId();
      const r = await linkWhatsApp(userId, phone, route?.params?.time ?? '07:00');
      // Se houve fusão, o id mudou: quem manda agora é o do telefone.
      if (r && r.userId !== userId) await setUserId(r.userId);
    } finally {
      setSaving(false);
      navigation.navigate('Plan');
    }
  }

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <StepProgress step={5} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={webScroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.eyebrow}>Entrega · passo 5</Text>
          <Text style={styles.title}>Seu WhatsApp</Text>
          <Text style={styles.subtitle}>
            É por aqui que você vai receber sua semente todos os dias.
          </Text>

          <TouchableOpacity
            style={styles.previewLink}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('WhatsAppDemo')}
          >
            <Text style={styles.previewLinkText}>Ver um exemplo do que você recebe →</Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Número com DDD</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(formatPhone(t))}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.casca40}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <View style={styles.consentRow}>
            <TouchableOpacity
              onPress={() => setConsent(!consent)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
                {consent && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.consentText}>
              <Text onPress={() => setConsent(!consent)}>
                Concordo em receber a semente diária no WhatsApp e autorizo o Grão a usar o que eu
                compartilhar, inclusive sobre a minha fé e o meu momento, só para personalizar o
                que recebo.{' '}
              </Text>
              <Text style={styles.consentLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
                Ver política de privacidade
              </Text>
              <Text>.</Text>
            </Text>
          </View>

          <Button
            title={saving ? 'Um instante…' : 'Continuar'}
            disabled={!canContinue}
            onPress={continuar}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 48,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: fontSizes.xxl,
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foregroundMuted,
    lineHeight: 24,
    marginBottom: 20,
  },
  previewLink: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAccent,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 34,
  },
  previewLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
  inputContainer: { marginBottom: 24 },
  inputLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    fontFamily: fonts.sans,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  consentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.foregroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.accentForeground,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
  },
  consentText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    lineHeight: 20,
  },
  consentLink: {
    fontFamily: fonts.sansMedium,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
