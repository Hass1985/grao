import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Music } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

interface MusicCardProps {
  music: Music;
}

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
          <TouchableOpacity onPress={() => openLink(music.spotifyUrl)}>
            <Text style={styles.link}>Spotify</Text>
          </TouchableOpacity>
        )}
        {music.youtubeUrl && (
          <TouchableOpacity onPress={() => openLink(music.youtubeUrl)}>
            <Text style={styles.link}>YouTube</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  divider: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.casca40,
    marginBottom: 16,
    letterSpacing: 4,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    color: colors.casca40,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.casca,
    marginBottom: 4,
  },
  artist: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.casca60,
    marginBottom: 16,
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.ambar,
    textDecorationLine: 'underline',
  },
});
