import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { avaliarSemente } from '../onboarding/seedDelivery';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';

/**
 * "Esta semente falou com você?"
 *
 * Duas escolhas e pronto. Nada de escala de 1 a 5, nada de caixa de texto: a
 * pergunta aparece depois de um momento de oração, e transformá-la em
 * formulário quebra o que veio antes.
 *
 * Some assim que é respondida, com um agradecimento curto. Insistir com quem
 * já respondeu é a forma mais rápida de a pessoa parar de responder.
 */
export default function AvaliarSemente({ seedId }: { seedId: string }) {
  const [resposta, setResposta] = useState<boolean | null>(null);

  const responder = (util: boolean) => {
    setResposta(util);
    void avaliarSemente(seedId, util);
  };

  if (resposta !== null) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.obrigado}>
          {resposta
            ? 'Que bom. Amanhã tem mais.'
            : 'Obrigado por dizer. Isso ajuda a escolher melhor.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.pergunta}>Esta semente falou com você?</Text>
      <View style={styles.botoes}>
        <Pressable
          onPress={() => responder(true)}
          style={styles.botao}
          accessibilityRole="button"
          hitSlop={6}
        >
          <Text style={styles.botaoTexto}>Falou</Text>
        </Pressable>
        <Pressable
          onPress={() => responder(false)}
          style={styles.botao}
          accessibilityRole="button"
          hitSlop={6}
        >
          <Text style={styles.botaoTexto}>Nem tanto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 24, gap: 12 },
  pergunta: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
  },
  obrigado: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundSubtle,
    paddingVertical: 10,
  },
  botoes: { flexDirection: 'row', gap: 10 },
  botao: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  botaoTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.palha,
  },
});
