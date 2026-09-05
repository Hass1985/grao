import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';
import Svg, { Path } from 'react-native-svg';
import { Eye, EyeOff } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import CircleBack from '../../components/ui/CircleBack';
import ScreenBackground from '../../components/ui/ScreenBackground';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';
import { webScreenFill } from '../../theme/webScreen';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { setUserId } from '../../onboarding/aiClient';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: any;
  onFinish: () => void;
};

type Mode = 'criar' | 'entrar';

/**
 * O Supabase responde em inglês. Sem traduzir, a pessoa que erra a senha lê
 * "Invalid login credentials" na tela de um produto que fala português com
 * ela do começo ao fim.
 *
 * Só as mensagens que o usuário realmente encontra. O resto cai no texto
 * genérico, que é melhor que uma tradução torta de um erro raro.
 */
function emPortugues(msg: string | undefined): string {
  const m = (msg ?? '').toLowerCase();
  // Telefone primeiro: estas mensagens também contêm palavras genéricas.
  if (m.includes('phone provider') || m.includes('phone signups') || m.includes('sms'))
    return 'A entrada por telefone ainda não está ligada no servidor. Use e-mail ou o Google.';
  if (m.includes('invalid phone')) return 'Esse número não parece certo. Confira o DDD.';
  if (m.includes('token has expired') || m.includes('invalid otp') || m.includes('otp_expired'))
    return 'Código vencido ou errado. Peça um novo.';
  if (m.includes('invalid login credentials')) return 'E-mail, telefone ou senha não conferem.';
  if (m.includes('email not confirmed'))
    return 'Falta confirmar o e-mail. Procure a mensagem que enviamos (veja também o spam).';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Esse e-mail já tem conta. Toque em "Eu já tenho uma conta".';
  if (m.includes('password should be')) return 'A senha precisa de pelo menos 8 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid format'))
    return 'Esse e-mail não parece válido.';
  if (m.includes('for security purposes')) return 'Espere alguns segundos e tente de novo.';
  if (m.includes('rate limit')) return 'Muitas tentativas seguidas. Tente daqui a alguns minutos.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão agora. Confira a internet e tente de novo.';
  return 'Não foi possível entrar. Tente de novo.';
}

/**
 * Telefone em E.164, na MESMA regra do servidor (whatsapp.ts, normalizePhone):
 * até 11 dígitos é número brasileiro sem DDI.
 *
 * Tem que ser a mesma string dos dois lados. Se o app gravasse "11987654321" e
 * o servidor "+5511987654321", a conta criada por telefone não encontraria o
 * cadastro do WhatsApp e a mesma pessoa viraria duas no banco: uma recebendo a
 * semente, outra vendo o app vazio.
 */
