import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sprout, CalendarDays, BookOpen, type LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { radius } from '../../theme/radius';

export const TAB_DOCK_CLEARANCE = 78;

const ICON = 18;

const TAB_ICONS: Record<string, LucideIcon> = {
  Hoje: Sprout,
  Campo: CalendarDays,
  Raiz: BookOpen,
};

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const focused = state.index === index;
          const Icon = TAB_ICONS[route.name] ?? Sprout;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
              style={({ pressed }) => [
                styles.item,
                focused && styles.itemActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon
                size={ICON}
                color={focused ? colors.ambarSoft : colors.foregroundSubtle}
                strokeWidth={focused ? 2.4 : 1.9}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    ...(shadows.float as object),
  },
  item: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: {
    backgroundColor: colors.surfaceAccent,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundSubtle,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: colors.palha,
    fontFamily: fonts.sansSemi,
  },
});
