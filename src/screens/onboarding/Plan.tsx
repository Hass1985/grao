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
import { shadows } from '../../theme/shadows';
import { webScreenFill, webScroll } from '../../theme/webScreen';
import { getUserId, escolherPlano } from '../../onboarding/aiClient';

type Props = {
  onFinish: () => void;
  navigation?: any;
};

const plans = [
  {
    id: 'plantio',
    label: 'Plantio',
    badge: 'Mais escolhido',
    price: 'R$ 19,90',
    period: '/mês',
    detail: 'Para quem quer crescer na fé com profundidade e continuidade.',
    features: [
      'Uma semente diária com reflexão bíblica',
      'Oração guiada personalizada pro seu dia',
      'Conteúdo baseado em quem você é e como está hoje',
      'Histórico completo de sementes',
      'Diário de oração e práticas',
      'Comunidade da sua congregação',
      'Experiência limpa e focada',
    ],
    featured: true,
  },
  {
    id: 'anual',
    label: 'Anual',
    badge: '2 meses de graça',
    price: 'R$ 199,00',
    period: '/ano',
    detail: 'Fidelidade com desconto. A mesma experiência completa, com mais.',
    features: [
      'Tudo do plano Plantio',
      'Economia de 2 meses por ano',
      'Acesso antecipado a novidades',
    ],
    featured: false,
  },
];

export default function Plan({ onFinish, navigation }: Props) {
  const [selected, setSelected] = useState('plantio');

  // Grava a escolha e segue na hora. Não esperamos a resposta: o registro é
  // para o painel, não para a pessoa — deixá-la olhando um botão parado por
  // causa de uma chamada de rede seria pior do que perder um dado.
  async function concluir() {
    getUserId()
      .then((id) => escolherPlano(id, selected as 'plantio' | 'anual'))
      .catch(() => {});
    onFinish();
  }

  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <ScrollView style={webScroll} contentContainerStyle={styles.scroll}>

        <TouchableOpacity onPress={() => (navigation as any)?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.eyebrow}>PLANOS · PASSO 4</Text>
        <Text style={styles.title}>Escolha seu plano</Text>
        <Text style={styles.subtitle}>
          7 dias grátis para conhecer o Grão. Cancele quando quiser.
        </Text>

        <View style={styles.list}>
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.card,
                  plan.featured && styles.cardFeatured,
                  isSelected && styles.cardSelected,
                ]}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.9}
              >
                {plan.featured && <View style={styles.accentBar} />}

                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.planLabel, plan.featured && styles.planLabelFeatured]}>
                      {plan.label}
                    </Text>
                    {plan.badge && (
                      <View style={[styles.badge, plan.featured && styles.badgeFeatured]}>
                        <Text style={[styles.badgeText, plan.featured && styles.badgeTextFeatured]}>
                          {plan.badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={[styles.price, plan.featured && styles.priceFeatured]}>
                      {plan.price}
                    </Text>
                    <Text style={styles.period}>{plan.period}</Text>
                  </View>

                  <Text style={styles.detail}>{plan.detail}</Text>

                  <View style={styles.rule} />

                  <View style={styles.features}>
                    {plan.features.map((feature) => (
                      <View key={feature} style={styles.featureRow}>
                        <View style={styles.featureDash} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={concluir} activeOpacity={0.85}>
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
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 30, color: colors.accent, lineHeight: 36, fontFamily: fonts.sans },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
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
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foregroundMuted,
    lineHeight: 24,
    marginBottom: 28,
  },
  list: { gap: 14, marginBottom: 28 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...(shadows.sm as object),
  },
  cardFeatured: {
    backgroundColor: colors.surfaceAccent,
    ...(shadows.md as object),
  },
  cardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.accent,
    width: '100%',
  },
  cardInner: { padding: 20 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  planLabelFeatured: { color: colors.accent },
  badge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeFeatured: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badgeTextFeatured: { color: colors.accentForeground },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  price: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxxl,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  priceFeatured: { color: colors.foreground },
  period: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  detail: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    lineHeight: 20,
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  features: { gap: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureDash: {
    width: 12,
    height: 1,
    backgroundColor: colors.accent,
    marginTop: 10,
  },
  featureText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
    ...(shadows.sm as object),
  },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accentForeground,
    letterSpacing: 0.3,
  },
  legal: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
});
