import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { getAvatarUri, getDisplayName, initialsFrom } from '../onboarding/userProfile';

interface Props {
  onPress: () => void;
  size?: number;
}

// Avatar do usuário: mostra a foto quando existir; senão, as iniciais num
// círculo com o âmbar da marca. Recarrega ao focar a tela (foto/nome atualizados).
export default function ProfileButton({ onPress, size = 38 }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [initials, setInitials] = useState('V');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [a, name] = await Promise.all([getAvatarUri(), getDisplayName()]);
        if (!active) return;
        setUri(a);
        setInitials(initialsFrom(name));
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.initialsWrap, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  initialsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAccent,
  },
  initials: {
    fontFamily: fonts.serif,
    color: colors.accent,
    marginTop: 1,
  },
});
