import React, { useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import {
  getAvatarUri,
  getDisplayName,
  initialsFrom,
  subscribeAvatar,
} from '../onboarding/userProfile';

interface Props {
  onPress: () => void;
  size?: number;
}

/** Avatar do perfil: foto cadastrada em Ajustes, ou iniciais se ainda não houver. */
export default function ProfileButton({ onPress, size = 38 }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [initials, setInitials] = useState('V');

  const reload = useCallback(async () => {
    const [a, name] = await Promise.all([getAvatarUri(), getDisplayName()]);
    setUri(a);
    setInitials(initialsFrom(name));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useEffect(() => subscribeAvatar(() => { void reload(); }), [reload]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel="Abrir perfil"
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityIgnoresInvertColors
        />
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
    backgroundColor: colors.surfaceSoft,
  },
  initialsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  initials: {
    fontFamily: fonts.serif,
    color: colors.foreground,
    marginTop: 1,
  },
});
