import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Cada peso pelo seu próprio caminho, não pelo índice do pacote.
//
// O índice traz TODOS os pesos e itálicos das duas famílias: 24 arquivos de
// fonte iam para a pasta publicada para usar 7, uns 2 MB de peso morto no
// deploy. O app usa quatro Newsreader e três DM Sans, e é isso que sobe.
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import 'react-native-gesture-handler';

import RootNavigator from './src/navigation';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import {
  hasDisplayName,
  hasDevocionalOptIn,
} from './src/onboarding/userProfile';
import { consumirPosOAuth } from './src/onboarding/authFlow';

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
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
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
      // Sem sessão: splash → apresentação → auth.
      if (!isAuthenticated) {
        if (!alive) return;
        setGate({ ready: true, app: false, initialRoute: 'Welcome' });
        return;
      }

      // Voltou do Google (ou já tem sessão): limpa o hash e retoma o fluxo.
      await consumirPosOAuth();
      limparHashOAuth();

      const named = await hasDisplayName();
      if (!alive) return;
      if (!named) {
        // Pós-login: vai direto pedir o nome (não refaz Intro).
        setGate({ ready: true, app: false, initialRoute: 'ComoChamar' });
        return;
      }

      const optIn = await hasDevocionalOptIn();
      if (!alive) return;
      if (!optIn) {
        setGate({ ready: true, app: false, initialRoute: 'ConfirmarDevocional' });
        return;
      }

      // Já concluiu onboarding: entra no Hoje.
      setGate({ ready: true, app: true, initialRoute: 'Welcome' });
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
    <View style={{ flex: 1, backgroundColor: '#241708' }} onLayout={onLayoutRootView}>
      <RootNavigator
        isOnboarded={gate.app}
        onboardingInitialRoute={gate.initialRoute}
        onFinish={finishOnboarding}
      />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
