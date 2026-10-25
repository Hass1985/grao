// A tela de pagamento.
//
// Ela existe para cumprir uma promessa específica: 7 dias grátis, e a primeira
// cobrança só no 8º. A reclamação número um contra o concorrente é cobrança
// sem aviso — gente que achou que estava testando e foi cobrada no ato, gente
// que queria o mensal e pagou o anual. Por isso a data da primeira cobrança e o
// valor aparecem em cima do botão, escritos por extenso, antes do toque, e não
// numa tela de sucesso depois.
//
// O CPF é pedido porque o Asaas exige para emitir Pix, e a tela diz isso em vez
// de pedir um documento sem explicação num app de devocional.
//
// Preço e ambiente vêm do servidor (`/assinatura/config`). Enquanto a chave for
// de sandbox, a tela avisa que nada será cobrado: um testador que acha que
// pagou e não pagou — ou o contrário — é o pior final possível para uma semana
// de teste.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Check } from '../components/icons';
import Button from '../components/ui/Button';
import BrandHeader from '../components/ui/BrandHeader';
import { colors } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import { space } from '../theme/spacing';
import { glassCard } from '../theme/glass';
import { webScreenFill, webScroll } from '../theme/webScreen';
import { useAuth } from '../auth/AuthContext';
import {
  configuracaoDeCobranca, assinar, mascararCpf, cpfValido,
  emReais,
  type ConfigCobranca, type PlanoOferecido,
} from '../onboarding/assinatura';

type Props = { navigation: any };

const FUNDO_SHEET = '#F4F4F4';

const INCLUI = [
  'Uma semente escolhida para o seu momento, todo dia',
  'Oração guiada e prática para viver a Palavra',
  'Louvor escolhido para o seu dia',
  'A semente também no WhatsApp, no seu horário',
  'Seu Campo e sua Raiz guardados para sempre',
];

