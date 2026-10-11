import React, { useEffect, useState } from 'react';
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
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';
import Svg, { Path } from 'react-native-svg';
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from '../../components/icons';
import GraoSymbol from '../../components/GraoSymbol';
import { appleNativoDisponivel, entrarComApple } from '../../onboarding/apple';
import { provedoresLigados } from '../../onboarding/provedores';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { space } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { webScreenFill } from '../../theme/webScreen';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { setUserId } from '../../onboarding/aiClient';
import { marcarPosOAuth } from '../../onboarding/authFlow';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: any;
};

type Mode = 'criar' | 'entrar';
type Painel = 'porta' | 'email';

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
  if (m.includes('phone provider') || m.includes('phone signups') || m.includes('sms'))
    return 'A entrada por telefone ainda não está ligada no servidor. Use e-mail, Google ou Apple.';
  if (m.includes('invalid phone')) return 'Esse número não parece certo. Confira o DDD.';
  if (m.includes('token has expired') || m.includes('invalid otp') || m.includes('otp_expired'))
    return 'Código vencido ou errado. Peça um novo.';
  if (m.includes('invalid login credentials')) return 'E-mail, telefone ou senha não conferem.';
  if (m.includes('email not confirmed'))
    return 'Falta confirmar o e-mail. Procure a mensagem que enviamos (veja também o spam).';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Esse e-mail já tem conta. Toque em "Entrar" abaixo.';
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
 */
function normalizarTelefone(bruto: string): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '').replace(/^0+/, '');
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

const AppleIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.6-.75 3-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.44-3.69zM14.79 5.4c.64-.78 1.07-1.85.95-2.93-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.84 1.03.08 2.07-.52 2.71-1.29z"
      fill={color}
    />
  </Svg>
);

/** Preview local: o Site URL do Supabase aponta para o Netlify. */
function ehPreviewLocal(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return true;
  // Rede local (Expo web em outro aparelho / IP da máquina).
  if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return true;
  return false;
}

