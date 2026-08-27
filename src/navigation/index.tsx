import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import WhatsAppDemo from '../screens/WhatsAppDemo';

import GraoSymbol from '../components/GraoSymbol';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const Stack = createStackNavigator();
const AppStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 78 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset + 10,
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 11,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.foregroundSubtle,
      }}
    >
      <Tab.Screen
        name="Hoje"
        component={Hoje}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <GraoSymbol size={26} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Campo"
        component={Campo}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <GraoSymbol size={26} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Raiz"
        component={Raiz}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <GraoSymbol size={26} color={color} filled={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Main" component={MainNavigator} />
      <AppStack.Screen name="Settings" component={Settings} />
      <AppStack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <AppStack.Screen name="WhatsAppDemo" component={WhatsAppDemo} />
    </AppStack.Navigator>
  );
}

function OnboardingNavigator({ onFinish }: { onFinish: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Intro" component={Intro} />
      <Stack.Screen name="Abertura" component={Abertura} />
      <Stack.Screen name="Conversa" component={Conversa} />
      <Stack.Screen name="Notification" component={Notification} />
      <Stack.Screen name="WhatsApp" component={WhatsApp} />
      <Stack.Screen name="WhatsAppDemo" component={WhatsAppDemo} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
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
