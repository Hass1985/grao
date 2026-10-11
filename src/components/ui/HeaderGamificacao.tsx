// Sequência (brotinho) e atalho para Minha jornada, no header das telas principais.

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarCheck, Sprout } from '../icons';
import { meusGraos } from '../../onboarding/graos';
import { resumoDeLeitura } from '../../onboarding/seedDelivery';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/radius';

type Props = {
  navigation: any;
  /** Sequência já carregada pela tela (evita fetch duplicado). */
  sequencia?: number;
  /** Mantido por compatibilidade; o chip de saldo separado foi retirado. */
  saldoGraos?: number | null;
};

export const estilosChipGamificacao = StyleSheet.create({
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    backgroundColor: 'rgba(252,250,246,0.14)',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  streakNum: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    lineHeight: 16,
    color: colors.warmWhite,
    includeFontPadding: false,
  },
});

export default function HeaderGamificacao({
  navigation,
  sequencia: sequenciaProp,
}: Props) {
  const [sequenciaLocal, setSequenciaLocal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (typeof sequenciaProp === 'number') return;
      let vivo = true;
      Promise.all([meusGraos(), resumoDeLeitura()])
        .then(([g, r]) => {
          if (!vivo) return;
          const s =
            g && g.sequencia > 0
              ? g.sequencia
              : r
                ? r.sequencia
                : 0;
          setSequenciaLocal(s);
        })
        .catch(() => {});
      return () => { vivo = false; };
    }, [sequenciaProp])
  );

  const sequencia = typeof sequenciaProp === 'number' ? sequenciaProp : sequenciaLocal;

  return (
    <View style={styles.headerActions}>
      <View
        style={estilosChipGamificacao.streakChip}
        accessibilityLabel={`${sequencia} ${sequencia === 1 ? 'dia seguido' : 'dias seguidos'}`}
      >
        {/* Mesmo brotinho da Loja ("Seus grãos"), no lugar do foguinho. */}
        <Sprout size={14} color={colors.warmWhite} strokeWidth={2.2} />
        <Text style={estilosChipGamificacao.streakNum}>{sequencia}</Text>
      </View>
      <Pressable
        onPress={() => navigation.navigate('Campo')}
        style={styles.headerIconBtn}
        accessibilityLabel="Minha jornada"
      >
        <CalendarCheck size={18} color={colors.warmWhite} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 36,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(252,250,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
