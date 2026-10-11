// Onde e a que horas a semente chega.
//
// Logo depois do pagamento: a pessoa acabou de decidir, e ainda não entrou no
// relato. É pulável: quem pular ajusta depois nos Ajustes.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Check } from '../components/icons';
import Button from '../components/ui/Button';
import BrandHeader from '../components/ui/BrandHeader';
import SeletorHorario, { periodoDoDia } from '../components/SeletorHorario';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { webScreenFill, webScroll } from '../theme/webScreen';
import { useAuth } from '../auth/AuthContext';
import { getUserId, setUserId, linkWhatsApp } from '../onboarding/aiClient';
import { porExtenso, minhasPreferencias } from '../onboarding/assinatura';

type Props = {
  navigation: any;
  route?: { params?: { trialAte?: string } };
};

const FUNDO_SHEET = '#F4F4F4';

/** "(11) 98765-4321" enquanto a pessoa digita. */
function mascararTelefone(bruto: string): string {
  const d = (bruto ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function EntregaWhatsApp({ navigation, route }: Props) {
  const { user } = useAuth();
  const trialAte = route?.params?.trialAte;

  const [telefone, setTelefone] = useState('');
  const [horario, setHorario] = useState('07:00');
  const [consentiu, setConsentiu] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const doLogin = (user as any)?.phone as string | undefined;
    if (!doLogin) return;
    const d = doLogin.replace(/\D/g, '');
    setTelefone(mascararTelefone(d.startsWith('55') ? d.slice(2) : d));
  }, [user]);

  useEffect(() => {
    let vivo = true;
    minhasPreferencias()
      .then((p) => { if (vivo && p?.horario) setHorario(p.horario); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const digitos = telefone.replace(/\D/g, '');
  const podeSeguir = digitos.length >= 10 && consentiu && !salvando;

  const seguir = () => navigation.replace('MomentoSemente', { real: true, trialAte });

  async function confirmar() {
    if (!podeSeguir) {
      if (digitos.length < 10) setErro('Confira o número: falta algum dígito.');
      else if (!consentiu) setErro('Marque a autorização para receber no WhatsApp.');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const id = await getUserId();
      const r = await linkWhatsApp(id, telefone, horario);
      if (r && r.userId !== id) await setUserId(r.userId);
      seguir();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={[styles.root, webScreenFill]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BrandHeader
        onClose={seguir}
        titulo="Sua semente também chega no WhatsApp, no horário que você escolher."
      />

      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={webScroll} contentContainerStyle={styles.scroll}>
          {trialAte ? (
            <View style={styles.faixaTrial}>
              <Text style={styles.faixaTrialTexto}>
                Seus 7 dias grátis começaram · primeira cobrança em {porExtenso(trialAte)}
              </Text>
            </View>
          ) : null}

          <Text style={styles.eyebrow}>Plantio</Text>
          <Text style={styles.titulo}>Onde a semente{'\n'}deve chegar?</Text>
          <Text style={styles.sub}>
            Todo dia, no horário que você escolher, a sua semente chega no WhatsApp,
            sem precisar lembrar de abrir o app.
          </Text>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Número do WhatsApp</Text>
            <TextInput
              value={telefone}
              onChangeText={(t) => { setTelefone(mascararTelefone(t)); setErro(null); }}
              placeholder="(00) 00000-0000"
              placeholderTextColor={colors.mist}
              keyboardType="phone-pad"
              style={styles.entrada}
              maxLength={16}
              accessibilityLabel="Número do WhatsApp"
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Horário da entrega</Text>
            <SeletorHorario valor={horario} onChange={setHorario} />
            <Text style={styles.ajuda}>
              Chega às {horario}, {periodoDoDia(horario)}. Dá para mudar quando quiser,
              em Ajustes.
            </Text>
          </View>

          <Pressable
            onPress={() => { setConsentiu((v) => !v); setErro(null); }}
            style={styles.consentimento}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consentiu }}
          >
            <View style={[styles.caixinha, consentiu && styles.caixinhaMarcada]}>
              {consentiu ? <Check size={13} color={colors.white} strokeWidth={3} /> : null}
            </View>
            <Text style={styles.consentimentoTexto}>
              Autorizo o Grão a me enviar a semente diária neste número, pelo WhatsApp.
              Posso parar quando quiser respondendo PARAR.
            </Text>
          </Pressable>

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <Button
            title={salvando ? 'Um instante…' : 'Confirmar e continuar'}
            onPress={confirmar}
            disabled={salvando}
            variant="dark"
            style={styles.botao}
          />

          <Pressable onPress={seguir} style={styles.link} hitSlop={8}>
            <Text style={styles.linkTexto}>Agora não, quero só no app</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241708' },
  sheet: {
    flex: 1,
    minHeight: 0,
    marginTop: -16,
    backgroundColor: FUNDO_SHEET,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 22,
    paddingBottom: 56,
    flexGrow: 1,
  },
  faixaTrial: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(101, 69, 47, 0.12)',
    marginBottom: 22,
  },
  faixaTrialTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.earth,
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.earth,
    marginBottom: 10,
  },
  titulo: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.earth,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.warmGray,
    maxWidth: 360,
  },
  campo: { marginTop: 28 },
  rotulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.earth,
    marginBottom: 12,
  },
  entrada: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.sand,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.earth,
  },
  ajuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.warmGray,
    marginTop: 12,
  },
  consentimento: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 28,
  },
  caixinha: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginTop: 1,
    borderWidth: 1.5,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixinhaMarcada: {
    backgroundColor: colors.earth,
    borderColor: colors.earth,
  },
  consentimentoTexto: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: colors.warmGray,
  },
  erro: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.perigo,
    marginTop: 18,
  },
  botao: { marginTop: 28 },
  link: { alignSelf: 'center', marginTop: 16, paddingVertical: 8 },
  linkTexto: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.warmGray,
  },
});
