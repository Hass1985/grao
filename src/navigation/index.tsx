import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackCardInterpolatedStyle, StackCardInterpolationProps } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Easing } from 'react-native';

import Welcome from '../screens/onboarding/Welcome';
import Intro from '../screens/onboarding/Intro';
import Abertura from '../screens/onboarding/Abertura';
import Conversa from '../screens/onboarding/Conversa';
import Notification from '../screens/onboarding/Notification';
import WhatsApp from '../screens/onboarding/WhatsApp';
import Plan from '../screens/onboarding/Plan';

import Hoje from '../screens/Hoje';
import Campo from '../screens/Campo';
import Raiz from '../screens/Raiz';
import Settings from '../screens/Settings';
import PrivacyPolicy from '../screens/PrivacyPolicy';
import Credits from '../screens/Credits';
import WhatsAppDemo from '../screens/WhatsAppDemo';

import FloatingTabBar from '../components/ui/FloatingTabBar';
import { colors } from '../theme/colors';

const Stack = createStackNavigator();
const AppStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function softSlide({ current, next, layouts }: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const width = layouts.screen.width;
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.12, 0],
  });
  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const nextOpacity = next
    ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] })
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
      config: { duration: 380, easing: Easing.out(Easing.cubic) },
    },
    close: {
      animation: 'timing' as const,
      config: { duration: 280, easing: Easing.in(Easing.cubic) },
    },
  },
  cardStyleInterpolator: softSlide,
  cardStyle: { backgroundColor: colors.background },
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
    </AppStack.Navigator>
  );
}

function OnboardingNavigator({ onFinish }: { onFinish: () => void }) {
  return (
    <Stack.Navigator screenOptions={stackMotion}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Intro" component={Intro} />
      <Stack.Screen name="Abertura" component={Abertura} />
      <Stack.Screen name="Conversa" component={Conversa} />
      <Stack.Screen name="Notification" component={Notification} />
      <Stack.Screen name="WhatsApp" component={WhatsApp} />
      <Stack.Screen name="WhatsAppDemo" component={WhatsAppDemo} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Stack.Screen name="Credits" component={Credits} />
      <Stack.Screen name="Plan">
        {(props) => <Plan {...props} onFinish={onFinish} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

interface RootNavigatorProps {
  isOnboarded: boolean;
  onFinish: () => void;
}

export default function RootNavigator({ isOnboarded, onFinish }: RootNavigatorProps) {
  return (
    <NavigationContainer>
      {isOnboarded ? (
        <AppNavigator />
      ) : (
        <OnboardingNavigator onFinish={onFinish} />
      )}
    </NavigationContainer>
  );
}