export default function Assinar({ navigation }: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigCobranca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [plano, setPlano] = useState<'plantio' | 'anual'>('plantio');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    configuracaoDeCobranca()
      .then((c) => { if (vivo) setConfig(c); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  const escolhido: PlanoOferecido | undefined =
    config?.planos.find((p) => p.id === plano);

  // A data é calculada aqui, e não pedida ao servidor, porque precisa aparecer
  // ANTES de qualquer chamada: é ela que transforma "assinar" em "testar".
  const primeiroDiaDeCobranca = () => {
    const d = new Date(Date.now() + (config?.diasGratis ?? 7) * 86_400_000);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  };

  /** Avança o fluxo sem gravar cobrança: serve para testar WhatsApp e Momento. */
  // Havia aqui um "Continuar sem cobrança (teste)".
  //
  // Ele pulava o servidor: inventava uma data local e seguia para a entrega.
  // A pessoa atravessava telefone, horário e relato achando que tinha
  // assinado, voltava ao Hoje e batia no paywall de novo, porque nenhuma
  // assinatura havia sido criada. Um atalho que parecia caminho.
  //
  // Sandbox não precisa de atalho: a chave de homologação já faz o fluxo
  // inteiro sem cobrar ninguém, e é ele que queremos ver se comporta.

  async function confirmar() {
    setErro(null);
    if (!cpfValido(cpf)) {
      setErro('Confira o CPF: faltou um número ou algum saiu trocado.');
      return;
    }
    setEnviando(true);
    const r = await assinar({ plano, cpf, email: email.trim() || undefined });
    setEnviando(false);
    if (!r.ok) { setErro(r.erro); return; }

    // Sem tela de recibo no meio: o que a pessoa comprou não foi um
    // comprovante, e o compromisso da cobrança ela já leu, por extenso, logo
    // acima do botão que apertou. A data segue junto e reaparece discreta no
    // alto das próximas telas.
    //
    // Antes da semente vem a entrega: número do WhatsApp e horário. É a metade
    // do produto que mora fora do app, e o único momento em que perguntar isso
    // não interrompe nada — depois começa o relato, que é íntimo e não combina
    // com formulário.
    navigation.replace('EntregaWhatsApp', { trialAte: r.primeiraCobranca });
  }

  // -------------------------------------------------------------------------
  // O formulário.
  // -------------------------------------------------------------------------
  return (
    <View style={[styles.root, webScreenFill]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BrandHeader onClose={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={webScroll} contentContainerStyle={styles.scroll}>
          <Text style={styles.eyebrow}>Plantio</Text>
          <Text style={styles.titulo}>7 dias grátis. Depois você decide.</Text>
          <Text style={styles.sub}>
            Hoje você não paga nada. Se ficar, a primeira cobrança é só em{' '}
            <Text style={styles.forte}>{primeiroDiaDeCobranca()}</Text>, por Pix, e a gente
            avisa um dia antes, com o valor escrito.
          </Text>

          {carregando ? (
            <View style={styles.carregando}>
              <ActivityIndicator color={colors.earth} />
            </View>
          ) : !config?.ativa ? (
            <View style={styles.aviso}>
              <Text style={styles.avisoTitulo}>A cobrança ainda não está aberta</Text>
              <Text style={styles.avisoTexto}>
                Estamos terminando de ligar o pagamento. Enquanto isso, o devocional
                diário continua seu, de graça.
              </Text>
              <Text style={[styles.ajuda, { marginTop: 12 }]}>
                Assim que a cobrança abrir, o Plantio aparece aqui com os 7 dias
                grátis.
              </Text>
            </View>
          ) : (
            <>
              {config.ambiente === 'sandbox' ? (
                <View style={styles.teste}>
                  <Text style={styles.testeTexto}>
                    Ambiente de teste: nada será cobrado de verdade.
                  </Text>
                </View>
              ) : null}

              {/* Os dois planos, lado a lado e do mesmo tamanho: o anual não
                  ganha destaque visual. Empurrar para o plano mais caro é
                  exatamente a segunda reclamação contra o concorrente. */}
              <View style={styles.planos}>
                {config.planos.map((p) => {
                  const ativo = p.id === plano;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setPlano(p.id)}
                      style={[styles.plano, ativo && styles.planoAtivo]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: ativo }}
                      accessibilityLabel={`${p.nome}, ${emReais(p.valorCentavos)} por ${p.ciclo}`}
                    >
                      <View style={[styles.marca, ativo && styles.marcaAtiva]}>
                        {ativo ? <Check size={13} color={colors.white} strokeWidth={3} /> : null}
                      </View>
                      <Text style={styles.planoNome}>{p.nome}</Text>
                      <Text style={styles.planoPreco}>{emReais(p.valorCentavos)}</Text>
                      <Text style={styles.planoCiclo}>por {p.ciclo}</Text>
                      {p.id === 'anual' ? (
                        <Text style={styles.planoNota}>economia de 2 meses</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.inclui}>
                <Text style={styles.incluiTitulo}>O que entra</Text>
                {INCLUI.map((item) => (
                  <View key={item} style={styles.incluiLinha}>
                    <Check size={15} color={colors.earth} strokeWidth={2.4} />
                    <Text style={styles.incluiTexto}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.campo}>
                <Text style={styles.rotulo}>CPF</Text>
                <TextInput
                  value={cpf}
                  onChangeText={(t) => { setCpf(mascararCpf(t)); setErro(null); }}
                  placeholder="000.000.000-00"
                  placeholderTextColor={colors.mist}
                  keyboardType="number-pad"
                  style={styles.entrada}
                  maxLength={14}
                  accessibilityLabel="CPF"
                />
                <Text style={styles.ajuda}>
                  O Pix é emitido no seu nome: por isso o banco pede o CPF.
                </Text>
              </View>

              <View style={styles.campo}>
                <Text style={styles.rotulo}>E-mail para o recibo</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="opcional"
                  placeholderTextColor={colors.mist}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.entrada}
                  accessibilityLabel="E-mail para o recibo"
                />
              </View>

              {erro ? <Text style={styles.erro}>{erro}</Text> : null}

              <Text style={styles.resumo}>
                {escolhido
                  ? `Hoje: R$ 0,00. A partir de ${primeiroDiaDeCobranca()}, ` +
                    `${emReais(escolhido.valorCentavos)} por ${escolhido.ciclo}.`
                  : ''}
              </Text>

              <Button
                title={enviando ? 'Um instante…' : 'Comece com 7 dias grátis'}
                onPress={confirmar}
                disabled={enviando}
                variant="dark"
              />

              <Pressable onPress={() => navigation.goBack()} style={styles.link} hitSlop={8}>
                <Text style={styles.linkTexto}>Agora não</Text>
              </Pressable>

              <Text style={styles.rodape}>
                Cancele quando quiser, respondendo CANCELAR no WhatsApp ou em Ajustes.
                Cancelar não tira o devocional diário: ele é gratuito para sempre.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { paddingHorizontal: space.gutter, paddingTop: 22, paddingBottom: 56, flexGrow: 1 },
  eyebrow: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.4,
    textTransform: 'uppercase', color: colors.earth, marginBottom: 10,
  },
  titulo: {
    fontFamily: fonts.serifMedium, fontSize: 28, lineHeight: 34,
    color: colors.earth, letterSpacing: -0.5, marginBottom: 12,
  },
  sub: {
    fontFamily: fonts.sans, fontSize: 16, lineHeight: 24,
    color: colors.warmGray, marginBottom: 6, maxWidth: 360,
  },
  forte: { fontFamily: fonts.sansSemi, color: colors.earth },
  carregando: { paddingVertical: 40, alignItems: 'center' },
  aviso: {
    ...glassCard, borderRadius: 20, padding: 20, gap: 8, marginTop: 20,
  },
  avisoTitulo: { fontFamily: fonts.sansSemi, fontSize: fontSizes.base, color: colors.earth },
  avisoTexto: {
    fontFamily: fonts.sans, fontSize: fontSizes.sm, lineHeight: 21,
    color: colors.warmGray,
  },
  teste: {
    backgroundColor: 'rgba(101, 69, 47, 0.12)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginTop: 18, marginBottom: 4,
  },
  testeTexto: {
    fontFamily: fonts.sansSemi, fontSize: fontSizes.xs, letterSpacing: 0.4,
    color: colors.earth, textAlign: 'center',
  },
  planos: { flexDirection: 'row', gap: 12, marginTop: 22 },
  plano: {
    flex: 1, ...glassCard, borderRadius: 20, paddingVertical: 18,
    paddingHorizontal: 14, gap: 2,
  },
  planoAtivo: { borderColor: colors.earth, borderWidth: 1.5 },
  marca: {
    width: 20, height: 20, borderRadius: 10, marginBottom: 8,
    borderWidth: 1.5, borderColor: colors.sand,
    alignItems: 'center', justifyContent: 'center',
  },
  marcaAtiva: { backgroundColor: colors.earth, borderColor: colors.earth },
  planoNome: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.earth,
  },
  planoPreco: {
    fontFamily: fonts.serifMedium, fontSize: 24, color: colors.earth, marginTop: 2,
  },
  planoCiclo: { fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.warmGray },
  planoNota: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.xs,
    color: colors.earth, marginTop: 6,
  },
  inclui: { marginTop: 26, gap: 10 },
  incluiTitulo: {
    fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.earth, marginBottom: 2,
  },
  incluiLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  incluiTexto: {
    flex: 1, fontFamily: fonts.sans, fontSize: fontSizes.sm,
    lineHeight: 22, color: colors.warmGray,
  },
  campo: { marginTop: 26 },
  rotulo: {
    fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.4,
    textTransform: 'uppercase', color: colors.earth, marginBottom: 10,
  },
  entrada: {
    borderBottomWidth: 1.5, borderBottomColor: colors.sand,
    paddingVertical: 10, fontFamily: fonts.sans, fontSize: 17, color: colors.earth,
  },
  ajuda: {
    fontFamily: fonts.sans, fontSize: 13, lineHeight: 19,
    color: colors.warmGray, marginTop: 8,
  },
  erro: {
    fontFamily: fonts.sans, fontSize: 13, lineHeight: 19,
    color: colors.perigo, marginTop: 18,
  },
  resumo: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, lineHeight: 22,
    color: colors.earth, marginTop: 26, marginBottom: 14,
  },
  link: { alignSelf: 'center', marginTop: 16, paddingVertical: 8 },
  linkTexto: {
    fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.warmGray,
  },
  rodape: {
    fontFamily: fonts.sans, fontSize: 12, lineHeight: 18,
    color: colors.mist, marginTop: 20, textAlign: 'center',
  },
});
