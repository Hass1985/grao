import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Music } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { TAB_DOCK_CLEARANCE } from './ui/FloatingTabBar';

type Props = {
  music: Music;
};

const SpotifyGlyph = ({ s = 12 }: { s?: number }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.62.62 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.871 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 11-.452-1.492c3.632-1.102 8.147-.568 11.232 1.329a.78.78 0 01.257 1.072zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z"
      fill="#FFFFFF"
    />
  </Svg>
);

/** Player slim flutuante — creme claro, centrado e um pouco acima do dock. */
export default function MusicPlayer({ music }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const url = music.spotifyUrl || music.youtubeUrl;

  const open = () => {
    if (url) Linking.openURL(url);
  };

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: Platform.OS !== 'web',
      friction: 6,
      tension: 200,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      friction: 5,
      tension: 160,
    }).start();
  };

  return (
    <View pointerEvents="box-none" style={styles.dock}>
      <View style={styles.bar}>
        <View style={styles.art}>
          <SpotifyGlyph />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {music.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {music.artist}
          </Text>
        </View>
        <Pressable onPress={open} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityLabel="Ouvir música">
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={['#D4924A', '#C07826', '#A8651C']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.playBtn}
            >
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

/** Espaço sob o conteúdo: player + dock de tabs. */
export const MUSIC_PLAYER_CLEARANCE = 72 + TAB_DOCK_CLEARANCE;

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TAB_DOCK_CLEARANCE + 10,
    paddingHorizontal: 36,
    zIndex: 20,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
    gap: 10,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    ...(shadows.md as object),
  },
  art: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    color: colors.foreground,
    letterSpacing: -0.1,
  },
  artist: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
});
