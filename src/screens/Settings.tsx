import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import GraoSymbol from '../components/GraoSymbol';
import BackButton from '../components/ui/BackButton';
import ScreenBackground from '../components/ui/ScreenBackground';
import Button from '../components/ui/Button';
import SeletorHorario, { periodoDoDia } from '../components/SeletorHorario';
import FamilyIcon from '../components/FamilyIcon';
import { emotionalFamilies, EmotionalFamily } from '../data/seeds';
import { setMoment, getMoment } from '../onboarding/seedDelivery';
import {
  getAvatarUri,
  setAvatarUri,
  getDisplayName,
  setDisplayName,
  getMemberSince,
  initialsFrom,
} from '../onboarding/userProfile';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';
import { webScreenFill, webScroll } from '../theme/webScreen';
import { useAuth } from '../auth/AuthContext';
import {
  ChevronRight,
  Camera,
  Sprout,
  CreditCard,
  MessageCircle,
  Clock,
  Music2,
  Lock,
  Shield,
  Trash2,
  Mail,
  Star,
  BookOpen,
  Info,
  Heart,
  type LucideIcon,
} from 'lucide-react-native';

type Props = { navigation: any };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  right,
  danger,
  last,
  icon: Icon,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
  icon?: LucideIcon;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      {Icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Icon
            size={16}
            color={danger ? '#B33A2B' : colors.accent}
            strokeWidth={2}
          />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {right ??
        (onPress ? (
          <ChevronRight size={18} color={colors.foregroundSubtle} strokeWidth={2} />
        ) : null)}
    </View>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}

