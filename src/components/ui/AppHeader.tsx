import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GraoSymbol from '../GraoSymbol';
import ProfileButton from '../ProfileButton';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { logoSize, logoSlot } from '../../theme/spacing';

type Props = {
  title: string;
  subtitle?: string;
  onLogoPress?: () => void;
  onProfilePress: () => void;
};

/**
 * Cabeçalho padrão do app (Hoje / Campo / Raiz).
 * Logo centrado no mesmo slot 40×40 do BackButton.
 */
export default function AppHeader({ title, subtitle, onLogoPress, onProfilePress }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onLogoPress}
          disabled={!onLogoPress}
          hitSlop={10}
          accessibilityLabel="Grão"
          style={styles.side}
        >
          <GraoSymbol size={logoSize} color={colors.accent} filled={false} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.side}>
          <ProfileButton onPress={onProfilePress} size={32} />
        </View>
      </View>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingBottom: 18,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: logoSlot,
  },
  side: {
    width: logoSlot,
    height: logoSlot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 26,
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
});
