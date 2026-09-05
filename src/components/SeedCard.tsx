import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polygon } from 'react-native-svg';
import { Seed } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { shadows } from '../theme/shadows';
import { radius } from '../theme/radius';
import { glassBlur } from '../theme/glass';
import Reveal from './ui/Reveal';

interface SeedCardProps {
  seed: Seed;
  compact?: boolean;
  featured?: boolean;
  /** Inclui a música dentro do mesmo card (Raiz). */
  embedMusic?: boolean;
  /** Abre o fluxo explicativo do Plantio (free). */
  onSaibaMais?: () => void;
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

/**
 * Card no ritmo dos planos do site:
 * glass quente e suave, tipografia palha + âmbar.
 */
export default function SeedCard({
  seed,
  compact = false,
  featured = false,
  embedMusic = false,
  onSaibaMais,
}: SeedCardProps) {
  const open = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  const isDevocional = seed.tipo === 'devocional' || seed.completa === false;
  const music = seed.music;
  const showMusic = !isDevocional && embedMusic && !!music;

  const content = (
    <View style={styles.inner}>
      <View style={styles.tags}>
        {isDevocional ? (
          <>
            <Text style={styles.tagText}>Devocional</Text>
            {seed.title ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.tagText} numberOfLines={1}>
                  {seed.title}
                </Text>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.tagText}>{typeLabel[seed.type] || 'Semente'}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.tagText}>
              {seed.family.charAt(0).toUpperCase() + seed.family.slice(1)}
            </Text>
          </>
        )}
      </View>

      <Reveal triggerKey={seed.id} delay={60}>
        <Text style={styles.passage}>{seed.passage}</Text>
        <Text style={styles.reference}>{seed.reference}</Text>
      </Reveal>

      {!compact && (
        <Reveal triggerKey={`${seed.id}-body`} delay={200}>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isDevocional ? 'Devocional' : 'Reflexão'}
            </Text>
            <Text style={styles.body}>{seed.reflection}</Text>
          </View>

          {!isDevocional && seed.prayer ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Oração</Text>
              <Text style={styles.body}>{seed.prayer}</Text>
            </View>
          ) : null}

          {!isDevocional && seed.practice ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prática</Text>
              <Text style={styles.body}>{seed.practice}</Text>
            </View>
          ) : null}

          {isDevocional ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Faça parte da comunidade</Text>
              <View style={styles.locked}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    'rgba(251, 246, 236, 0.2)',
                    'rgba(251, 246, 236, 0.12)',
                    'rgba(251, 246, 236, 0.16)',
                  ]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.lockedShine}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    'rgba(251, 246, 236, 0.22)',
                    'transparent',
                    'transparent',
                    'rgba(251, 246, 236, 0.1)',
                  ]}
                  locations={[0, 0.08, 0.92, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.lockedEdge}
                />
                <Text style={styles.lockedLead}>
                  A semente personalizada traz:
                </Text>
                <View style={styles.lockedList}>
                  {[
                    'Oração guiada para o seu momento',
                    'Prática concreta para viver a Palavra',
                    'Louvor escolhido para o seu dia',
                    'Tudo no WhatsApp, todo dia, no horário certo',
                  ].map((item) => (
                    <View key={item} style={styles.lockedRow}>
                      <Text style={styles.lockedBullet}>·</Text>
                      <Text style={styles.lockedItem}>{item}</Text>
                    </View>
                  ))}
                </View>
                {onSaibaMais ? (
                  <TouchableOpacity
                    onPress={onSaibaMais}
                    style={styles.saibaMais}
                    accessibilityRole="button"
                    accessibilityLabel="Clique e saiba mais sobre o Plantio"
                    hitSlop={8}
                  >
                    <Text style={styles.saibaMaisText}>Clique e saiba mais</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}
        </Reveal>
      )}

      {showMusic && music ? (
        <View style={styles.musicBlock}>
          <Text style={styles.musicLabel}>Música</Text>
          <View style={styles.musicRow}>
            <View style={styles.musicMeta}>
              <Text style={styles.musicTitle} numberOfLines={1}>
                {music.title}
              </Text>
              <Text style={styles.musicArtist} numberOfLines={1}>
                {music.artist}
              </Text>
            </View>
            <View style={styles.musicLinks}>
              {music.spotifyUrl && (
                <TouchableOpacity
                  style={[styles.musicBtn, { backgroundColor: '#1DB954' }]}
                  onPress={() => open(music.spotifyUrl)}
                  accessibilityLabel="Ouvir no Spotify"
                >
                  <SpotifyGlyph />
                </TouchableOpacity>
              )}
              {music.youtubeUrl && (
                <TouchableOpacity
                  style={[styles.musicBtn, { backgroundColor: '#FF0000' }]}
                  onPress={() => open(music.youtubeUrl)}
                  accessibilityLabel="Ouvir no YouTube"
                >
                  <YouTubeGlyph />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.shell, shadows.md as object]}>
      {Platform.OS === 'web' ? (
        <View style={[styles.glass, featured && styles.glassFeatured]}>{content}</View>
      ) : (
        <BlurView intensity={featured ? 44 : 36} tint="dark" style={styles.blur}>
          <View style={[styles.tint, featured && styles.tintFeatured]} />
          {content}
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
    borderRadius: 28,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceSoft,
  },
  tintFeatured: {
    backgroundColor: colors.surfaceSeedSoft,
  },
  glass: {
    backgroundColor: colors.surface,
    ...glassBlur,
  },
  glassFeatured: {
    backgroundColor: colors.surfaceSoft,
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
    marginBottom: 18,
  },
  tagText: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.ambarSoft,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  dot: {
    color: 'rgba(247, 240, 226, 0.35)',
    fontSize: 12,
  },
  passage: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    color: colors.palha,
    lineHeight: 34,
    letterSpacing: -0.35,
    marginBottom: 12,
  },
  reference: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.sm,
    color: colors.ambarSoft,
    marginBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(247, 240, 226, 0.14)',
    marginTop: 22,
    marginBottom: 4,
  },
  section: {
    marginTop: 20,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    color: colors.ambarSoft,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.foregroundMuted,
    lineHeight: 26,
  },
  locked: {
    overflow: 'hidden',
    backgroundColor: 'rgba(72, 48, 24, 0.28)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 10px 28px rgba(36, 23, 8, 0.16)',
        } as object)
      : {
          shadowColor: '#241708',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 3,
        }),
  },
  lockedShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  lockedEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  lockedLead: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    lineHeight: 22,
    color: colors.palha,
  },
  lockedList: {
    gap: 8,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  lockedBullet: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(247, 240, 226, 0.55)',
  },
  lockedItem: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.palha,
  },
  saibaMais: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(192, 120, 38, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(216, 154, 85, 0.45)',
  },
  saibaMaisText: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    color: colors.ambarSoft,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  musicBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(247, 240, 226, 0.14)',
    gap: 12,
  },
  musicLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    color: colors.ambarSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.base,
    color: colors.palha,
  },
  musicArtist: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
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
