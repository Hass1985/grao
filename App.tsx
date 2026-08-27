import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import 'react-native-gesture-handler';

import RootNavigator from './src/navigation';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Inter_400Regular,
    Inter_500Medium,
  });

  // Rede de segurança: mesmo que as fontes falhem ou travem no host,
  // o app renderiza (com a fonte do sistema) em no máximo 2,5s — nunca fica branco.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded || !!fontError || timedOut;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <RootNavigator
        isOnboarded={isOnboarded}
        onFinish={() => setIsOnboarded(true)}
      />
    </View>
  );
}
