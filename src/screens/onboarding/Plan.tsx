import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = {
  onFinish: () => void;
};

const plans = [
  {
    id: 'annual',
    label: 'Anual',
    price: 'R$ 19,90',
    period: '/mês',
    detail: '12x de R$ 19,90 — R$ 238,80/ano',
    badge: 'RECOMENDADO',
  },
  {
    id: 'monthly',
    label: 'Mensal',
    price: 'R$ 29,90',
    period: '/mês',
    detail: 'Renovação automática mensal',
    badge: null,
  },
];

export default function Plan({ onFinish }: Props) {
  const [selected, setSelected] = useState('annual');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Escolha seu plano</Text>
        <Text style={styles.subtitle}>
          7 dias grátis para conhecer o Grão. Cancele quando quiser.
        </Text>

        <View style={styles.list}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.card, selected === plan.id && styles.cardSelected]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.planLabel, selected === plan.id && styles.planLabelSelected]}>
                  {plan.label}
                </Text>
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.price, selected === plan.id && styles.priceSelected]}>
                  {plan.price}
                </Text>
                <Text style={styles.period}>{plan.period}</Text>
              </View>
              <Text style={styles.detail}>{plan.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={onFinish} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Começar 7 dias grátis</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          No 8º dia, a cobrança é feita automaticamente. Cancele antes sem custo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
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
    marginBottom: 32,
  },
  list: { gap: 12, marginBottom: 32 },
  card: {
    backgroundColor: colors.peneira,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.ambar,
    backgroundColor: colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.casca,
  },
  planLabelSelected: { color: colors.ambar },
  badge: {
    backgroundColor: colors.ambar,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  price: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.casca,
  },
  priceSelected: { color: colors.ambar },
  period: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.casca60,
  },
  detail: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.casca60,
  },
  button: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  legal: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textAlign: 'center',
    lineHeight: 18,
  },
});
