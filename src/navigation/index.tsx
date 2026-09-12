import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackCardInterpolatedStyle, StackCardInterpolationProps } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Welcome from '../screens/onboarding/Welcome';
import Intro from '../screens/onboarding/Intro';
import Auth from '../screens/onboarding/Auth';
import ComoChamar from '../screens/onboarding/ComoChamar';

import Hoje from '../screens/Hoje';
import Campo from '../screens/Campo';
import Biblia from '../screens/Biblia';
import Loja from '../screens/Loja';
import Raiz from '../screens/Raiz';
import Settings from '../screens/Settings';
import PrivacyPolicy from '../screens/PrivacyPolicy';
import Credits from '../screens/Credits';
import WhatsAppDemo from '../screens/WhatsAppDemo';
import Plantio from '../screens/Plantio';
import Assinar from '../screens/Assinar';
import MomentoSementeTeste from '../screens/MomentoSementeTeste';
import HojeSementeTeste from '../screens/HojeSementeTeste';
import HistoricoTeste from '../screens/HistoricoTeste';

import FloatingTabBar from '../components/ui/FloatingTabBar';
import { colors } from '../theme/colors';
import { motion } from '../theme/motion';

const Stack = createStackNavigator();
const AppStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function softSlide({ current, next, layouts }: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const width = layouts.screen.width;
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.08, 0],
  });
  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const nextOpacity = next
    ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] })
    : 1;
  return {
    cardStyle: {
      opacity: next ? nextOpacity : opacity,
      transform: [{ translateX }],
    },
  };
}

const stackMotion = {
  headerShown: false as const,
  gestureEnabled: true,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: { duration: motion.stackOpenMs, easing: motion.easingOut },
    },
    close: {
      animation: 'timing' as const,
      config: { duration: motion.stackCloseMs, easing: motion.easingIn },
    },
  },
  cardStyleInterpolator: softSlide,
  cardStyle: { backgroundColor: colors.cascaDeep },
};

function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.foregroundSubtle,
      }}
    >
      <Tab.Screen name="Hoje" component={Hoje} />
      <Tab.Screen name="Campo" component={Campo} />
      <Tab.Screen name="Raiz" component={Raiz} />
      <Tab.Screen name="Biblia" component={Biblia} options={{ title: 'Bíblia' }} />
      <Tab.Screen name="Loja" component={Loja} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={stackMotion}>
      <AppStack.Screen name="Main" component={MainNavigator} />
      <AppStack.Screen name="Settings" component={Settings} />
      <AppStack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <AppStack.Screen name="Credits" component={Credits} />
      <AppStack.Screen name="WhatsAppDemo" component={WhatsAppDemo} />
      <AppStack.Screen name="Plantio" component={Plantio} />
      <AppStack.Screen name="Assinar" component={Assinar} />
      {/* A mesma tela em dois modos. `real` é o que separa a demonstração, que
          não grava nada, do gesto que de fato escolhe a semente do dia. */}
      <AppStack.Screen
        name="MomentoSemente"
        component={MomentoSementeTeste}
        initialParams={{ real: true }}
      />
      <AppStack.Screen name="MomentoSementeTeste" component={MomentoSementeTeste} />
      <AppStack.Screen name="HojeSementeTeste" component={HojeSementeTeste} />
      <AppStack.Screen name="HistoricoTeste" component={HistoricoTeste} />
    </AppStack.Navigator>
  );
}

interface RootNavigatorProps {
  isOnboarded: boolean;
  onboardingInitialRoute?: string;
  onFinish: () => void;
}

function OnboardingNavigator({
  onFinish,
  initialRouteName = 'Welcome',
}: {
  onFinish: () => void;
  initialRouteName?: string;
}) {
  return (
    <Stack.Navigator screenOptions={stackMotion} initialRouteName={initialRouteName}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Intro" component={Intro} />
      <Stack.Screen name="Auth" component={Auth} />
      {/* Depois do nome, o app. A tela que pedia para confirmar o devocional
          diário saiu do caminho: era uma pergunta cuja resposta já estava dada
          por quem acabou de criar conta num app de devocional. */}
      <Stack.Screen name="ComoChamar">
        {(props) => <ComoChamar {...props} onFinish={onFinish} />}
      </Stack.Screen>
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Stack.Screen name="Credits" component={Credits} />
    </Stack.Navigator>
  );
}

export default function RootNavigator({
  isOnboarded,
  onboardingInitialRoute = 'Welcome',
  onFinish,
}: RootNavigatorProps) {
  return (
    <NavigationContainer>
      {isOnboarded ? (
        <AppNavigator />
      ) : (
        <OnboardingNavigator
          key={onboardingInitialRoute}
          onFinish={onFinish}
          initialRouteName={onboardingInitialRoute}
        />
      )}
    </NavigationContainer>
  );
}
