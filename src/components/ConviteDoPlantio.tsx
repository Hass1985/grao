import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

/**
 * O convite para o Plantio, para quem ainda é gratuito.
 *
 * Morava DENTRO do cartão do devocional, e por isso caía entre o texto do dia e
 * as ações da pessoa: para chegar em "Confirmar leitura" — o gesto que constrói
 * o Campo, a Raiz e os grãos dela — era preciso rolar por cima de uma oferta.
 *
 * Fora do cartão, a ordem vira a natural: ela lê, faz o que é dela, e só então
 * aparece o convite. Quem acabou de viver o devocional é quem está mais
 * disposto a ouvir sobre o que vem depois; quem ainda nem leu está sendo
 * interrompido.
 */
export default function ConviteDoPlantio({ onSaibaMais }: { onSaibaMais?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Faça parte da comunidade</Text>
      <View style={styles.caixa}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(251, 246, 236, 0.2)',
            'rgba(251, 246, 236, 0.12)',
            'rgba(251, 246, 236, 0.16)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.brilho}
        />
        <Text style={styles.chamada}>A semente personalizada traz:</Text>
        <View style={styles.lista}>
          {[
            'Oração guiada para o seu momento',
            'Prática concreta para viver a Palavra',
            'Louvor escolhido para o seu dia',
            'Tudo no WhatsApp, todo dia, no horário certo',
          ].map((item) => (
            <View key={item} style={styles.linha}>
              <Text style={styles.marcador}>·</Text>
              <Text style={styles.item}>{item}</Text>
            </View>
          ))}
        </View>
        {onSaibaMais ? (
          <TouchableOpacity
            onPress={onSaibaMais}
            style={styles.saibaMais}
            accessibilityRole="button"
            accessibilityLabel="Saiba mais sobre o Plantio"
            hitSlop={8}
          >
            <Text style={styles.saibaMaisTexto}>Clique e saiba mais</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 30 },
  titulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginBottom: 12,
  },
  caixa: {
    overflow: 'hidden',
    backgroundColor: 'rgba(72, 48, 24, 0.28)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 10,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 10px 28px rgba(36, 23, 8, 0.16)',
        } as object)
      : {
          shadowColor: '#241708',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 18,
          elevation: 4,
        }),
  },
  brilho: { ...StyleSheet.absoluteFillObject },
  chamada: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.palha,
  },
  lista: { gap: 8 },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  marcador: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.ambarSoft,
    lineHeight: 22,
  },
  item: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    color: colors.foregroundMuted,
  },
  saibaMais: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(192, 120, 38, 0.28)',
  },
  saibaMaisTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    color: colors.palha,
  },
});
