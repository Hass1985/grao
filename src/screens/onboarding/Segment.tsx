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

type Props = {
  navigation: StackNavigationProp<any>;
};

const segments = [
  { id: 'young_m', label: 'Jovem', sublabel: 'Masculino', age: '13–24' },
  { id: 'young_f', label: 'Jovem', sublabel: 'Feminino', age: '13–24' },
  { id: 'adult_m', label: 'Adulto', sublabel: 'Masculino', age: '25–59' },
  { id: 'adult_f', label: 'Adulto', sublabel: 'Feminino', age: '25–59' },
  { id: 'elder_m', label: 'Idoso', sublabel: 'Masculino', age: '60+' },
  { id: 'elder_f', label: 'Idoso', sublabel: 'Feminino', age: '60+' },
];

const traditions = [
  { id: 'evangelical', label: 'Evangélico' },
  { id: 'catholic', label: 'Católico' },
];

export default function Segment({ navigation }: Props) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);

  const canContinue = selectedSegment !== null && selectedTradition !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Quem está chegando?</Text>
        <Text style={styles.subtitle}>Isso ajuda a personalizar sua semente diária.</Text>

        <Text style={styles.sectionLabel}>Perfil</Text>
        <View style={styles.grid}>
          {segments.map((seg) => (
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

        <Text style={styles.sectionLabel}>Tradição</Text>
        <View style={styles.row}>
          {traditions.map((trad) => (
            <TouchableOpacity
              key={trad.id}
              style={[styles.tradCard, selectedTradition === trad.id && styles.cardSelected, { flex: 1 }]}
              onPress={() => setSelectedTradition(trad.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cardLabel, selectedTradition === trad.id && styles.cardLabelSelected]}>
                {trad.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={() => canContinue && navigation.navigate('Notification')}
          activeOpacity={canContinue ? 0.85 : 1}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 },
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
    marginBottom: 32,
    lineHeight: 24,
  },
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  card: {
    width: '30%',
    backgroundColor: colors.peneira,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tradCard: {
    backgroundColor: colors.peneira,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.ambar,
    backgroundColor: colors.white,
  },
  cardLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.casca,
  },
  cardLabelSelected: { color: colors.ambar },
  cardSub: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.casca60,
    marginTop: 2,
  },
  cardSubSelected: { color: colors.casca60 },
  cardAge: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    marginTop: 2,
  },
  cardAgeSelected: { color: colors.casca40 },
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
