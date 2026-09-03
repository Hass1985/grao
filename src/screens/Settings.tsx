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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import GraoSymbol from '../components/GraoSymbol';
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
import { shadows } from '../theme/shadows';
import { webScreenFill, webScroll } from '../theme/webScreen';

type Props = { navigation: any };

// Precisa espelhar as janelas do onboarding (Notification.tsx) e do backend.
const timeWindows = [
  { id: 'dawn', label: 'Amanhecer', time: '6h às 10h' },
  { id: 'noon', label: 'Meio-dia', time: '10h às 14h' },
  { id: 'afternoon', label: 'Tarde', time: '14h às 18h' },
  { id: 'evening', label: 'Noite', time: '18h às 22h' },
];

// -------- blocos reutilizáveis --------
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
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
}

export default function Settings({ navigation }: Props) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('Você');
  const [memberSince, setMemberSince] = useState('');
  const [moment, setMomentState] = useState<EmotionalFamily | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [showNotifOptions, setShowNotifOptions] = useState(false);
  const [selectedTime, setSelectedTime] = useState('dawn');
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
        Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos para atualizar sua imagem.');
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      const uri = res.assets[0].uri;
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

  return (
    <SafeAreaView style={[styles.container, webScreenFill]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={webScroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cartão de perfil */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarInitials}>
                <Text style={styles.avatarInitialsText}>{initialsFrom(name)}</Text>
              </View>
            )}
            <View style={styles.avatarEdit}>
              <Text style={styles.avatarEditText}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileMeta}>Evangélico · membro desde {memberSince}</Text>
          <TouchableOpacity onPress={openEditName}>
            <Text style={styles.editNameLink}>Editar nome</Text>
          </TouchableOpacity>
        </View>

        {/* Meu momento */}
        <Section title="Meu momento">
          {showFeelings ? (
            <View style={styles.feelingsGrid}>
              {emotionalFamilies.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.feelingChip, moment === f.id && styles.feelingChipSelected]}
                  onPress={() => chooseMoment(f.id)}
                >
                  <FamilyIcon
                    family={f.id}
                    size={17}
                    color={moment === f.id ? colors.accent : colors.foregroundMuted}
                  />
                  <Text style={[styles.feelingLabel, moment === f.id && styles.feelingLabelSelected]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Row label={momentLabel} onPress={() => setShowFeelings(true)} last />
          )}
        </Section>

        {/* Meu plano */}
        <Section title="Meu plano">
          <Row label="Plantio" value="R$ 49/mês · renovação automática" onPress={() => {}} />
          <Row label="Gerenciar assinatura" onPress={() => {}} last />
        </Section>

        {/* Notificações */}
        <Section title="Notificações">
          <Row
            label="Receber a semente no WhatsApp"
            right={
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.white}
              />
            }
            last={!notifEnabled}
          />
          {notifEnabled &&
            (showNotifOptions ? (
              <View style={styles.optionsList}>
                {timeWindows.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.optionRow, selectedTime === w.id && styles.optionRowSelected]}
                    onPress={() => {
                      setSelectedTime(w.id);
                      setShowNotifOptions(false);
                    }}
                  >
                    <Text style={[styles.optionLabel, selectedTime === w.id && styles.optionLabelSelected]}>
                      {w.label}
                    </Text>
                    <Text style={[styles.optionTime, selectedTime === w.id && styles.optionTimeSelected]}>
                      {w.time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Row
                label="Horário"
                value={`${timeWindows.find((w) => w.id === selectedTime)?.label} · ${timeWindows.find((w) => w.id === selectedTime)?.time}`}
                onPress={() => setShowNotifOptions(true)}
                last
              />
            ))}
        </Section>

        {/* Conteúdo */}
        <Section title="Conteúdo">
          <Row
            label="Incluir música na semente"
            right={
              <Switch
                value={music}
                onValueChange={setMusic}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.white}
              />
            }
            last
          />
        </Section>

        {/* Privacidade */}
        <Section title="Privacidade">
          <Row
            label="Perfil privado"
            right={
              <Switch
                value={privateProfile}
                onValueChange={setPrivateProfile}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.white}
              />
            }
          />
          <Row label="Privacidade e dados" onPress={() => navigation.navigate('PrivacyPolicy')} />
          <Row label="Excluir minha conta" danger onPress={confirmDelete} last />
        </Section>

        {/* Sobre */}
        <Section title="Sobre">
          <Row label="Fale com a gente" value="ola@graoapp.com.br" onPress={() => {}} />
          <Row label="Avaliar o Grão" onPress={() => {}} />
          <Row
            label="Créditos"
            value="Texto bíblico: Bíblia Livre"
            onPress={() => navigation.navigate('Credits')}
          />
          <Row label="Versão" value="1.0.0 (protótipo)" last />
        </Section>

        <TouchableOpacity style={styles.signOutRow} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={styles.footerMark}>
          <GraoSymbol size={22} color={colors.foregroundSubtle} filled={false} />
          <Text style={styles.footerText}>Uma semente por dia</Text>
        </View>
      </ScrollView>

      {/* Modal de edição de nome */}
      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Como quer ser chamado?</Text>
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
              <TouchableOpacity onPress={() => setEditingName(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText: { fontSize: 30, color: colors.accent, lineHeight: 34, fontFamily: fonts.sans },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.foreground },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // perfil
  profileCard: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  avatarWrap: { width: 96, height: 96, marginBottom: 8 },
  avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: colors.border },
  avatarInitials: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAccent,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { fontFamily: fonts.serif, fontSize: 38, color: colors.accent },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarEditText: { color: colors.white, fontSize: 14 },
  profileName: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.foreground },
  profileMeta: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.foregroundMuted },
  editNameLink: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
    marginTop: 4,
  },

  // seções
  section: { marginBottom: 22 },
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    ...(shadows.sm as object),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.foreground },
  rowValue: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.foregroundMuted, marginTop: 3 },
  rowDanger: { color: '#C0392B' },
  chevron: { fontFamily: fonts.sans, fontSize: 22, color: colors.foregroundSubtle, marginLeft: 8 },

  // momento
  feelingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 14 },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  feelingChipSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceAccent },
  feelingEmoji: { fontSize: 16 },
  feelingLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foreground },
  feelingLabelSelected: { color: colors.accent },

  // notif options
  optionsList: { gap: 8, paddingBottom: 14 },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionRowSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceAccent },
  optionLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.foreground },
  optionLabelSelected: { color: colors.accent },
  optionTime: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.foregroundSubtle },
  optionTimeSelected: { color: colors.accent },

  // sair + rodapé
  signOutRow: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  signOutText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: '#C0392B' },
  footerMark: { alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 8 },
  footerText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(59, 34, 8, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 22,
    ...(shadows.md as object),
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.foreground, marginBottom: 14 },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 18 },
  modalCancel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.foregroundMuted },
  modalSave: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalSaveText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.white },
});
