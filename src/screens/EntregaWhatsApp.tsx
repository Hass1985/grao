// Onde e a que horas a semente chega.
//
// Metade do produto pago mora fora do app: a semente chega no WhatsApp, no
// horário que a pessoa escolheu. Só que não havia, em lugar nenhum do fluxo,
// onde dizer o número nem o horário — quem assinava passava a ter direito a uma
// entrega que nunca era configurada, e o benefício mais concreto da assinatura
// simplesmente não acontecia.
//
// O lugar é aqui, logo depois do pagamento: a pessoa acabou de decidir, está
// com o produto na cabeça, e ainda não entrou no relato — que é um momento
// íntimo e não deve ser interrompido por um formulário.
//
// É pulável de propósito. Nem todo mundo quer o WhatsApp, e quem já pagou não
// pode ficar preso numa tela de cadastro por causa disso. Quem pular ajusta
// depois nos Ajustes, e continua com o app inteiro.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Check, MessageCircle } from '../components/icons';
import Button from '../components/ui/Button';
import ScreenBackground from '../components/ui/ScreenBackground';
import SeletorHorario, { periodoDoDia } from '../components/SeletorHorario';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { webScreenFill, webScroll } from '../theme/webScreen';
import { useAuth } from '../auth/AuthContext';
import { getUserId, setUserId, linkWhatsApp } from '../onboarding/aiClient';
import { porExtenso } from '../onboarding/assinatura';

type Props = {
  navigation: any;
  route?: { params?: { trialAte?: string } };
};

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

  // Quem entrou por telefone já nos deu o número. Pedir de novo é fazer a
  // pessoa digitar o que o app já sabe — e é o público mais velho que mais
  // erra digitando.
  useEffect(() => {
    const doLogin = (user as any)?.phone as string | undefined;
    if (!doLogin) return;
    const d = doLogin.replace(/\D/g, '');
    // O JWT traz o número sem o "+", com DDI. Tiramos o 55 para caber na
    // máscara brasileira do campo.
    setTelefone(mascararTelefone(d.startsWith('55') ? d.slice(2) : d));
  }, [user]);

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
      // A fusão pode trocar o id: quem manda passa a ser o cadastro do
      // telefone, que é a chave que o WhatsApp usa. Sem guardar o novo id, o
      // app continuaria falando de um cadastro que deixou de existir.
      if (r && r.userId !== id) await setUserId(r.userId);
      seguir();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <KeyboardAvoidingView
          style={styles.flex}
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

            <View style={styles.selo}>
              <MessageCircle size={26} color={colors.ambarSoft} strokeWidth={1.9} />
            </View>

            <Text style={styles.eyebrow}>Plantio</Text>
            <Text style={styles.titulo}>Onde a semente{'\n'}deve chegar?</Text>
            <Text style={styles.sub}>
              Todo dia, no horário que você escolher, a sua semente chega no WhatsApp —
              sem precisar lembrar de abrir o app.
            </Text>

            <View style={styles.campo}>
              <Text style={styles.rotulo}>Número do WhatsApp</Text>
              <TextInput
                value={telefone}
                onChangeText={(t) => { setTelefone(mascararTelefone(t)); setErro(null); }}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.foregroundSubtle}
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
                {consentiu ? <Check size={13} color={colors.palha} strokeWidth={3} /> : null}
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
              uppercase
              style={styles.botao}
            />

            <Pressable onPress={seguir} style={styles.link} hitSlop={8}>
              <Text style={styles.linkTexto}>Agora não, quero só no app</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: 56, flexGrow: 1 },
  faixaTrial: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 120, 38, 0.22)',
    marginBottom: 22,
  },
  faixaTrialTexto: {
    fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 17,
    color: colors.palha, textAlign: 'center',
  },
  selo: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(192, 120, 38, 0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  eyebrow: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.4,
    textTransform: 'uppercase', color: colors.ambarSoft, marginBottom: 10,
  },
  titulo: {
    fontFamily: fonts.serifMedium, fontSize: 32, lineHeight: 38,
    color: colors.palha, letterSpacing: -0.7, marginBottom: 12,
  },
  sub: {
    fontFamily: fonts.sans, fontSize: 16, lineHeight: 24,
    color: colors.foregroundMuted, maxWidth: 360,
  },
  campo: { marginTop: 28 },
  rotulo: {
    fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.4,
    textTransform: 'uppercase', color: colors.palha, marginBottom: 12,
  },
  entrada: {
    borderBottomWidth: 1.5, borderBottomColor: colors.borderStrong,
    paddingVertical: 10, fontFamily: fonts.sans, fontSize: 17, color: colors.palha,
  },
  ajuda: {
    fontFamily: fonts.sans, fontSize: 13, lineHeight: 19,
    color: colors.foregroundMuted, marginTop: 12,
  },
  consentimento: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 28,
  },
  caixinha: {
    width: 22, height: 22, borderRadius: 6, marginTop: 1,
    borderWidth: 1.5, borderColor: 'rgba(251, 246, 236, 0.38)',
    alignItems: 'center', justifyContent: 'center',
  },
  caixinhaMarcada: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentimentoTexto: {
    flex: 1, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20,
    color: colors.foregroundMuted,
  },
  erro: {
    fontFamily: fonts.sans, fontSize: 13, lineHeight: 19,
    color: '#E8A598', marginTop: 18,
  },
  botao: { marginTop: 28 },
  link: { alignSelf: 'center', marginTop: 16, paddingVertical: 8 },
  linkTexto: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.foregroundMuted,
  },
});
