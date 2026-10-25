import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Cada peso pelo seu próprio caminho, não pelo índice do pacote.
//
// O índice traz TODOS os pesos e itálicos das duas famílias: 24 arquivos de
// fonte iam para a pasta publicada para usar 7, uns 2 MB de peso morto no
// deploy. O app usa quatro Newsreader e três DM Sans, e é isso que sobe.
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display/400Regular_Italic';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { GuiaPrimeiroAcessoProvider } from './src/components/GuiaPrimeiroAcesso';
import { hasDisplayName, sincronizarPerfil } from './src/onboarding/userProfile';
import { consumirPosOAuth, viuApresentacao } from './src/onboarding/authFlow';
import { viuIndicacao } from './src/onboarding/indicacao';

SplashScreen.preventAutoHideAsync();

type Gate = {
  ready: boolean;
  /** Entrou no app principal (Hoje). */
  app: boolean;
  /** Rota inicial do onboarding quando ainda não concluiu. */
  initialRoute: string;
};

function limparHashOAuth() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.hash && (url.hash.includes('access_token') || url.hash.includes('error'))) {
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  } catch {
    /* ignore */
  }
}

function AppShell() {
  const { ready: authReady, isAuthenticated } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  });

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const [gate, setGate] = useState<Gate>({
    ready: false,
    app: false,
    initialRoute: 'Welcome',
  });

  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    (async () => {
      // Sem sessão: a porta é a autenticação (Google, Apple, e-mail).
      if (!isAuthenticated) {
        if (!alive) return;
        setGate({ ready: true, app: false, initialRoute: 'Auth' });
        return;
      }

      // Voltou do Google (ou já tem sessão): limpa o hash e retoma o fluxo.
      await consumirPosOAuth();
      limparHashOAuth();

      const [named, apresentacao, indicacao] = await Promise.all([
        hasDisplayName(),
        viuApresentacao(),
        viuIndicacao(),
      ]);
      if (!alive) return;

      // Auth → apresentação → indicação → (nome, se faltar) → Hoje.
      // A apresentação e o código vêm ANTES do atalho por nome: senão quem
      // já tem conta no Google pula as telas novas e cai direto no Hoje.
      if (!apresentacao) {
        setGate({ ready: true, app: false, initialRoute: 'Intro' });
        return;
      }
      if (!indicacao) {
        setGate({ ready: true, app: false, initialRoute: 'CodigoIndicacao' });
        return;
      }
      if (!named) {
        setGate({ ready: true, app: false, initialRoute: 'ComoChamar' });
        return;
      }

      setGate({ ready: true, app: true, initialRoute: 'Auth' });
      void sincronizarPerfil();
    })();
    return () => {
      alive = false;
    };
  }, [authReady, isAuthenticated]);

  const ready = (fontsLoaded || !!fontError || timedOut) && gate.ready;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [ready]);

  const finishOnboarding = useCallback(() => {
    setGate({ ready: true, app: true, initialRoute: 'Welcome' });
  }, []);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F1E7' }} onLayout={onLayoutRootView}>
      {/* O guia mora AQUI, e não em volta do app, porque só aqui existe a
          resposta de que ele depende: a pessoa já entrou? Montado na raiz, ele
          subia junto com a tela de login. */}
      <GuiaPrimeiroAcessoProvider habilitado={gate.app}>
        <RootNavigator
          isOnboarded={gate.app}
          onboardingInitialRoute={gate.initialRoute}
          onFinish={finishOnboarding}
        />
      </GuiaPrimeiroAcessoProvider>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
