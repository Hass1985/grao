import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { emotionalFamilies } from '../data/seeds';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

type Props = { navigation: any };

const timeWindows = [
  { id: 'dawn', label: 'Amanhecer', time: '6h – 8h' },
  { id: 'morning', label: 'Manhã', time: '8h – 10h' },
  { id: 'noon', label: 'Meio-dia', time: '12h – 13h' },
  { id: 'evening', label: 'Noite', time: '20h – 22h' },
];

export default function Settings({ navigation }: Props) {
  const [currentFeeling, setCurrentFeeling] = useState<string | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [showNotifOptions, setShowNotifOptions] = useState(false);
  const [selectedTime, setSelectedTime] = useState('dawn');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const currentPlan = { label: 'Anual', detail: '12x R$ 19,90' };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <Svg width={72} height={72} viewBox="0 0 72 72">
              <Circle cx="36" cy="36" r="36" fill={colors.white} />
              <Circle cx="36" cy="26" r="11" fill={colors.casca} />
              <Path d="M9 68 Q9 46 36 46 Q63 46 63 68" fill={colors.casca} />
            </Svg>
          </View>
          <TouchableOpacity>
            <Text style={styles.addPhoto}>Adicionar foto</Text>
          </TouchableOpacity>
          <Text style={styles.profileName}>Meu perfil</Text>
        </View>

        {/* Sentimento atual */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Como estou me sentindo</Text>
          {showFeelings ? (
            <View style={styles.feelingsGrid}>
              {emotionalFamilies.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.feelingChip, currentFeeling === f.id && styles.feelingChipSelected]}
                  onPress={() => { setCurrentFeeling(f.id); setShowFeelings(false); }}
                >
                  <Text style={styles.feelingEmoji}>{f.emoji}</Text>
                  <Text style={[styles.feelingLabel, currentFeeling === f.id && styles.feelingLabelSelected]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setShowFeelings(true)}>
              <Text style={styles.rowValue}>
                {currentFeeling
                  ? `${emotionalFamilies.find(f => f.id === currentFeeling)?.emoji} ${emotionalFamilies.find(f => f.id === currentFeeling)?.label}`
                  : 'Selecionar sentimento'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meu plano */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Meu plano</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowValue}>{currentPlan.label}</Text>
              <Text style={styles.rowDetail}>{currentPlan.detail}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* Notificações */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notificações</Text>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <Text style={styles.rowValue}>Receber semente pelo WhatsApp</Text>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: colors.casca12, true: colors.ambar }}
              thumbColor={colors.white}
            />
          </View>
          {notifEnabled && (
            <>
              <Text style={styles.subLabel}>Horário</Text>
              {showNotifOptions ? (
                <View style={styles.optionsList}>
                  {timeWindows.map((w) => (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.optionRow, selectedTime === w.id && styles.optionRowSelected]}
                      onPress={() => { setSelectedTime(w.id); setShowNotifOptions(false); }}
                    >
                      <Text style={[styles.optionLabel, selectedTime === w.id && styles.optionLabelSelected]}>
                        {w.label}
                      </Text>
                      <Text style={[styles.optionTime, selectedTime === w.id && styles.optionTimeSelected]}>
                        {w.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={styles.row} onPress={() => setShowNotifOptions(true)}>
                  <Text style={styles.rowValue}>
                    {timeWindows.find(w => w.id === selectedTime)?.label} · {timeWindows.find(w => w.id === selectedTime)?.time}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Visibilidade */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Privacidade</Text>
          <View style={styles.row}>
            <Text style={styles.rowValue}>Perfil privado</Text>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: colors.casca12, true: colors.ambar }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Sair */}
        <TouchableOpacity style={styles.signOutRow}>
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.palha },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.casca12,
  },
  backBtn: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText: { fontSize: 30, color: colors.ambar, lineHeight: 34, fontFamily: fonts.sans },
  title: { fontFamily: fonts.serif, fontSize: fontSizes.xl, color: colors.casca },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  profileSection: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
    borderWidth: 2, borderColor: colors.casca12,
  },
  addPhoto: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.ambar },
  profileName: { fontFamily: fonts.serif, fontSize: fontSizes.lg, color: colors.casca },
  section: {
    borderTopWidth: 1, borderTopColor: colors.casca12, paddingVertical: 20,
  },
  sectionLabel: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
  },
  subLabel: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs, color: colors.casca40,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowValue: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.casca, flex: 1 },
  rowDetail: { fontFamily: fonts.sans, fontSize: fontSizes.xs, color: colors.casca60, marginTop: 2 },
  chevron: { fontFamily: fonts.sans, fontSize: 22, color: colors.casca40, marginLeft: 8 },
  feelingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feelingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.peneira, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  feelingChipSelected: { borderColor: colors.ambar, backgroundColor: colors.white },
  feelingEmoji: { fontSize: 16 },
  feelingLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.casca },
  feelingLabelSelected: { color: colors.ambar },
  optionsList: { gap: 8 },
  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.peneira, borderRadius: 12, padding: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  optionRowSelected: { borderColor: colors.ambar, backgroundColor: colors.white },
  optionLabel: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: colors.casca },
  optionLabelSelected: { color: colors.ambar },
  optionTime: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.casca40 },
  optionTimeSelected: { color: colors.ambar },
  signOutRow: {
    borderTopWidth: 1, borderTopColor: colors.casca12,
    paddingVertical: 24, alignItems: 'center',
  },
  signOutText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.base, color: '#C0392B' },
});