/** Extrai tokens do retorno do OAuth (hash ou query). */
function tokensDoRetorno(urlStr: string): { access_token: string; refresh_token: string } | null {
  try {
    const url = new URL(urlStr);
    const params = new URLSearchParams(url.hash.replace(/^#/, '') || url.search);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) return { access_token, refresh_token };
  } catch {
    /* ignore */
  }
  return null;
}

export default function Auth({ navigation }: Props) {
  const { configured, enterDemo, acceptSession, isAuthenticated } = useAuth();
  const [painel, setPainel] = useState<Painel>('porta');
  const [mode, setMode] = useState<Mode>('entrar');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const previewLocal = ehPreviewLocal();

  // Sessão pronta: apresentação, depois o app.
  React.useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Intro');
    }
  }, [isAuthenticated, navigation]);

  const ehEmail = identificador.includes('@');
  const telefone = ehEmail ? null : normalizarTelefone(identificador);
  const identificadorOk = ehEmail ? identificador.trim().length >= 5 : !!telefone;
  const passOk = password.length >= 8;
  const podeEnviar =
    mode === 'entrar'
      ? identificadorOk && password.length >= 6 && !busy
      : identificadorOk && passOk && !busy;

  const finishWithUser = async (session?: Session | null, userId?: string) => {
    if (session) await acceptSession(session);
    else if (userId) await setUserId(userId);
    navigation.replace('Intro');
  };

  const [appleNativo, setAppleNativo] = useState(false);
  const [appleLigada, setAppleLigada] = useState(false);
  useEffect(() => {
    let vivo = true;
    appleNativoDisponivel().then((d) => { if (vivo) setAppleNativo(d); });
    provedoresLigados().then((p) => { if (vivo) setAppleLigada(p.apple); });
    return () => { vivo = false; };
  }, []);

  const entrarApple = async () => {
    if (!appleNativo) return oauth('apple');

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await entrarComApple();
      if (r.ok) {
        await finishWithUser(r.sessao as Session | null, r.userId ?? undefined);
        return;
      }
      if (!r.cancelado) setError(r.erro ?? 'Não deu para entrar com a Apple.');
    } finally {
      setBusy(false);
    }
  };

  const redirectNativo = makeRedirectUri({
    scheme: 'grao',
    path: 'auth/callback',
  });

  /** Sempre a origem atual no web, para não cair no Site URL (Netlify). */
  const redirectWeb =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : null;

  const destinoOAuth = redirectWeb || redirectNativo;

  const oauth = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      setError('Supabase ainda não está configurado neste build.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await marcarPosOAuth();
      // skipBrowserRedirect: no web também. Sem isso o Supabase manda para o
      // Site URL (Netlify) quando o redirect local não está na allowlist, e a
      // pessoa some do preview. Com a sessão aberta aqui, o retorno precisa
      // bater com a origem atual (cadastre-a em Redirect URLs no Supabase).
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: destinoOAuth,
          skipBrowserRedirect: true,
        },
      });
      if (err) throw err;

      if (!data.url) {
        setError('Não foi possível abrir o provedor. Tente de novo.');
        setBusy(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, destinoOAuth);
      if (result.type === 'success' && result.url) {
        const tokens = tokensDoRetorno(result.url);
        if (tokens) {
          const { data: sess, error: sessErr } = await supabase.auth.setSession(tokens);
          if (sessErr) throw sessErr;
          await finishWithUser(sess.session, sess.session?.user?.id);
          return;
        }
      }

      if (result.type === 'dismiss' || result.type === 'cancel') {
        setBusy(false);
        return;
      }

      // Preview local sem localhost nas Redirect URLs: o Google devolve no
      // Netlify e a sessão não volta para cá.
      if (previewLocal) {
        setError(
          'O Google ainda devolve para o site publicado. No Supabase, em Authentication → URL Configuration → Redirect URLs, acrescente ' +
            (redirectWeb || 'esta origem') +
            ' — ou use "Ver apresentação neste computador" abaixo.',
        );
      } else {
        setError('Não deu para concluir o login. Tente de novo.');
      }
      setBusy(false);
    } catch (e: any) {
      setError(emPortugues(e?.message));
      setBusy(false);
    }
  };

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
            setInfo(
              previewLocal
                ? 'Enviamos um e-mail de confirmação. Enquanto isso, volte e use "Ver apresentação neste computador" para ver as telas novas.'
                : 'Enviamos um e-mail de confirmação. Depois dele, entre por aqui.',
            );
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

  const esqueciSenha = async () => {
    if (!supabase) {
      setError('Supabase ainda não está configurado neste build.');
      return;
    }
    const email = identificador.trim().toLowerCase();
    if (!email.includes('@')) {
      setError('Digite o e-mail da conta para reenviar o acesso.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: destinoOAuth,
      });
      if (err) throw err;
      setInfo('Enviamos um link para redefinir a senha. Confira o e-mail (e o spam).');
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
      navigation.replace('Intro');
    } finally {
      setBusy(false);
    }
  };

  const abrirEmail = (proximo: Mode) => {
    setMode(proximo);
    setPainel('email');
    setError(null);
    setInfo(null);
    setConfirmando(null);
    setCodigo('');
  };

  const voltarPorta = () => {
    setPainel('porta');
    setError(null);
    setInfo(null);
    setConfirmando(null);
    setCodigo('');
  };

  const switchMode = () => {
    setMode(mode === 'criar' ? 'entrar' : 'criar');
    setError(null);
    setInfo(null);
    setConfirmando(null);
    setCodigo('');
  };

  // -------------------------------------------------------------------------
  // Porta: logo + Google + Apple + e-mail (fundo de campo).
  // -------------------------------------------------------------------------
  if (painel === 'porta') {
    return (
      <View style={[styles.rootCampo, webScreenFill]}>
        <ImageBackground
          source={require('../../../assets/campo-trigo.jpg')}
          style={styles.bg}
          imageStyle={styles.bgImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(36,23,8,0.55)', 'rgba(28,18,6,0.78)', 'rgba(36,23,8,0.94)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={styles.porta}>
            <View style={styles.portaTopo} />

            <View style={styles.marca}>
              <GraoSymbol size={64} color={colors.caramel} filled={false} />
              <Text style={styles.marcaNome}>Grão</Text>
            </View>

            <View style={styles.portaAcoes}>
              {error ? <Text style={styles.erroClaro}>{error}</Text> : null}
              {info ? <Text style={styles.infoClaro}>{info}</Text> : null}

              <Pressable
                style={[styles.btnGoogle, busy && styles.disabled]}
                onPress={() => oauth('google')}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Continuar com Google"
              >
                <GoogleIcon />
                <Text style={styles.btnGoogleTexto}>Continuar com Google</Text>
              </Pressable>

              {appleLigada ? (
                <Pressable
                  style={[styles.btnApple, busy && styles.disabled]}
                  onPress={entrarApple}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Continuar com Apple"
                >
                  <AppleIcon />
                  <Text style={styles.btnAppleTexto}>Continuar com Apple</Text>
                </Pressable>
              ) : null}

              <View style={styles.ouLinha}>
                <View style={styles.ouTraco} />
                <Text style={styles.ouTexto}>ou</Text>
                <View style={styles.ouTraco} />
              </View>

              <Pressable
                onPress={() => abrirEmail('entrar')}
                disabled={busy}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Continuar com e-mail e senha"
              >
                <Text style={styles.linkEmail}>Continuar com e-mail e senha</Text>
              </Pressable>

              {previewLocal ? (
                <>
                  <Pressable onPress={demo} style={styles.demoDestaque} disabled={busy}>
                    <Text style={styles.demoDestaqueTexto}>Ver apresentação neste computador</Text>
                  </Pressable>
                  <Text style={styles.demoTexto}>
                    O Google só volta para cá se {redirectWeb || 'esta origem'} estiver nas Redirect URLs do Supabase.
                  </Text>
                </>
              ) : !configured ? (
                <Pressable onPress={demo} style={styles.demo} disabled={busy}>
                  <Text style={styles.demoTexto}>Continuar sem conta</Text>
                </Pressable>
              ) : busy ? (
                <ActivityIndicator color={colors.warmWhite} style={{ marginTop: 16 }} />
              ) : null}
            </View>

            <Text style={styles.termosPorta}>
              Ao continuar, você concorda com nossos{'\n'}
              <Text
                style={styles.termosLink}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Termos de Uso
              </Text>
              {' e '}
              <Text
                style={styles.termosLink}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Política de Privacidade
              </Text>
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // E-mail e senha: formulário claro no estilo atual do Grão.
  // -------------------------------------------------------------------------
  return (
    <View style={[styles.rootClaro, webScreenFill]}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollEmail}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emailTopo}>
              <Pressable
                onPress={voltarPorta}
                hitSlop={12}
                style={({ pressed }) => [styles.voltarBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <ChevronLeft size={22} color="#000000" strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.emailMarca}>
              <GraoSymbol size={56} color={colors.caramel} filled={false} />
              <Text style={styles.emailTitulo}>
                {mode === 'entrar' ? 'Entrar' : 'Criar conta'}
              </Text>
              <Text style={styles.emailSub}>
                {mode === 'entrar'
                  ? 'Acesse sua conta com e-mail e senha'
                  : 'Crie sua conta com e-mail e senha'}
              </Text>
            </View>

            {previewLocal ? (
              <Text style={styles.avisoLocal}>
                Preview local: o Google devolve para o Netlify. Use e-mail e senha
                ou o atalho no fim da tela.
              </Text>
            ) : null}

            <View style={styles.campo}>
              <Mail size={18} color={colors.mist} strokeWidth={1.9} />
              <TextInput
                style={styles.campoInput}
                placeholder="E-mail"
                placeholderTextColor={colors.mist}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={identificador}
                onChangeText={setIdentificador}
                editable={!busy && !confirmando}
              />
            </View>
            {telefone ? (
              <Text style={styles.hintEscuro}>
                Vamos usar o número {exibirTelefone(telefone)}.
              </Text>
            ) : null}

            <View style={styles.campo}>
              <Lock size={18} color={colors.mist} strokeWidth={1.9} />
              <TextInput
                style={styles.campoInput}
                placeholder="Senha"
                placeholderTextColor={colors.mist}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
              />
              <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={10}>
                {showPass ? (
                  <EyeOff size={18} color={colors.mist} strokeWidth={1.9} />
                ) : (
                  <Eye size={18} color={colors.mist} strokeWidth={1.9} />
                )}
              </Pressable>
            </View>

            {mode === 'entrar' ? (
              <Pressable
                onPress={esqueciSenha}
                disabled={busy}
                style={styles.esqueci}
                hitSlop={8}
              >
                <Text style={styles.esqueciTexto}>Esqueci minha senha</Text>
              </Pressable>
            ) : (
              <Text style={styles.termosCriar}>
                Ao criar a conta, você confirma ter 16 anos ou mais e concorda com
                os Termos e a Política de Privacidade.
              </Text>
            )}

            {confirmando ? (
              <View style={[styles.campo, { marginTop: 12 }]}>
                <TextInput
                  style={styles.campoInput}
                  placeholder="Código recebido"
                  placeholderTextColor={colors.mist}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={codigo}
                  onChangeText={setCodigo}
                  editable={!busy}
                />
              </View>
            ) : null}

            {error ? <Text style={styles.erroEscuro}>{error}</Text> : null}
            {info ? <Text style={styles.infoEscuro}>{info}</Text> : null}

            <Pressable
              onPress={confirmando ? confirmarCodigo : entrar}
              disabled={
                confirmando
                  ? codigo.replace(/\D/g, '').length < 6 || busy
                  : !podeEnviar
              }
              style={({ pressed }) => [
                styles.ctaPreto,
                (confirmando
                  ? codigo.replace(/\D/g, '').length < 6 || busy
                  : !podeEnviar) && styles.disabled,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaPretoTexto}>
                {confirmando
                  ? 'Confirmar código'
                  : mode === 'entrar'
                    ? 'Entrar'
                    : 'Criar conta'}
              </Text>
            </Pressable>

            <View style={styles.emailRodape}>
              {mode === 'entrar' ? (
                <Text style={styles.rodapeTexto}>
                  Não tem uma conta?{' '}
                  <Text style={styles.rodapeLink} onPress={switchMode}>
                    Criar conta
                  </Text>
                </Text>
              ) : (
                <Text style={styles.rodapeTexto}>
                  Já tem uma conta?{' '}
                  <Text style={styles.rodapeLink} onPress={switchMode}>
                    Entrar
                  </Text>
                </Text>
              )}
            </View>

            {previewLocal ? (
              <Pressable onPress={demo} style={styles.demoClaro} disabled={busy}>
                <Text style={styles.demoClaroTexto}>Ver apresentação neste computador</Text>
              </Pressable>
            ) : !configured ? (
              <Pressable onPress={demo} style={styles.demoClaro} disabled={busy}>
                <Text style={styles.demoClaroTexto}>Continuar sem conta</Text>
              </Pressable>
            ) : busy ? (
              <ActivityIndicator color="#000000" style={{ marginTop: 20 }} />
            ) : null}

            <Pressable
              onPress={() => navigation.navigate('PrivacyPolicy')}
              style={styles.politica}
              hitSlop={8}
            >
              <Text style={styles.politicaTexto}>Como cuidamos dos seus dados</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootCampo: {
    flex: 1,
    backgroundColor: '#241708',
  },
  rootClaro: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    transform: [{ scale: 1.12 }],
  },
  safe: { flex: 1, backgroundColor: 'transparent' },

  porta: {
    flex: 1,
    paddingHorizontal: space.gutter,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  portaTopo: { height: 24 },
  marca: {
    alignItems: 'center',
    gap: 14,
    marginTop: 40,
  },
  marcaNome: {
    fontFamily: fonts.sansSemi,
    fontSize: 36,
    color: colors.warmWhite,
    letterSpacing: -0.8,
  },
  portaAcoes: {
    gap: 12,
    paddingBottom: 8,
  },
  btnGoogle: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.warmWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  btnGoogleTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: '#000000',
  },
  btnApple: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  btnAppleTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: '#FFFFFF',
  },
  ouLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 8,
  },
  ouTraco: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(252,250,246,0.45)',
  },
  ouTexto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: 'rgba(252,250,246,0.85)',
  },
  linkEmail: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
    textAlign: 'center',
    paddingVertical: 10,
  },
  termosPorta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(252,250,246,0.7)',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  termosLink: {
    fontFamily: fonts.sansSemi,
    color: colors.warmWhite,
    textDecorationLine: 'underline',
  },
  erroClaro: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: '#E8A598',
    textAlign: 'center',
    marginBottom: 4,
  },
  infoClaro: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: 'rgba(252,250,246,0.85)',
    textAlign: 'center',
    marginBottom: 4,
  },
  demo: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  demoDestaque: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(252,250,246,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  demoDestaqueTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.warmWhite,
  },
  demoTexto: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(252,250,246,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },

  scrollEmail: {
    paddingHorizontal: space.gutter,
    paddingBottom: 48,
    flexGrow: 1,
  },
  emailTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  voltarBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.warmWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.sm as object),
  },
  emailMarca: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  emailTitulo: {
    fontFamily: fonts.sansSemi,
    fontSize: 28,
    color: '#000000',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  emailSub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mist,
    textAlign: 'center',
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warmWhite,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 18,
    minHeight: 54,
    marginBottom: 12,
  },
  campoInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 14,
  },
  hintEscuro: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mist,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 8,
  },
  esqueci: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    paddingVertical: 4,
  },
  esqueciTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.caramel,
  },
  termosCriar: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mist,
    marginBottom: 20,
    marginTop: 4,
  },
  erroEscuro: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.perigo,
    marginBottom: 12,
  },
  infoEscuro: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warmGray,
    marginBottom: 12,
  },
  ctaPreto: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaPretoTexto: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.warmWhite,
  },
  emailRodape: {
    alignItems: 'center',
    marginTop: 28,
  },
  rodapeTexto: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mist,
  },
  rodapeLink: {
    fontFamily: fonts.sansSemi,
    color: colors.caramel,
    textDecorationLine: 'underline',
  },
  demoClaro: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  demoClaroTexto: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mist,
  },
  avisoLocal: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.earth,
    backgroundColor: 'rgba(180, 119, 53, 0.14)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  politica: { alignSelf: 'center', marginTop: 24, paddingVertical: 6 },
  politicaTexto: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mist,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
