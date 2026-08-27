import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { webScreenFill, webScroll } from '../../theme/webScreen';

type Props = {
  navigation: StackNavigationProp<any>;
};

const segmentPairs = [
  [
    { id: 'young_m', label: 'Jovem', sublabel: 'Masculino', age: '13–24' },
    { id: 'young_f', label: 'Jovem', sublabel: 'Feminino', age: '13–24' },
  ],
  [
    { id: 'adult_m', label: 'Adulto', sublabel: 'Masculino', age: '25–59' },
    { id: 'adult_f', label: 'Adulto', sublabel: 'Feminino', age: '25–59' },
  ],
  [
    { id: 'elder_m', label: 'Idoso', sublabel: 'Masculino', age: '60+' },
    { id: 'elder_f', label: 'Idoso', sublabel: 'Feminino', age: '60+' },
  ],
];

export default function Segment({ navigation }: Props) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={webScroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>PERFIL · PASSO 1</Text>
        <Text style={styles.title}>Quem está chegando?</Text>
        <Text style={styles.subtitle}>Isso ajuda a personalizar sua semente diária.</Text>

        <Text style={styles.sectionLabel}>Perfil</Text>

        <View style={styles.pairsList}>
          {segmentPairs.map((pair, pairIndex) => (
            <View key={pairIndex} style={styles.pairRow}>
              {pair.map((seg) => (
                <TouchableOpacity
                  key={seg.id}
                  style={[styles.card, selectedSegment === seg.id && styles.cardSelected]}
                  onPress={() => setSelectedSegment(seg.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cardLabel, selectedSegment === seg.id && styles.cardLabelSelected]}>
                    {seg.label}
                  </Text>
                  <Text style={[styles.cardSub, selectedSegment === seg.id && styles.cardSubSelected]}>
                    {seg.sublabel}
                  </Text>
                  <Text style={[styles.cardAge, selectedSegment === seg.id && styles.cardAgeSelected]}>
                    {seg.age}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !selectedSegment && styles.buttonDisabled]}
          onPress={() => selectedSegment && navigation.navigate('Notification')}
          activeOpacity={selectedSegment ? 0.85 : 1}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backBtn: {},
  backBtnText: { fontSize: 30, color: colors.accent, lineHeight: 36, fontFamily: fonts.sans },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48 },
  eyebrow: {
    fontFamily: fonts.sansMedium, fontSize: 11, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14,
  },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xxl, color: colors.foreground, marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.foregroundMuted, marginBottom: 28, lineHeight: 24 },
  sectionLabel: {
    fontFamily: fonts.sansMedium, fontSize: 11, color: colors.foregroundSubtle,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14,
  },
  pairsList: { gap: 10, marginBottom: 32 },
  pairRow: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  cardSelected: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.surfaceAccent },
  cardLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.foreground },
  cardLabelSelected: { color: colors.accent },
  cardSub: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.foregroundMuted, marginTop: 2 },
  cardSubSelected: { color: colors.foregroundMuted },
  cardAge: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.foregroundSubtle, marginTop: 2 },
  cardAgeSelected: { color: colors.foregroundSubtle },
  button: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 15, alignItems: 'center', ...(shadows.sm as object) },
  buttonDisabled: { backgroundColor: colors.foregroundSubtle },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.accentForeground, letterSpacing: 0.3 },
});
