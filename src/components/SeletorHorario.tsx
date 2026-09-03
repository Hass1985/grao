import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

/**
 * Escolha do horário em que a semente chega.
 *
 * Substituiu as quatro janelas de 4 horas. A janela cobria o dia, mas não a
 * rotina: quem escolhia "Tarde" recebia às 15h mesmo que a vida dela só
 * abrisse às 16h30. E aqui o horário pesa mais que num app comum — a semente
 * chega com o botão "Plantar", e só toca nele quem está disponível na hora.
 * Errar o horário não atrasa a leitura: cancela o gesto.
 *
 * Feito à mão em vez de usar o seletor nativo por dois motivos: o app roda
 * como webapp no teste, onde o DateTimePicker do sistema não existe; e o
 * seletor nativo abre um modal que esconde a tela inteira, o que é muito peso
 * para uma escolha que precisa parecer leve no meio do onboarding.
 *
 * Minutos de 15 em 15 é decisão de produto, não limitação: ninguém tem uma
 * rotina que só funciona às 7h07, e a lista fechada torna a escolha um toque
 * em vez de uma digitação.
 */

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = [0, 15, 30, 45];

/** Largura de cada hora + espaçamento — usada para centralizar a escolhida. */
const LARGURA_HORA = 56;

export function partesDoHorario(valor: string): { hora: number; minuto: number } {
  const [h, m] = (valor || '07:00').split(':');
  return { hora: Number(h) || 0, minuto: Number(m) || 0 };
}

function formatar(hora: number, minuto: number): string {
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

/** "07:00" → "de manhã cedo". Dá sentido ao número sem precisar de explicação. */
export function periodoDoDia(valor: string): string {
  const { hora } = partesDoHorario(valor);
  if (hora < 5) return 'de madrugada';
  if (hora < 12) return 'de manhã';
  if (hora < 18) return 'à tarde';
  return 'à noite';
}

type Props = {
  valor: string;                       // "HH:MM"
  onChange: (horario: string) => void;
};

export default function SeletorHorario({ valor, onChange }: Props) {
  const { hora, minuto } = partesDoHorario(valor);
  const rolagem = useRef<ScrollView>(null);

  // Centraliza a hora escolhida ao abrir. Sem isto, quem já tinha escolhido
  // 21h abre a tela vendo 00h e acha que perdeu a escolha.
  useEffect(() => {
    const t = setTimeout(() => {
      rolagem.current?.scrollTo({ x: Math.max(0, (hora - 2) * LARGURA_HORA), animated: false });
    }, 0);
    return () => clearTimeout(t);
    // Só na montagem: rolar a cada toque brigaria com o dedo da pessoa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      <View style={styles.mostrador}>
        <Text style={styles.horario}>{formatar(hora, minuto)}</Text>
        <Text style={styles.periodo}>{periodoDoDia(valor)}</Text>
      </View>

      <Text style={styles.rotulo}>HORA</Text>
      <ScrollView
        ref={rolagem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.faixa}
      >
        {HORAS.map((h) => {
          const ativo = h === hora;
          return (
            <TouchableOpacity
              key={h}
              style={[styles.hora, ativo && styles.horaAtiva]}
              onPress={() => onChange(formatar(h, minuto))}
              activeOpacity={0.8}
            >
              <Text style={[styles.horaTexto, ativo && styles.horaTextoAtivo]}>
                {String(h).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.rotulo}>MINUTOS</Text>
      <View style={styles.minutos}>
        {MINUTOS.map((m) => {
          const ativo = m === minuto;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.minuto, ativo && styles.minutoAtivo]}
              onPress={() => onChange(formatar(hora, m))}
              activeOpacity={0.8}
            >
              <Text style={[styles.minutoTexto, ativo && styles.minutoTextoAtivo]}>
                :{String(m).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mostrador: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 10,
    backgroundColor: colors.surfaceAccent,
    borderRadius: 12,
  },
  horario: {
    fontFamily: fonts.serif,
    fontSize: 46,
    color: colors.accent,
    lineHeight: 54,
    letterSpacing: -1,
  },
  periodo: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  rotulo: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.foregroundSubtle,
    marginTop: 14,
    marginBottom: 8,
  },
  faixa: { gap: 8, paddingRight: 8 },
  hora: {
    width: 48,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horaAtiva: { backgroundColor: colors.accent, borderColor: colors.accent },
  horaTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  horaTextoAtivo: { color: colors.accentForeground },
  minutos: { flexDirection: 'row', gap: 8 },
  minuto: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minutoAtivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  minutoTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  minutoTextoAtivo: { color: colors.accentForeground },
});
