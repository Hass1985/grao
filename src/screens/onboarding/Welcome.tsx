import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import GraoSymbol from '../../components/GraoSymbol';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { motion } from '../../theme/motion';

type Props = {
  navigation: StackNavigationProp<any>;
};

const NATIVE = Platform.OS !== 'web';

/** Splash: marca Grão. Depois sempre vai para a apresentação (Intro). */
export default function Welcome({ navigation }: Props) {
  const enter = useRef(new Animated.Value(0)).current;
  const saiu = useRef(false);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.enterMs,
      easing: motion.easingOut,
      useNativeDriver: NATIVE,
    }).start();

    const t = setTimeout(() => {
      if (saiu.current) return;
      saiu.current = true;
      navigation.replace('Intro');
    }, motion.splashMs);
    return () => clearTimeout(t);
  }, [enter, navigation]);

  const opacity = enter;
  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.enterRise, 0],
  });

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../../assets/campo-trigo.jpg')}
        style={styles.bg}
        imageStyle={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(36,23,8,0.55)', 'rgba(28,18,6,0.78)', 'rgba(36,23,8,0.94)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.stage}>
        <Animated.View style={[styles.brand, { opacity, transform: [{ translateY }] }]}>
          <GraoSymbol size={56} color={colors.ambarSoft} filled={false} />
          <Text style={styles.name}>Grão</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cascaDeep,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    transform: [{ scale: 1.12 }],
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: 14,
  },
  name: {
    fontFamily: fonts.serifMedium,
    fontSize: 48,
    color: colors.palha,
    letterSpacing: -1.2,
  },
});
