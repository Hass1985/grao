import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import GraoSymbol from '../../components/GraoSymbol';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function Welcome({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.content}>
        <View style={styles.header}>
          <GraoSymbol size={56} color={colors.accent} filled={false} />
          <Text style={styles.name}>Grão</Text>
          <Text style={styles.eyebrow}>Devocional diário · em português</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.headline}>Uma semente{'\n'}por dia.</Text>
          <Text style={styles.description}>
            A Palavra de Deus{'\n'}na palma da sua mão.
          </Text>
        </View>

        <TouchableOpacity
          testID="welcome-cta"
          style={styles.button}
          onPress={() => navigation.navigate('Intro')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Plantar minha primeira semente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.foreground,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  body: {
    gap: 24,
    alignItems: 'center',
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 44,
    color: colors.foreground,
    lineHeight: 46,
    letterSpacing: -1,
    textAlign: 'center',
  },
  description: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.lg,
    color: colors.foregroundMuted,
    lineHeight: 30,
    textAlign: 'center',
    maxWidth: 320,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ruleLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
  },
  ruleLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.foregroundSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.accentForeground,
    letterSpacing: 0.3,
  },
});
