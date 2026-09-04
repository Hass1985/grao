import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { radius } from '../theme/radius';
import Reveal from './ui/Reveal';

interface SeedCardProps {
  seed: Seed;
  compact?: boolean;
  featured?: boolean;
  /** Inclui a música dentro do mesmo card (Raiz). No Hoje o player fica flutuante. */
  embedMusic?: boolean;
}

const typeLabel: Record<string, string> = {
  reflexão: 'Reflexão',
  oração: 'Oração',
  prática: 'Prática',
};

const SpotifyGlyph = ({ s = 14 }: { s?: number }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.62.62 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.871 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 11-.452-1.492c3.632-1.102 8.147-.568 11.232 1.329a.78.78 0 01.257 1.072zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z"
      fill="#FFFFFF"
    />
  </Svg>
);

const YouTubeGlyph = ({ s = 12 }: { s?: number }) => (
  <Svg width={s} height={s * 0.72} viewBox="0 0 24 17">
    <Polygon points="9.5,4 9.5,13 17,8.5" fill="#FFFFFF" />
  </Svg>
);

/** Card da semente — casca escura, texto em creme (leitura invertida). */
export default function SeedCard({
  seed,
  compact = false,
  featured = false,
  embedMusic = false,
}: SeedCardProps) {
  const open = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  const showMusic = embedMusic && seed.music;

  return (
    <View style={[styles.card, featured && styles.cardFeatured, (featured ? shadows.md : shadows.sm) as any]}>
      <View style={styles.inner}>
        <View style={styles.tags}>
          <Text style={styles.tagText}>{typeLabel[seed.type]}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.tagText}>
            {seed.family.charAt(0).toUpperCase() + seed.family.slice(1)}
          </Text>
        </View>

        <Reveal triggerKey={seed.id} delay={60}>
          <Text style={styles.passage}>{seed.passage}</Text>
          <Text style={styles.reference}>{seed.reference}</Text>
        </Reveal>

        {!compact && (
          <Reveal triggerKey={`${seed.id}-body`} delay={200}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reflexão</Text>
              <Text style={styles.body}>{seed.reflection}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Oração</Text>
              <Text style={styles.body}>{seed.prayer}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prática</Text>
              <Text style={styles.body}>{seed.practice}</Text>
            </View>
          </Reveal>
        )}

        {showMusic && (
          <View style={styles.musicBlock}>
            <Text style={styles.musicLabel}>Música</Text>
            <View style={styles.musicRow}>
              <View style={styles.musicMeta}>
                <Text style={styles.musicTitle} numberOfLines={1}>
                  {seed.music.title}
                </Text>
                <Text style={styles.musicArtist} numberOfLines={1}>
                  {seed.music.artist}
                </Text>
              </View>
              <View style={styles.musicLinks}>
                {seed.music.spotifyUrl && (
                  <TouchableOpacity
                    style={[styles.musicBtn, { backgroundColor: '#1DB954' }]}
                    onPress={() => open(seed.music.spotifyUrl)}
                    accessibilityLabel="Ouvir no Spotify"
                  >
                    <SpotifyGlyph />
                  </TouchableOpacity>
                )}
                {seed.music.youtubeUrl && (
                  <TouchableOpacity
                    style={[styles.musicBtn, { backgroundColor: '#FF0000' }]}
                    onPress={() => open(seed.music.youtubeUrl)}
                    accessibilityLabel="Ouvir no YouTube"
                  >
                    <YouTubeGlyph />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surfaceSeedSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  cardFeatured: {
    backgroundColor: colors.surfaceSeed,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 28,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  tagText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: 'rgba(247, 241, 232, 0.55)',
    letterSpacing: 0.2,
  },
  dot: {
    color: 'rgba(247, 241, 232, 0.45)',
    fontSize: 12,
  },
  passage: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    color: colors.palha,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  reference: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.ambarSoft,
    marginBottom: 8,
  },
  section: {
    marginTop: 28,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: 'rgba(247, 241, 232, 0.55)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: 'rgba(247, 241, 232, 0.72)',
    lineHeight: 26,
  },
  musicBlock: {
    marginTop: 28,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 241, 232, 0.12)',
    gap: 12,
  },
  musicLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(247, 241, 232, 0.45)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  musicMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  musicTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: fontSizes.base,
    color: colors.palha,
  },
  musicArtist: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: 'rgba(247, 241, 232, 0.55)',
  },
  musicLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  musicBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