export default function Settings({ navigation }: Props) {
  const { signOut } = useAuth();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('Você');
  const [memberSince, setMemberSince] = useState('');
  const [moment, setMomentState] = useState<EmotionalFamily | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [showNotifOptions, setShowNotifOptions] = useState(false);
  const [selectedTime, setSelectedTime] = useState('07:00');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [music, setMusic] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [a, n, m, mom] = await Promise.all([
          getAvatarUri(),
          getDisplayName(),
          getMemberSince(),
          getMoment(),
        ]);
        setAvatar(a);
        setName(n);
        setMemberSince(m);
        setMomentState(mom as EmotionalFamily | null);
      })();
    }, [])
  );

  const pickPhoto = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso às fotos para atualizar sua imagem.'
        );
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const uri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      setAvatar(uri);
      await setAvatarUri(uri);
    }
  };

  const openEditName = () => {
    setNameDraft(name);
    setEditingName(true);
  };

  const saveName = async () => {
    const v = nameDraft.trim();
    if (v) {
      setName(v);
      await setDisplayName(v);
    }
    setEditingName(false);
  };

  const chooseMoment = async (family: EmotionalFamily) => {
    setMomentState(family);
    setShowFeelings(false);
    await setMoment(family);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Excluir minha conta',
      'Isso apaga em definitivo seu perfil, suas conversas e seu histórico. Não dá pra desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const momentLabel = moment
    ? emotionalFamilies.find((f) => f.id === moment)?.label ?? 'Deixe o Grão sentir por você'
    : 'Deixe o Grão sentir por você';

  const switchTrack = {
    false: colors.casca12,
    true: colors.accent,
  };

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={webScroll}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHero}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.88} style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarInitialsText}>{initialsFrom(name)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.avatarEdit}>
                <Camera size={13} color={colors.white} strokeWidth={2.4} />
              </View>
            </TouchableOpacity>

            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileMeta}>
              Evangélico · membro desde {memberSince}
            </Text>

            <Pressable
              onPress={openEditName}
              style={({ pressed }) => [styles.editPill, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.editPillText}>Editar nome</Text>
            </Pressable>
          </View>

          <Section title="Meu momento">
            {showFeelings ? (
              <View style={styles.feelingsGrid}>
                {emotionalFamilies.map((f) => {
                  const selected = moment === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      style={({ pressed }) => [
                        styles.feelingChip,
                        selected && styles.feelingChipSelected,
                        pressed && { opacity: 0.9 },
                      ]}
                      onPress={() => chooseMoment(f.id)}
                    >
                      <FamilyIcon
                        family={f.id}
                        size={17}
                        color={selected ? colors.accent : colors.foregroundMuted}
                      />
                      <Text
                        style={[
                          styles.feelingLabel,
                          selected && styles.feelingLabelSelected,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Row
                icon={Heart}
                label={momentLabel}
                onPress={() => setShowFeelings(true)}
                last
              />
            )}
          </Section>

          <Section title="Meu plano">
            <Row
              icon={Sprout}
              label="Plantio"
              value="R$ 19,90/mês · renovação automática"
              onPress={() => {}}
            />
            <Row
              icon={CreditCard}
              label="Gerenciar assinatura"
              onPress={() => {}}
              last
            />
          </Section>

          <Section title="Notificações">
            <Row
              icon={MessageCircle}
              label="Receber a semente no WhatsApp"
              right={
                <Switch
                  value={notifEnabled}
                  onValueChange={setNotifEnabled}
                  trackColor={switchTrack}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.casca12}
                />
              }
              last={!notifEnabled}
            />
            {notifEnabled &&
              (showNotifOptions ? (
                <View style={styles.optionsList}>
                  <SeletorHorario valor={selectedTime} onChange={setSelectedTime} />
                  <Button
                    title="Pronto"
                    size="sm"
                    onPress={() => setShowNotifOptions(false)}
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : (
                <Row
                  icon={Clock}
                  label="Horário"
                  value={`${selectedTime} · ${periodoDoDia(selectedTime)}`}
                  onPress={() => setShowNotifOptions(true)}
                  last
                />
              ))}
          </Section>

          <Section title="Conteúdo">
            <Row
              icon={Music2}
              label="Incluir música na semente"
              right={
                <Switch
                  value={music}
                  onValueChange={setMusic}
                  trackColor={switchTrack}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.casca12}
                />
              }
              last
            />
          </Section>

          <Section title="Privacidade">
            <Row
              icon={Lock}
              label="Perfil privado"
              right={
                <Switch
                  value={privateProfile}
                  onValueChange={setPrivateProfile}
                  trackColor={switchTrack}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.casca12}
                />
              }
            />
            <Row
              icon={Shield}
              label="Privacidade e dados"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <Row
              icon={Trash2}
              label="Excluir minha conta"
              danger
              onPress={confirmDelete}
              last
            />
          </Section>

          <Section title="Sobre">
            <Row
              icon={Mail}
              label="Fale com a gente"
              value="ola@graoapp.com.br"
              onPress={() => {}}
            />
            <Row icon={Star} label="Avaliar o Grão" onPress={() => {}} />
            <Row
              icon={BookOpen}
              label="Créditos"
              value="Texto bíblico: Bíblia Livre"
              onPress={() => navigation.navigate('Credits')}
            />
            <Row icon={Info} label="Versão" value="1.0.0 (protótipo)" last />
          </Section>

          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              void signOut();
            }}
          >
            <Text style={styles.signOutText}>Sair da conta</Text>
          </Pressable>

          <View style={styles.footerMark}>
            <GraoSymbol size={20} color={colors.casca40} filled={false} />
            <Text style={styles.footerText}>Uma semente por dia</Text>
          </View>
        </ScrollView>

        <Modal
          visible={editingName}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingName(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Como quer ser chamado?</Text>
              <Text style={styles.modalHint}>Esse nome aparece no seu perfil e nas sementes.</Text>
              <TextInput
                style={styles.modalInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Seu nome"
                placeholderTextColor={colors.foregroundSubtle}
                autoFocus
                onSubmitEditing={saveName}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </Pressable>
                <Button title="Salvar" size="sm" onPress={saveName} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 6,
    paddingBottom: 10,
    minHeight: 52,
  },
  headerSpacer: { width: 40, height: 40 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 26,
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingBottom: 48,
  },

  profileHero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
    gap: 6,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...(shadows.sm as object),
  },
  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitials: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontFamily: fonts.serifMedium,
    fontSize: 36,
    color: colors.accent,
    letterSpacing: -0.5,
  },
  avatarEdit: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    ...(shadows.sm as object),
  },
  profileName: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  profileMeta: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  editPill: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  editPillText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 0.1,
  },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontFamily: fonts.serifMedium,
    fontSize: 15,
    color: colors.foreground,
    letterSpacing: -0.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    ...glassCard,
    borderRadius: 28,
    paddingHorizontal: 6,
    overflow: 'hidden',
    ...(shadows.sm as object),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: 'rgba(179, 58, 43, 0.1)',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.foreground,
    letterSpacing: -0.1,
  },
  rowValue: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.foregroundMuted,
  },
  rowDanger: {
    color: '#B33A2B',
  },

  feelingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  feelingChipSelected: {
    backgroundColor: colors.surfaceAccent,
  },
  feelingLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.foreground,
  },
  feelingLabelSelected: {
    color: colors.accent,
  },

  optionsList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 4,
  },

  signOutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(179, 58, 43, 0.08)',
  },
  signOutText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: '#B33A2B',
  },
  footerMark: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
    paddingBottom: 12,
  },
  footerText: {
    fontFamily: fonts.serif,
    fontSize: 12,
    color: colors.foregroundSubtle,
    letterSpacing: 0.2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(59, 34, 8, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    ...glassCard,
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    ...(shadows.md as object),
  },
  modalTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: 28,
    color: colors.foreground,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  modalHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.foregroundMuted,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 18,
  },
  modalCancel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.foregroundMuted,
  },
});
