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
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import GraoSymbol from '../../components/GraoSymbol';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

type Props = {
  navigation: StackNavigationProp<any>;
};

const NATIVE = Platform.OS !== 'web';

/** Splash: marca Grão sobre o campo do site. */
export default function Welcome({ navigation }: Props) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();

    const t = setTimeout(() => {
      navigation.replace('Intro');
    }, 3000);
    return () => clearTimeout(t);
  }, [enter, navigation]);

  const opacity = enter;
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../../assets/campo-trigo.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(36,23,8,0.5)', 'rgba(28,18,6,0.82)']}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <Animated.View style={[styles.stage, { opacity, transform: [{ translateY }] }]}>
          <GraoSymbol size={56} color={colors.ambarSoft} filled={false} />
          <Text style={styles.name}>Grão</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  name: {
    fontFamily: fonts.serifMedium,
    fontSize: 48,
    color: colors.palha,
    letterSpacing: -1.2,
  },
});
