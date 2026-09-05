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

const AppleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.88-2.12 1.56-3.24 1.47-.14-1.1.4-2.26 1.16-3.08.8-.88 2.2-1.52 3.26-1.41zM20.9 17.3c-.56 1.3-.82 1.88-1.54 3.04-1 1.58-2.42 3.56-4.18 3.58-1.56.02-1.96-1.02-4.08-1.02-2.14 0-2.58 1-4.14 1.04-1.74.04-3.08-1.72-4.1-3.3C1.1 17.3.1 13.2 2.3 10.42c1.1-1.4 2.86-2.28 4.56-2.3 1.78-.04 3.46 1.2 4.08 1.2.6 0 2.72-1.48 4.58-1.26.78.04 2.96.32 4.36 2.4-3.7 2.04-3.1 7.34.02 6.84z"
      fill={colors.palha}
    />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

const FacebookIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      d="M24 12.07C24 5.41 18.63.07 12 .07S0 5.41 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.39H7.08v-3.46h3.05V9.41c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.88v2.26h3.32l-.53 3.46h-2.79v8.39C19.61 23.02 24 18.06 24 12.07z"
      fill="#1877F2"
    />
  </Svg>
);

export default function Auth({ navigation, onFinish }: Props) {
  const { configured, enterDemo, acceptSession } = useAuth();
  const [mode, setMode] = useState<Mode>('criar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailOk = email.trim().includes('@');
  const passOk = password.length >= 8;
  const canEmail =
    mode === 'entrar'
      ? emailOk && password.length >= 6 && !busy
      : emailOk && passOk && accepted && !busy;

  const finishWithUser = async (session?: Session | null, userId?: string) => {
    if (session) await acceptSession(session);
    else if (userId) await setUserId(userId);
    onFinish();
  };

  const redirectTo = makeRedirectUri({
    scheme: 'grao',
    path: 'auth/callback',
  });

  const oauth = async (provider: 'google' | 'apple' | 'facebook') => {
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
      setError(e?.message || 'Não foi possível entrar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const emailAuth = async () => {
    if (!canEmail) return;
    if (!supabase) {
      setError('Supabase ainda não está configurado neste build.');
      return;
    }
    const mail = email.trim().toLowerCase();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'criar') {
        const { data, error: err } = await supabase.auth.signUp({
          email: mail,
          password,
        });
        if (err) throw err;
        if (!data.session) {
          setInfo('Enviamos um e-mail de confirmação. Depois disso, entre aqui.');
          setMode('entrar');
          return;
        }
        await finishWithUser(data.session, data.user?.id);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (err) throw err;
        await finishWithUser(data.session, data.user?.id);
      }
    } catch (e: any) {
      setError(e?.message || 'Não foi possível autenticar.');
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

          <Text style={styles.fieldLabel}>E-mail</Text>
          <TextInput
            style={styles.underline}
            placeholder=""
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />

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

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Button
            title={mode === 'criar' ? 'Continuar com e-mail' : 'Entrar com e-mail'}
            onPress={emailAuth}
            disabled={!canEmail}
            variant="dark"
            uppercase
            style={styles.primaryCta}
          />

          <View style={styles.rule} />

          <View style={styles.social}>
            <Pressable
              style={[styles.socialBtn, busy && styles.disabled]}
              onPress={() => oauth('apple')}
              disabled={busy}
            >
              <AppleIcon />
              <Text style={styles.socialLabel}>Continuar com a Apple</Text>
            </Pressable>
            <Pressable
              style={[styles.socialBtn, busy && styles.disabled]}
              onPress={() => oauth('facebook')}
              disabled={busy}
            >
              <FacebookIcon />
              <Text style={styles.socialLabel}>Continuar com o Facebook</Text>
            </Pressable>
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

          <Pressable onPress={demo} style={styles.demo} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.demoText}>Continuar sem conta</Text>
            )}
          </Pressable>
          {!configured ? (
            <Text style={styles.demoHint}>Supabase ainda não configurado neste build.</Text>
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
