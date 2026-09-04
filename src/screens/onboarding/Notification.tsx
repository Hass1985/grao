import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { webScreenFill } from '../../theme/webScreen';
import SeletorHorario from '../../components/SeletorHorario';

type Props = {
  navigation: StackNavigationProp<any>;
};

/**
 * Horário padrão: 7h.
 *
 * Não é neutro — é o horário que a maioria de quem já testou escolheu, e ficar
 * em branco custaria uma decisão a mais logo no começo. Quem quiser outro,
 * troca com um toque.
 */
const PADRAO = '07:00';

export default function Notification({ navigation }: Props) {
  const [horario, setHorario] = useState(PADRAO);

  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>RITMO · PASSO 2</Text>
          <Text style={styles.title}>Que horas você quer receber?</Text>
          <Text style={styles.subtitle}>
            Escolha um horário em que você costuma ter um minuto livre. É nele que
            a semente chega, pelo WhatsApp. Pode mudar depois.
          </Text>

          <SeletorHorario valor={horario} onChange={setHorario} />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('WhatsApp', { time: horario })}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navHeader: { paddingHorizontal: 20, paddingTop: 8 },
  backBtnText: { fontSize: 30, color: colors.accent, lineHeight: 36, fontFamily: fonts.sans },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
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
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.foreground,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foregroundMuted,
    lineHeight: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    ...(shadows.sm as object),
  },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accentForeground,
    letterSpacing: 0.3,
  },
});
