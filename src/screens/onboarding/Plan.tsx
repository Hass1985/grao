import React, { useEffect, useState } from 'react';
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
import { radius } from '../../theme/radius';
import { glassCard } from '../../theme/glass';
import { webScreenFill, webScroll } from '../../theme/webScreen';
import { space } from '../../theme/spacing';
import { getUserId, escolherPlano } from '../../onboarding/aiClient';
import { configuracaoDeCobranca, emReais } from '../../onboarding/assinatura';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import StepProgress from '../../components/ui/StepProgress';

type Props = {
  onFinish: () => void;
  navigation?: any;
};

const plans = [
  {
    id: 'plantio',
    label: 'Plantio',
    badge: 'Mais escolhido',
    price: 'R$ 29,90',
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
    badge: 'Melhor preço',
    price: 'R$ 199,00',
    period: '/ano',
    detail: 'Fidelidade com desconto. A mesma experiência completa, com mais.',
    features: [
      'Tudo do plano Plantio',
      'Acesso antecipado a novidades',
    ],
    featured: false,
  },
];

/**
 * Preço e desconto vêm do servidor, do lado de onde a cobrança é criada.
 *
 * Esta era a última tela com o valor escrito à mão, e por isso a primeira a
 * mentir quando o preço mudou: anunciava R$ 19,90 enquanto o gateway passava a
 * cobrar outro valor. O selo do anual tinha o mesmo defeito em forma de conta
 * — "2 meses de graça" só era verdade enquanto o anual custasse dez
 * mensalidades. Agora a economia é calculada dos dois preços que existem.
 */
function useCobranca() {
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [desconto, setDesconto] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    configuracaoDeCobranca().then((c) => {
      if (!vivo || !c) return;

      const mapa: Record<string, string> = {};
      for (const p of c.planos) mapa[p.id] = emReais(p.valorCentavos);
      setPrecos(mapa);

      const mes = c.planos.find((p) => p.id === 'plantio')?.valorCentavos;
      const ano = c.planos.find((p) => p.id === 'anual')?.valorCentavos;
      if (mes && ano) {
        const pct = Math.round((1 - ano / (mes * 12)) * 100);
        setDesconto(pct > 0 ? pct : null);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  return { precos, desconto };
}

export default function Plan({ onFinish, navigation }: Props) {
  const [selected, setSelected] = useState('plantio');
  const { precos, desconto } = useCobranca();

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
      <StepProgress step={6} />
      <ScrollView style={webScroll} contentContainerStyle={styles.scroll}>

        <BackButton onPress={() => (navigation as any)?.goBack?.()} />

        <Text style={styles.eyebrow}>Planos · passo 6</Text>
        <Text style={styles.title}>Escolha no seu tempo</Text>
        <Text style={styles.subtitle}>
          7 dias grátis para conhecer o Grão. Cancele quando quiser.
        </Text>

        <View style={styles.list}>
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            const anual = plan.id === 'anual';
            const selo = anual && desconto ? `${desconto}% de desconto` : plan.badge;
            const beneficios =
              anual && desconto
                ? [plan.features[0], `Economia de ${desconto}% no ano`, ...plan.features.slice(1)]
                : plan.features;
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
                    {selo && (
                      <View style={[styles.badge, plan.featured && styles.badgeFeatured]}>
                        <Text style={[styles.badgeText, plan.featured && styles.badgeTextFeatured]}>
                          {selo}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={[styles.price, plan.featured && styles.priceFeatured]}>
                      {precos[plan.id] ?? plan.price}
                    </Text>
                    <Text style={styles.period}>{plan.period}</Text>
                  </View>

                  <Text style={styles.detail}>{plan.detail}</Text>

                  <View style={styles.rule} />

                  <View style={styles.features}>
                    {beneficios.map((feature) => (
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

        <Button title="Começar 7 dias grátis" onPress={concluir} style={{ marginBottom: 16 }} />

        <Text style={styles.legal}>
          No 8º dia, a cobrança é feita automaticamente. Cancele antes sem custo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: space.gutter, paddingTop: 8, paddingBottom: 48 },
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
    marginBottom: 28,
  },
  list: { gap: 14, marginBottom: 28 },

  card: {
    ...glassCard,
    borderRadius: 28,
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
    borderRadius: radius.pill,
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
    fontFamily: fonts.serifMedium,
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
  legal: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
});
