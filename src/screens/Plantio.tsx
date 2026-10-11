// Explicação do Plantio: header de marca + convite no sheet cinza.
// Abre a partir dos tópicos com cadeado na Hoje (e de "Conhecer o Plantio").

import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import BrandHeader from '../components/ui/BrandHeader';
import ConviteDoPlantio from '../components/ConviteDoPlantio';
import { space } from '../theme/spacing';
import { webScreenFill, webScroll } from '../theme/webScreen';

type Props = { navigation: any };

const FUNDO_SHEET = '#F4F4F4';

export default function Plantio({ navigation }: Props) {
  const abrirAssinatura = () => {
    if (typeof navigation.push === 'function') {
      navigation.push('Assinar');
      return;
    }
    navigation.navigate('Assinar');
  };

  return (
    <View style={[styles.root, webScreenFill]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BrandHeader onClose={() => navigation.goBack()} />
      <View style={styles.sheet}>
        <ScrollView
          style={webScroll}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ConviteDoPlantio onAssinar={abrirAssinatura} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241708' },
  sheet: {
    flex: 1,
    minHeight: 0,
    marginTop: -16,
    backgroundColor: FUNDO_SHEET,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: space.gutter,
    paddingTop: 22,
    paddingBottom: 56,
    flexGrow: 1,
  },
});
