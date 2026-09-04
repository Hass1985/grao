import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { Music } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

interface MusicCardProps {
  music: Music;
}

// Logo do Spotify (as 3 ondas) em branco, para ir dentro do círculo verde.
const SpotifyGlyph = ({ s = 22 }: { s?: number }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.62.62 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.871 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 11-.452-1.492c3.632-1.102 8.147-.568 11.232 1.329a.78.78 0 01.257 1.072zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z"
      fill="#FFFFFF"
    />
  </Svg>
);

const YouTubeGlyph = ({ s = 20 }: { s?: number }) => (
  <Svg width={s} height={s * 0.72} viewBox="0 0 24 17">
    <Polygon points="9.5,4 9.5,13 17,8.5" fill="#FFFFFF" />
  </Svg>
);

export default function MusicCard({ music }: MusicCardProps) {
  const openLink = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.ruleRow}>
          <View style={styles.ruleLine} />
          <Text style={styles.ruleLabel}>Música</Text>
          <View style={styles.ruleLine} />
        </View>

        <Text style={styles.title}>{music.title}</Text>
        <Text style={styles.artist}>{music.artist}</Text>

        <View style={styles.links}>
        {music.spotifyUrl && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: '#1DB954' }]}
            onPress={() => openLink(music.spotifyUrl)}
            activeOpacity={0.8}
            accessibilityLabel="Ouvir no Spotify"
          >
            <SpotifyGlyph />
          </TouchableOpacity>
        )}
        {music.youtubeUrl && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: '#FF0000' }]}
            onPress={() => openLink(music.youtubeUrl)}
            activeOpacity={0.8}
            accessibilityLabel="Ouvir no YouTube"
          >
            <YouTubeGlyph />
          </TouchableOpacity>
        )}
      </View>
      </View>
    </View>
  );
}

const BTN = 44;

const styles = StyleSheet.create({
  container: { alignItems: 'stretch', paddingVertical: 20 },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
    ...(shadows.sm as object),
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  ruleLine: { flex: 1, height: 1, backgroundColor: colors.border },
  ruleLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: fontSizes.lg,
    color: colors.foreground,
    marginBottom: 4,
    textAlign: 'center',
  },
  artist: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    marginBottom: 18,
    textAlign: 'center',
  },
  links: { flexDirection: 'row', gap: 16 },
  iconBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
