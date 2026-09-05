import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sprout, CalendarDays, BookOpen, type LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { shadows } from '../../theme/shadows';

/** Altura reservada acima da safe area para conteúdo (player / scroll). */
export const TAB_DOCK_CLEARANCE = 70;

const ICON = 15;

const TAB_ICONS: Record<string, LucideIcon> = {
  Hoje: Sprout,
  Campo: CalendarDays,
  Raiz: BookOpen,
};

/**
 * Três bolinhas separadas — ícone + label dentro de cada uma,
 * para o texto não conflitar com o conteúdo ao rolar.
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
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.bubble, focused && styles.bubbleActive]}>
                <Icon
                  size={ICON}
                  color={focused ? colors.casca : colors.casca80}
                  strokeWidth={focused ? 2.3 : 1.9}
                />
                <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
              </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  bubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.palhaWarm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    ...(shadows.sm as object),
  },
  bubbleActive: {
    backgroundColor: colors.peneiraSoft,
    ...(shadows.md as object),
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    color: colors.casca60,
    letterSpacing: 0.02,
  },
  labelActive: {
    color: colors.casca,
    fontFamily: fonts.sansSemi,
  },
});
