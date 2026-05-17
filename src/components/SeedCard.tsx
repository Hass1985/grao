import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

interface SeedCardProps {
  seed: Seed;
  compact?: boolean;
}

const typeLabel: Record<string, string> = {
  reflexão: 'Reflexão',
  oração: 'Oração',
  prática: 'Prática',
};

export default function SeedCard({ seed, compact = false }: SeedCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{typeLabel[seed.type]}</Text>
        </View>
        <View style={[styles.tag, styles.tagSecondary]}>
          <Text style={styles.tagText}>{seed.family.charAt(0).toUpperCase() + seed.family.slice(1)}</Text>
        </View>
      </View>

      <Text style={styles.passage}>"{seed.passage}"</Text>
      <Text style={styles.reference}>{seed.reference}</Text>

      {!compact && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Reflexão</Text>
          <Text style={styles.body}>{seed.reflection}</Text>

          <Text style={styles.sectionLabel}>Oração</Text>
          <Text style={styles.body}>{seed.prayer}</Text>

          <Text style={styles.sectionLabel}>Prática</Text>
          <Text style={styles.body}>{seed.practice}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: colors.casca12,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.casca40,
  },
  tagText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passage: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.casca,
    lineHeight: 28,
    marginBottom: 8,
  },
  reference: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.ambar,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.casca12,
    marginVertical: 20,
  },
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.casca,
    lineHeight: 24,
  },
});
