import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sprout, CalendarDays, BookOpen, type LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { shadows } from '../../theme/shadows';

/** Altura reservada acima da safe area para conteúdo (player / scroll). */
export const TAB_DOCK_CLEARANCE = 78;

const CIRCLE = 44;
const ICON = 20;

const TAB_ICONS: Record<string, LucideIcon> = {
  Hoje: Sprout,
  Campo: CalendarDays,
  Raiz: BookOpen,
};

/**
 * Dock flutuante — três círculos sem barra contínua.
 * Ícones Lucide por aba; label inativo em âmbar médio (creme e marrom).
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={styles.row}>
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
              style={styles.item}
            >
              <View style={[styles.circle, focused && styles.circleActive]}>
                <Icon
                  size={ICON}
                  color={colors.accent}
                  strokeWidth={focused ? 2.25 : 1.75}
                />
              </View>
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
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  item: {
    alignItems: 'center',
    gap: 5,
    minWidth: 56,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: colors.surface,
    ...(shadows.sm as object),
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.ambarSoft,
    letterSpacing: 0.15,
  },
  labelActive: {
    color: colors.accent,
    fontFamily: fonts.sansSemi,
  },
});
