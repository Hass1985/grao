import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import GraoSymbol from '../../components/GraoSymbol';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = {
  navigation: StackNavigationProp<any>;
};

const NATIVE = Platform.OS !== 'web';

export default function Welcome({ navigation }: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [enter]);

  const opacity = enter;
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <View style={styles.root}>
      {/* Papel de parede: degradê discreto palha → creme → toque âmbar */}
      <LinearGradient
        colors={['#FBF7F0', '#F7F1E8', '#F0E4D0', '#EBD9BE']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(192,120,38,0.00)', 'rgba(192,120,38,0.06)', 'rgba(192,120,38,0.00)']}
        locations={[0.2, 0.55, 0.9]}
        start={{ x: 0.5, y: 0.15 }}
        end={{ x: 0.5, y: 0.85 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
        <Animated.View style={[styles.stage, { opacity, transform: [{ translateY }] }]}>
          <View style={styles.brand}>
            <GraoSymbol size={52} color={colors.accent} filled={false} />
            <Text style={styles.name}>Grão</Text>
            <Text style={styles.tagline}>Uma semente por dia</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.headline}>A Palavra,{'\n'}no seu ritmo.</Text>
            <Text style={styles.sub}>
              Um momento, todo dia, escolhido para o que você está vivendo.
            </Text>
          </View>

          <Button
            testID="welcome-cta"
            title="Começar com calma"
            onPress={() => navigation.navigate('Intro')}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  stage: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: fonts.serifMedium,
    fontSize: 44,
    color: colors.foreground,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  body: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
  },
  headline: {
    fontFamily: fonts.serifMedium,
    fontSize: 36,
    lineHeight: 42,
    color: colors.foreground,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.base,
    lineHeight: 25,
    color: colors.foregroundMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
});
