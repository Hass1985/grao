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

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function WhatsApp({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);

  const canContinue = phone.replace(/\D/g, '').length >= 10 && consent;

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Seu WhatsApp</Text>
          <Text style={styles.subtitle}>
            É por aqui que você vai receber sua semente todos os dias.
          </Text>

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

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsent(!consent)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              Concordo em receber mensagens do Grão no WhatsApp. Não compartilhamos seu número com terceiros.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={() => canContinue && navigation.navigate('Plan')}
            activeOpacity={canContinue ? 0.85 : 1}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 30, color: colors.ambar, lineHeight: 36, fontFamily: fonts.sans },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.casca,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.casca60,
    lineHeight: 24,
    marginBottom: 40,
  },
  inputContainer: { marginBottom: 24 },
  inputLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    fontFamily: fonts.sans,
    fontSize: fontSizes.lg,
    color: colors.casca,
    borderWidth: 1,
    borderColor: colors.casca12,
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
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.casca40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.ambar,
    borderColor: colors.ambar,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
  },
  consentText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.casca60,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: colors.casca40 },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.white,
  },
});
