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
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import GraoSymbol from '../components/GraoSymbol';
import BackButton from '../components/ui/BackButton';
import ScreenBackground from '../components/ui/ScreenBackground';
import Button from '../components/ui/Button';
import SeletorHorario, { periodoDoDia } from '../components/SeletorHorario';
import {
  getAvatarUri,
  setAvatarUri,
  getDisplayName,
  setDisplayName,
  getMemberSince,
  initialsFrom,
  setDevocionalOptIn,
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
  minhaAssinatura, minhasPreferencias, salvarHorario, excluirMinhaConta,
  emReais, porExtenso, type SituacaoAssinatura,
} from '../onboarding/assinatura';
import {
  ChevronRight,
  Camera,
  Sprout,
  CreditCard,
  MessageCircle,
  Clock,
  Music2,
  Shield,
  Trash2,
  Mail,
  BookOpen,
  Info,
  type LucideIcon,
} from '../components/icons';

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
  /** Situação real da assinatura e do horário. Nada aqui é escrito no código. */
  const [assinatura, setAssinatura] = useState<SituacaoAssinatura | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('Você');
  const [memberSince, setMemberSince] = useState('');
  const [showNotifOptions, setShowNotifOptions] = useState(false);
  const [selectedTime, setSelectedTime] = useState('07:00');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [music, setMusic] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        const [a, n, m, ass, pref] = await Promise.all([
          getAvatarUri(),
          getDisplayName(),
          getMemberSince(),
          minhaAssinatura(),
          minhasPreferencias(),
        ]);
        if (!vivo) return;
        setAvatar(a);
        setName(n);
        setMemberSince(m);
        setAssinatura(ass);
        if (pref?.horario) setSelectedTime(pref.horario);
      })();
      return () => { vivo = false; };
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

  const confirmDelete = () => {
    Alert.alert(
      'Excluir minha conta',
      'Isso apaga em definitivo seu perfil, suas conversas e seu histórico. Não dá pra desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          // O confirmar não apagava um byte: a tela prometia exclusão
          // definitiva e não fazia nada. Além de quebrar a confiança, é
          // promessa sobre dado pessoal que a LGPD leva a sério.
          onPress: async () => {
            await excluirMinhaConta();
            await signOut();
          },
        },
      ]
    );
  };

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
              Membro desde {memberSince}
            </Text>

            <Pressable
              onPress={openEditName}
              style={({ pressed }) => [styles.editPill, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.editPillText}>Editar nome</Text>
            </Pressable>
          </View>

          {/* A seção "Meu momento" saiu daqui.

              Era a mesma escolha manual de sentimento que já tinha saído da
              tela Hoje: uma grade de chips onde a pessoa dizia como estava.
              O momento agora vem do RELATO — a pessoa conta, o cérebro lê, e
              a semente sai dali. Manter o atalho no perfil deixava dois
              caminhos disputando a mesma informação, e o que fosse tocado por
              último ganhava. Um produto que promete entender o momento não
              pede para a pessoa preencher o momento num formulário. */}

          {/* O que aparece aqui vem do servidor, não do código.
              Antes dizia "Plantio · R$ 19,90/mês · renovação automática" para
              TODO MUNDO, inclusive para quem nunca pagou nada, e os dois toques
              não faziam nada. Anunciar uma cobrança que não existe derruba a
              confiança de uma vez — e num produto de fé a confiança é o
              produto. */}
          <Section title="Meu plano">
            {assinatura?.completo ? (
              <>
                <Row
                  icon={Sprout}
                  label={assinatura.nomeDoPlano ?? 'Plano ativo'}
                  value={[
                    assinatura.situacao === 'trial' ? 'Em teste'
                      : assinatura.situacao === 'cortesia' ? 'Cortesia'
                      : emReais(assinatura.valorCentavos),
                    assinatura.proximaCobranca
                      ? `próxima cobrança em ${porExtenso(assinatura.proximaCobranca)}`
                      : assinatura.terminaEm ? `até ${porExtenso(assinatura.terminaEm)}` : '',
                  ].filter(Boolean).join(' · ')}
                  last={assinatura.situacao !== 'cortesia'}
                />
                {/* Quem está de cortesia tem o produto inteiro e não paga nada
                    — e por isso era a única pessoa sem NENHUM caminho para a
                    tela de planos: o convite do Hoje só aparece para quem é
                    gratuito, e aqui embaixo também não havia porta.
                    Uma cortesia pode terminar, e quem quiser assinar de
                    verdade antes disso precisa conseguir chegar lá. */}
                {assinatura.situacao === 'cortesia' ? (
                  <Row
                    icon={CreditCard}
                    label="Conhecer o Plantio"
                    value="Ver o plano e assinar quando quiser"
                    onPress={() => navigation.navigate('Plantio')}
                    last
                  />
                ) : null}
              </>
            ) : (
              <>
                <Row
                  icon={Sprout}
                  label="Gratuito"
                  value="Devocional diário, todos os dias, para sempre"
                />
                <Row
                  icon={CreditCard}
                  label="Conhecer o Plantio"
                  value="Semente escolhida para o seu momento"
                  onPress={() => navigation.navigate('Plantio')}
                  last
                />
              </>
            )}
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
                    onPress={() => {
                      setShowNotifOptions(false);
                      // Antes o seletor não saía da tela: a pessoa escolhia
                      // outro horário, fechava, e a semente continuava
                      // chegando na hora antiga.
                      void salvarHorario(selectedTime);
                    }}
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

          {/* "Perfil privado" saiu: não existe nada social no Grão — sem
              feed, sem perfil público, sem comentário. A chave não tinha o que
              tornar privado, e oferecer controle sobre exposição que não existe
              sugere que existe. */}
          <Section title="Privacidade">
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
              onPress={() => Linking.openURL('mailto:ola@graoapp.com.br')}
            />
            {/* "Avaliar o Grão" saiu: não existe loja de aplicativos para
                onde mandar a pessoa, e o toque não fazia nada. Volta no dia
                em que o app estiver publicada numa. */}
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
              void (async () => {
                await setDevocionalOptIn(false);
                await setDisplayName('');
                await signOut();
              })();
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
