import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Welcome from '../screens/onboarding/Welcome';
import Segment from '../screens/onboarding/Segment';
import Notification from '../screens/onboarding/Notification';
import WhatsApp from '../screens/onboarding/WhatsApp';
import Plan from '../screens/onboarding/Plan';

import Hoje from '../screens/Hoje';
import Campo from '../screens/Campo';
import Raiz from '../screens/Raiz';
import Settings from '../screens/Settings';

import GraoSymbol from '../components/GraoSymbol';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const Stack = createStackNavigator();
const AppStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.palha,
          borderTopColor: colors.casca12,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarActiveTintColor: colors.ambar,
        tabBarInactiveTintColor: colors.casca40,
      }}
    >
      <Tab.Screen
        name="Hoje"
        component={Hoje}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <GraoSymbol size={28} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Campo"
        component={Campo}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <GraoSymbol size={28} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Raiz"
        component={Raiz}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <GraoSymbol size={28} color={color} filled={focused} />
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
    </AppStack.Navigator>
  );
}

function OnboardingNavigator({ onFinish }: { onFinish: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Segment" component={Segment} />
      <Stack.Screen name="Notification" component={Notification} />
      <Stack.Screen name="WhatsApp" component={WhatsApp} />
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
