import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';

interface SeedCardProps {
  seed: Seed;
  compact?: boolean;
  featured?: boolean; // amber top border + accent background (today's seed)
}

const typeLabel: Record<string, string> = {
  reflexão: 'Reflexão',
  oração: 'Oração',
  prática: 'Prática',
};

export default function SeedCard({ seed, compact = false, featured = false }: SeedCardProps) {
  return (
    <View style={[styles.card, featured && styles.cardFeatured, shadows.md as any]}>
      {/* Amber top accent border */}
      {featured && <View style={styles.accentBar} />}

      <View style={styles.inner}>
        {/* Tags */}
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{typeLabel[seed.type]}</Text>
          </View>
          <View style={[styles.tag, styles.tagOutline]}>
            <Text style={styles.tagText}>
              {seed.family.charAt(0).toUpperCase() + seed.family.slice(1)}
            </Text>
          </View>
        </View>

        {/* Passage */}
        <Text style={styles.passage}>"{seed.passage}"</Text>
        <Text style={styles.reference}>{seed.reference}</Text>

        {/* Expanded content */}
        {!compact && (
          <>
            <View style={styles.rule} />
            <SectionLabel>Reflexão</SectionLabel>
            <Text style={styles.body}>{seed.reflection}</Text>

            <SectionLabel style={{ marginTop: 16 }}>Oração</SectionLabel>
            <Text style={styles.body}>{seed.prayer}</Text>

            <SectionLabel style={{ marginTop: 16 }}>Prática</SectionLabel>
            <Text style={styles.body}>{seed.practice}</Text>
          </>
        )}
      </View>
    </View>
  );
}

function SectionLabel({ children, style }: { children: string; style?: object }) {
  return (
    <View style={[styles.sectionLabelRow, style]}>
      <View style={styles.ruleLine} />
      <Text style={styles.sectionLabelText}>{children}</Text>
      <View style={styles.ruleLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardFeatured: {
    backgroundColor: colors.surfaceAccent,
    borderColor: colors.border,
  },
  accentBar: {
    height: 2,
    backgroundColor: colors.accent,
    width: '100%',
  },
  inner: {
    padding: 20,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: colors.casca08,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  passage: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    lineHeight: 28,
    marginBottom: 8,
  },
  reference: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ruleLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sectionLabelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foreground,
    lineHeight: 26,
  },
});