function normalizarTelefone(bruto: string): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 15) return null;
  return `+${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

/** +5511987654321 → +55 (11) 98765-4321, para a pessoa conferir o DDD. */
function exibirTelefone(e164: string): string {
  const d = e164.replace(/\D/g, '');
  if (d.length !== 12 && d.length !== 13) return e164;
  const ddd = d.slice(2, 4);
  const resto = d.slice(4);
  const corte = resto.length === 9 ? 5 : 4;
  return `+55 (${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

export default function Auth({ navigation, onFinish }: Props) {
  const { configured, enterDemo, acceptSession } = useAuth();
  const [mode, setMode] = useState<Mode>('criar');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Telefone que está esperando confirmação por código, quando o Supabase
  // estiver configurado para exigir.
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');

  // Um campo só para os dois. Boa parte do público mais velho não tem e-mail,
  // e obrigar a criar um seria barrar justamente quem o Grão quer alcançar.
  const ehEmail = identificador.includes('@');
  const telefone = ehEmail ? null : normalizarTelefone(identificador);
  const identificadorOk = ehEmail ? identificador.trim().length >= 5 : !!telefone;
  const passOk = password.length >= 8;
  const podeEnviar =
    mode === 'entrar'
      ? identificadorOk && password.length >= 6 && !busy
      : identificadorOk && passOk && accepted && !busy;

  const finishWithUser = async (session?: Session | null, userId?: string) => {
    if (session) await acceptSession(session);
    else if (userId) await setUserId(userId);
    onFinish();
  };

  const redirectTo = makeRedirectUri({
    scheme: 'grao',
    path: 'auth/callback',
  });

  const oauth = async (provider: 'google') => {
    if (!supabase) {
      setError('Supabase ainda não está configurado neste build.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:
            Platform.OS === 'web' && typeof window !== 'undefined'
              ? window.location.origin
              : redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      if (err) throw err;

      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.replace(/^#/, '') || url.search);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { data: sess, error: sessErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessErr) throw sessErr;
            await finishWithUser(sess.session, sess.session?.user?.id);
            return;
          }
        }
        setBusy(false);
        return;
      }

      if (Platform.OS === 'web') {
        setInfo('Continue no provedor. Ao voltar, o Grão abre sozinho.');
      }
    } catch (e: any) {
      setError(emPortugues(e?.message));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Entrar ou criar conta, por e-mail ou por telefone.
   *
   * As duas chamadas do Supabase aceitam `email` OU `phone`; o resto do fluxo é
   * idêntico. A única diferença de verdade é o que acontece quando não vem
   * sessão: no e-mail, a confirmação chega por mensagem; no telefone, por um
   * código digitado aqui mesmo.
   */
  const entrar = async () => {
    if (!podeEnviar) return;
    if (!supabase) {
      setError('Supabase ainda não está configurado neste build.');
      return;
    }
    const credencial = telefone
      ? { phone: telefone }
      : { email: identificador.trim().toLowerCase() };
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'criar') {
        const { data, error: err } = await supabase.auth.signUp({ ...credencial, password });
        if (err) throw err;
        if (!data.session) {
          if (telefone) {
            setConfirmando(telefone);
            setInfo(`Enviamos um código para ${exibirTelefone(telefone)}.`);
          } else {
            setInfo('Enviamos um e-mail de confirmação. Depois dele, entre por aqui.');
            setMode('entrar');
          }
          return;
        }
        await finishWithUser(data.session, data.user?.id);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          ...credencial,
          password,
        });
        if (err) throw err;
        await finishWithUser(data.session, data.user?.id);
      }
    } catch (e: any) {
      setError(emPortugues(e?.message));
    } finally {
      setBusy(false);
    }
  };

  /** Confirma o telefone com o código de 6 dígitos. */
  const confirmarCodigo = async () => {
    if (!supabase || !confirmando || codigo.replace(/\D/g, '').length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        phone: confirmando,
        token: codigo.replace(/\D/g, ''),
        type: 'sms',
      });
      if (err) throw err;
      await finishWithUser(data.session, data.user?.id);
    } catch (e: any) {
      setError(emPortugues(e?.message));
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setBusy(true);
    try {
      await enterDemo();
      onFinish();
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'criar' ? 'entrar' : 'criar');
    setError(null);
    setInfo(null);
    // Sai da espera do código: sem isto o botão continuaria pedindo confirmação
    // de um cadastro que a pessoa acabou de abandonar.
    setConfirmando(null);
    setCodigo('');
  };

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <CircleBack onPress={() => navigation.goBack()} style={styles.back} />

          <Text style={styles.title}>
            {mode === 'criar' ? 'Junte-se a nós' : 'Bem-vindo de volta'}
          </Text>
          <Text style={styles.sub}>
            {mode === 'criar'
              ? 'Aproxime-se de Deus com o seu devocional diário.'
              : 'Entre para receber o que Deus tem para você hoje.'}
          </Text>

          <Text style={styles.fieldLabel}>E-mail ou telefone</Text>
          <TextInput
            style={styles.underline}
            placeholder=""
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            value={identificador}
            onChangeText={setIdentificador}
            editable={!busy && !confirmando}
          />
          {/* Devolve o número já entendido. Quem digita sem DDD, ou com o 0 da
              operadora na frente, vê na hora que o Grão leu outra coisa. */}
          {telefone ? (
            <Text style={styles.hint}>Vamos usar o número {exibirTelefone(telefone)}.</Text>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Senha</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.underline, styles.passInput]}
              placeholder=""
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={10} style={styles.eye}>
              {showPass ? (
                <EyeOff size={20} color={colors.foregroundMuted} strokeWidth={1.8} />
              ) : (
                <Eye size={20} color={colors.foregroundMuted} strokeWidth={1.8} />
              )}
            </Pressable>
          </View>

          {mode === 'criar' ? (
            <View style={styles.terms}>
              <Switch
                value={accepted}
                onValueChange={setAccepted}
                trackColor={{ false: colors.casca20, true: colors.accentSoft }}
                thumbColor={accepted ? colors.accent : colors.surface}
              />
              <Text style={styles.termsText}>
                Confirmo que tenho 16 anos ou mais e concordo com os Termos e a Política de Privacidade.
              </Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {confirmando ? (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Código recebido</Text>
              <TextInput
                style={styles.underline}
                placeholder=""
                keyboardType="number-pad"
                maxLength={6}
                value={codigo}
                onChangeText={setCodigo}
                editable={!busy}
              />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Button
            title={
              confirmando
                ? 'Confirmar código'
                : mode === 'criar'
                  ? 'Criar minha conta'
                  : 'Entrar'
            }
            onPress={confirmando ? confirmarCodigo : entrar}
            disabled={confirmando ? codigo.replace(/\D/g, '').length < 6 || busy : !podeEnviar}
            variant="dark"
            uppercase
            style={styles.primaryCta}
          />

          <View style={styles.rule} />

          <View style={styles.social}>
            <Pressable
              style={[styles.socialBtn, busy && styles.disabled]}
              onPress={() => oauth('google')}
              disabled={busy}
            >
              <GoogleIcon />
              <Text style={styles.socialLabel}>Continuar com o Google</Text>
            </Pressable>
          </View>

          <Pressable onPress={switchMode} style={styles.footerLink} disabled={busy}>
            <Text style={styles.footerLinkText}>
              {mode === 'criar' ? 'Eu já tenho uma conta' : 'Criar uma conta'}
            </Text>
          </Pressable>

          {/* "Continuar sem conta" saiu: entrar agora é obrigatório, inclusive
              para quem só vai testar — sem conta não existe fusão de cadastro,
              nem assinatura, e o histórico morre junto com o cache do navegador.
              Fica de pé apenas onde o Supabase não está configurado, senão um
              build de desenvolvimento ficaria sem nenhuma porta de entrada. */}
          {!configured ? (
            <>
              <Pressable onPress={demo} style={styles.demo} disabled={busy}>
                <Text style={styles.demoText}>Continuar sem conta</Text>
              </Pressable>
              <Text style={styles.demoHint}>Supabase ainda não configurado neste build.</Text>
            </>
          ) : busy ? (
            <ActivityIndicator color={colors.accent} style={styles.demo} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingBottom: 48,
    flexGrow: 1,
  },
  back: { marginTop: 8, marginBottom: 28 },
  title: {
    fontFamily: fonts.sansSemi,
    fontSize: 34,
    lineHeight: 40,
    color: colors.palha,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foregroundMuted,
    marginBottom: 36,
    maxWidth: 340,
  },
  fieldLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.palha,
    marginBottom: 10,
  },
  underline: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderStrong,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.palha,
  },
  passRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passInput: {
    paddingRight: 40,
  },
  eye: {
    position: 'absolute',
    right: 0,
    bottom: 10,
  },
  terms: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 28,
    marginBottom: 8,
  },
  termsText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.foregroundMuted,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: '#E8A598',
    marginTop: 12,
  },
  info: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.foregroundMuted,
    marginTop: 12,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.foregroundSubtle,
    marginTop: 8,
  },
  primaryCta: {
    marginTop: 28,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 28,
  },
  social: { gap: 12 },
  socialBtn: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(247, 240, 226, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  socialLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.palha,
  },
  disabled: { opacity: 0.5 },
  footerLink: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 8,
  },
  footerLinkText: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.palha,
  },
  demo: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 10,
  },
  demoText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  demoHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    marginTop: 4,
  },
});
