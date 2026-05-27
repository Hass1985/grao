import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Svg, { Circle, Line, Rect, Polygon } from 'react-native-svg';
import { Music } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

interface MusicCardProps {
  music: Music;
}

const SpotifyIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <Circle cx="10" cy="10" r="10" fill="#1DB954" />
    <Line x1="5.5" y1="7.5" x2="14.5" y2="7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    <Line x1="5" y1="10.5" x2="15" y2="10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    <Line x1="5.5" y1="13.5" x2="14.5" y2="13.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const YouTubeIcon = () => (
  <Svg width={26} height={18} viewBox="0 0 26 18">
    <Rect x="0" y="0" width="26" height="18" rx="4" fill="#FF0000" />
    <Polygon points="10,5 10,13 18,9" fill="white" />
  </Svg>
);

export default function MusicCard({ music }: MusicCardProps) {
  const openLink = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.divider}>○ — ○ — ○</Text>
      <Text style={styles.label}>Música para hoje</Text>
      <Text style={styles.title}>{music.title}</Text>
      <Text style={styles.artist}>{music.artist}</Text>
      <View style={styles.links}>
        {music.spotifyUrl && (
          <TouchableOpacity style={styles.musicBtn} onPress={() => openLink(music.spotifyUrl)} activeOpacity={0.8}>
            <SpotifyIcon />
            <Text style={[styles.musicBtnText, { color: '#1DB954' }]}>Spotify</Text>
          </TouchableOpacity>
        )}
        {music.youtubeUrl && (
          <TouchableOpacity style={styles.musicBtn} onPress={() => openLink(music.youtubeUrl)} activeOpacity={0.8}>
            <YouTubeIcon />
            <Text style={[styles.musicBtnText, { color: '#FF0000' }]}>YouTube</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 20 },
  divider: {
    fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca40,
    marginBottom: 16, letterSpacing: 4,
  },
  label: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.casca, marginBottom: 4 },
  artist: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca60, marginBottom: 16 },
  links: { flexDirection: 'row', gap: 12 },
  musicBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.white, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.casca12,
  },
  musicBtnText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm },
});
