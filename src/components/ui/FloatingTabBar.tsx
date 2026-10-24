import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, BookOpen } from '../icons';
import MaisSheet from './MaisSheet';
import { AncoraDoGuia } from '../GuiaPrimeiroAcesso';
import { getDisplayName } from '../../onboarding/userProfile';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const LOGO_MENU = require('../../../assets/logo-grao-menu.png');
const LOGO_TAMANHO = 58;

export const TAB_DOCK_CLEARANCE = 72;

/**
 * Barra inferior no modelo BiblicAI: Hoje | logo Grão (Mais) | Bíblia.
 * Campo e Loja continuam no app, acessíveis pelo menu central.
 */
export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [maisAberto, setMaisAberto] = useState(false);
  const [nome, setNome] = useState('Você');

  useEffect(() => {
    let vivo = true;
    getDisplayName().then((n) => {
      if (vivo && n) setNome(n);
    });
    return () => { vivo = false; };
  }, [maisAberto]);

  const rotaAtiva = state.routes[state.index]?.name;
  const hojeAtivo = rotaAtiva === 'Hoje';
  const bibliaAtiva = rotaAtiva === 'Biblia';

  const irAba = (name: string) => {
    navigation.navigate(name);
  };

  const irStack = (name: string) => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(name as never);
    else navigation.navigate(name as never);
  };

  return (
    <>
      <View
        style={[
          styles.dock,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <View style={styles.bar}>
          <AncoraDoGuia id="tab-hoje" style={styles.lado}>
            <Pressable
              onPress={() => irAba('Hoje')}
              style={styles.ladoHit}
              accessibilityRole="button"
              accessibilityState={{ selected: hojeAtivo }}
              accessibilityLabel="Hoje"
            >
              <CircleCheck
                size={20}
                color={hojeAtivo ? colors.earth : colors.mist}
                strokeWidth={hojeAtivo ? 2.4 : 1.9}
              />
              <Text style={[styles.label, hojeAtivo && styles.labelAtivo]}>Hoje</Text>
            </Pressable>
          </AncoraDoGuia>

          <AncoraDoGuia id="tab-mais" style={styles.centro}>
            <Pressable
              onPress={() => setMaisAberto(true)}
              style={styles.centro}
              accessibilityRole="button"
              accessibilityLabel="Menu Grão"
              accessibilityState={{ selected: maisAberto }}
            >
              <View style={styles.logoCirculo}>
                <Image
                  source={LOGO_MENU}
                  style={styles.logoImagem}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              </View>
            </Pressable>
          </AncoraDoGuia>

          <AncoraDoGuia id="tab-biblia" style={styles.lado}>
            <Pressable
              onPress={() => irAba('Biblia')}
              style={styles.ladoHit}
              accessibilityRole="button"
              accessibilityState={{ selected: bibliaAtiva }}
              accessibilityLabel="Bíblia"
            >
              <BookOpen
                size={20}
                color={bibliaAtiva ? colors.earth : colors.mist}
                strokeWidth={bibliaAtiva ? 2.4 : 1.9}
              />
              <Text style={[styles.label, bibliaAtiva && styles.labelAtivo]}>Bíblia</Text>
            </Pressable>
          </AncoraDoGuia>
        </View>
      </View>

      <MaisSheet
        visible={maisAberto}
        onClose={() => setMaisAberto(false)}
        nome={nome}
        onConta={() => irStack('Settings')}
        onCampo={() => irAba('Campo')}
        onLoja={() => irAba('Loja')}
        onAssinar={() => irStack('Assinar')}
        onSair={() => { void signOut(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.warmWhite,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sand,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 58,
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 24,
  },
  lado: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  ladoHit: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 72,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
  },
  logoCirculo: {
    width: LOGO_TAMANHO,
    height: LOGO_TAMANHO,
    borderRadius: LOGO_TAMANHO / 2,
    overflow: 'hidden',
    backgroundColor: colors.earth,
    borderWidth: 1.5,
    borderColor: 'rgba(252, 250, 246, 0.55)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  logoImagem: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.mist,
  },
  labelAtivo: {
    color: colors.earth,
    fontFamily: fonts.sansSemi,
  },
});
