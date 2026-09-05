import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GraoSymbol from '../GraoSymbol';
import ProfileButton from '../ProfileButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { logoSize, logoSlot, space } from '../../theme/spacing';

type Props = {
  title: string;
  subtitle?: string;
  onLogoPress?: () => void;
  onProfilePress: () => void;
};

/** Cabeçalho no ritmo do site: marca palha + título claro. */
export default function AppHeader({ title, subtitle, onLogoPress, onProfilePress }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={styles.side}>
            <ProfileButton onPress={onProfilePress} size={36} />
          </View>

          <View style={styles.center}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={onLogoPress}
            disabled={!onLogoPress}
            hitSlop={10}
            accessibilityLabel="Grão"
            style={styles.side}
          >
            <GraoSymbol size={logoSize} color={colors.ambarSoft} filled={false} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: -space.gutter,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inner: {
    paddingHorizontal: space.gutter,
    paddingTop: 6,
    paddingBottom: 14,
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
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 26,
    color: colors.palha,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.foregroundMuted,
  },
});
