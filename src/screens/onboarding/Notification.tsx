import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { webScreenFill } from '../../theme/webScreen';
import { space } from '../../theme/spacing';
import SeletorHorario from '../../components/SeletorHorario';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import StepProgress from '../../components/ui/StepProgress';

type Props = {
  navigation: StackNavigationProp<any>;
};

const PADRAO = '07:00';

export default function Notification({ navigation }: Props) {
  const [horario, setHorario] = useState(PADRAO);

  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <StepProgress step={4} />
      <View style={styles.navHeader}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>Ritmo · passo 4</Text>
          <Text style={styles.title}>Que horas a semente chega?</Text>
          <Text style={styles.subtitle}>
            Escolha um horário em que você costuma ter um minuto livre. É nele que
            ela chega, pelo WhatsApp. Pode mudar depois.
          </Text>

          <SeletorHorario valor={horario} onChange={setHorario} />
        </View>

        <Button
          title="Continuar"
          onPress={() => navigation.navigate('WhatsApp', { time: horario })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navHeader: {
    paddingHorizontal: space.gutter,
    paddingTop: 4,
    paddingBottom: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 40,
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
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foregroundMuted,
    lineHeight: 24,
    marginBottom: 20,
  },
});
