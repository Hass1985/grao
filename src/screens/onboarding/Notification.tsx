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

type Props = {
  navigation: StackNavigationProp<any>;
};

// Faixas contíguas de 4 horas, cobrindo das 6h às 22h.
//
// As faixas antigas eram estreitas e deixavam 6 horas do dia sem janela
// nenhuma. Quem escolhia "Meio-dia" às 13h40 já tinha perdido o disparo das
// 12h e não recebia nada — foi o que aconteceu no teste. Os ids viajam até o
// banco e o cron: mudar um deles exige migração (ver 009_janelas.sql).
const windows = [
  { id: 'dawn', label: 'Amanhecer', time: '6h – 10h', description: 'Comece o dia com a semente' },
  { id: 'noon', label: 'Meio-dia', time: '10h – 14h', description: 'Uma pausa no seu dia' },
  { id: 'afternoon', label: 'Tarde', time: '14h – 18h', description: 'Retome o ritmo' },
  { id: 'evening', label: 'Noite', time: '18h – 22h', description: 'Encerre o dia com calma' },
];

export default function Notification({ navigation }: Props) {
  const [selected, setSelected] = useState('dawn');

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
          <Text style={styles.title}>Quando quer receber sua semente?</Text>
          <Text style={styles.subtitle}>
            Você vai receber via WhatsApp. Pode mudar isso depois.
          </Text>

        <View style={styles.list}>
          {windows.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.item, selected === w.id && styles.itemSelected]}
              onPress={() => setSelected(w.id)}
              activeOpacity={0.8}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemLabel, selected === w.id && styles.itemLabelSelected]}>
                  {w.label}
                </Text>
                <Text style={styles.itemDesc}>{w.description}</Text>
              </View>
              <Text style={[styles.itemTime, selected === w.id && styles.itemTimeSelected]}>
                {w.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('WhatsApp', { window: selected })}
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
    marginBottom: 28,
  },
  list: { gap: 10 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  itemSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.surfaceAccent,
  },
  itemLeft: { gap: 4 },
  itemLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  itemLabelSelected: { color: colors.accent },
  itemDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  itemTime: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foregroundSubtle,
  },
  itemTimeSelected: { color: colors.accent },
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
