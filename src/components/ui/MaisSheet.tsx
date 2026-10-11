import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  LogOut,
  Sprout,
  Store,
  X,
  type LucideIcon,
} from '../icons';
import GraoSymbol from '../GraoSymbol';
import ProfileButton from '../ProfileButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

type Item = {
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  perigo?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  nome?: string;
  onConta: () => void;
  onCampo: () => void;
  onLoja: () => void;
  onAssinar: () => void;
  onSair?: () => void;
};

/**
 * Menu "Mais" no modelo BiblicAI: sheet claro sobre o app, com atalhos
 * para o que saiu da barra inferior (Campo, Loja, Conta).
 */
export default function MaisSheet({
  visible,
  onClose,
  nome = 'Você',
  onConta,
  onCampo,
  onLoja,
  onAssinar,
  onSair,
}: Props) {
  const insets = useSafeAreaInsets();

  const ir = (fn: () => void) => {
    onClose();
    // Deixa o modal fechar antes de navegar (evita glitch no web).
    setTimeout(fn, 80);
  };

  const topo: Item[] = [
    { label: 'Minha jornada', Icon: CalendarDays, onPress: () => ir(onCampo) },
    { label: 'Loja', Icon: Store, onPress: () => ir(onLoja) },
  ];

  const baixo: Item[] = [
    { label: 'Conta', Icon: Sprout, onPress: () => ir(onConta) },
    { label: 'Assinatura', Icon: CreditCard, onPress: () => ir(onAssinar) },
  ];

  if (onSair) {
    baixo.push({
      label: 'Sair da conta',
      Icon: LogOut,
      onPress: () => ir(onSair),
      perigo: true,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Fechar menu" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
              <X size={18} color={colors.mist} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.perfil}>
            <ProfileButton onPress={() => ir(onConta)} size={52} />
            <View style={styles.perfilTexto}>
              <Text style={styles.nome} numberOfLines={1}>{nome}</Text>
              <Text style={styles.marca}>Grão</Text>
            </View>
            <GraoSymbol size={28} color={colors.earth} filled={false} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.lista}>
            {topo.map((item) => (
              <Linha key={item.label} item={item} />
            ))}

            <Pressable onPress={() => ir(onAssinar)} style={styles.promo}>
              <View style={styles.promoVeil} />
              <Text style={styles.promoBadge}>Plantio</Text>
              <Text style={styles.promoTitulo}>Uma Palavra escolhida para o seu momento</Text>
              <Text style={styles.promoMeta}>7 dias grátis · cancele quando quiser</Text>
            </Pressable>

            {baixo.map((item) => (
              <Linha key={item.label} item={item} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Linha({ item }: { item: Item }) {
  const Icon = item.Icon;
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <Icon size={20} color={colors.earth} strokeWidth={1.9} />
      <Text style={[styles.linhaTexto, item.perigo && styles.linhaPerigo]}>{item.label}</Text>
      {!item.perigo ? (
        <ChevronRight size={18} color={colors.mist} strokeWidth={2} />
      ) : (
        <View style={{ width: 18 }} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(41, 38, 33, 0.45)',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.warmWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    ...(shadows.float as object),
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 28,
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.oat,
  },
  close: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.sand,
  },
  perfilTexto: { flex: 1, gap: 2 },
  nome: {
    fontFamily: fonts.sansSemi,
    fontSize: 18,
    color: colors.earth,
  },
  marca: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.earth,
  },
  lista: {
    paddingBottom: 12,
    gap: 4,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.sand,
  },
  linhaTexto: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.earth,
  },
  linhaPerigo: {
    color: colors.earth,
    fontFamily: fonts.sansSemi,
  },
  promo: {
    marginVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: '#2A2A2A',
    padding: 18,
    minHeight: 120,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  promoVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    color: colors.earth,
    backgroundColor: colors.warmWhite,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: 10,
  },
  promoTitulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 20,
    lineHeight: 26,
    color: colors.white,
    marginBottom: 6,
  },
  promoMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: 'rgba(252, 250, 246, 0.85)',
  },
});
