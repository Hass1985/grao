import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GraoSymbol from '../GraoSymbol';
import ProfileButton from '../ProfileButton';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import { logoSize, logoSlot, space } from '../../theme/spacing';

type Props = {
  title: string;
  subtitle?: string;
  onLogoPress?: () => void;
  onProfilePress: () => void;
};

/**
 * Cabeçalho padrão do app (Hoje / Campo / Raiz).
 * Barra palha full-bleed atrás de logo · título · avatar · data.
 */
export default function AppHeader({ title, subtitle, onLogoPress, onProfilePress }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    // Escapa o padding do ScrollView para ir de borda a borda
    marginHorizontal: -space.gutter,
    marginBottom: 0,
    backgroundColor: colors.surfaceSeed,
  },
  inner: {
    paddingHorizontal: space.gutter,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 2,
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
    lineHeight: 18,
    color: colors.foregroundMuted,
    marginTop: -2,
  },
});
