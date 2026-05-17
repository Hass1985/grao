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
      <StatusBar barStyle="dark-content" backgroundColor={colors.palha} />
      <View style={styles.content}>
        <View style={styles.header}>
          <GraoSymbol size={64} color={colors.ambar} filled={false} />
          <Text style={styles.name}>Grão</Text>
          <Text style={styles.slogan}>Uma semente por dia</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.description}>
            Todo dia, uma passagem bíblica escolhida para o momento que você está vivendo. Uma reflexão. Uma oração. Uma prática.
          </Text>
          <Text style={styles.subdescription}>
            Plantada no WhatsApp. Guardada no seu coração.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Segment')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Começar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palha,
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
    gap: 12,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxxl,
    color: colors.casca,
    letterSpacing: -0.5,
  },
  slogan: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.casca40,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  body: {
    gap: 16,
  },
  description: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xl,
    color: colors.casca,
    lineHeight: 32,
    textAlign: 'center',
  },
  subdescription: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.casca60,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.white,
    letterSpacing: 0.5,
  },
});
