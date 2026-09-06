import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { BookOpen } from '../../components/icons';
import Button from '../../components/ui/Button';
import ScreenBackground from '../../components/ui/ScreenBackground';
import {
  getDisplayName,
  setDevocionalOptIn,
} from '../../onboarding/userProfile';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { space } from '../../theme/spacing';
import { glassCard } from '../../theme/glass';
import { webScreenFill } from '../../theme/webScreen';

type Props = {
  onFinish: () => void;
};

/** Confirma o desejo de receber o devocional diário gratuito. */
export default function ConfirmarDevocional({ onFinish }: Props) {
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    getDisplayName().then(setNome).catch(() => {});
  }, []);

  const confirmar = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setDevocionalOptIn(true);
      onFinish();
    } finally {
      setBusy(false);
    }
  };

  const primeiro = nome.trim().split(/\s+/)[0] || '';

  return (
    <ScreenBackground style={webScreenFill}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <View style={styles.inner}>
          <Text style={styles.eyebrow}>Devocional diário</Text>
          <Text style={styles.title}>
            {primeiro ? `${primeiro}, quer` : 'Quer'}
            {'\n'}receber a Palavra{'\n'}todo dia?
          </Text>
          <Text style={styles.sub}>
            O Grão traz um devocional gratuito, todos os dias, no app. Calma,
            clareza e um passo de fé no ritmo da sua vida.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <BookOpen size={22} color={colors.ambarSoft} strokeWidth={2} />
            </View>
            <Text style={styles.cardTitle}>De Grão em Grão</Text>
            <Text style={styles.cardBody}>
              Uma página por dia, para você. Sem pressa, sem cobrança. Depois,
              se quiser, o Plantio acompanha de perto com oração, prática,
              louvor e WhatsApp.
            </Text>
          </View>

          <View style={styles.footer}>
            <Button
              title="Sim, quero o devocional"
              onPress={confirmar}
              disabled={busy}
              variant="dark"
              uppercase
            />
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: space.gutter,
    paddingTop: 48,
    paddingBottom: 36,
  },
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.ambarSoft,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 32,
    lineHeight: 38,
    color: colors.palha,
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foregroundMuted,
    marginBottom: 28,
    maxWidth: 340,
  },
  card: {
    ...glassCard,
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(192, 120, 38, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.palha,
  },
  cardBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: colors.foregroundMuted,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
});
