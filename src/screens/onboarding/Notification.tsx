import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

type Props = {
  navigation: StackNavigationProp<any>;
};

const windows = [
  { id: 'dawn', label: 'Amanhecer', time: '6h – 8h', description: 'Comece o dia com a semente' },
  { id: 'morning', label: 'Manhã', time: '8h – 10h', description: 'Após o café da manhã' },
  { id: 'noon', label: 'Meio-dia', time: '12h – 13h', description: 'Uma pausa no seu dia' },
  { id: 'evening', label: 'Noite', time: '20h – 22h', description: 'Encerre o dia com calma' },
];

export default function Notification({ navigation }: Props) {
  const [selected, setSelected] = useState('dawn');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Quando quer receber sua semente?</Text>
        <Text style={styles.subtitle}>
          Você vai receber via WhatsApp. Pode mudar isso depois.
        </Text>

        <View style={styles.list}>
          {windows.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.item, selected === w.id && styles.itemSelected]}
              onPress={() => setSelected(w.id)}
              activeOpacity={0.8}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemLabel, selected === w.id && styles.itemLabelSelected]}>
                  {w.label}
                </Text>
                <Text style={styles.itemDesc}>{w.description}</Text>
              </View>
              <Text style={[styles.itemTime, selected === w.id && styles.itemTimeSelected]}>
                {w.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('WhatsApp')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    color: colors.casca,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    color: colors.casca60,
    lineHeight: 24,
    marginBottom: 32,
  },
  list: { gap: 10 },
  item: {
    backgroundColor: colors.peneira,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: colors.ambar,
    backgroundColor: colors.white,
  },
  itemLeft: { gap: 4 },
  itemLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.base,
    color: colors.casca,
  },
  itemLabelSelected: { color: colors.ambar },
  itemDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.casca60,
  },
  itemTime: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    color: colors.casca40,
  },
  itemTimeSelected: { color: colors.ambar },
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
  },
});
