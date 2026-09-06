import { Platform, ViewStyle } from 'react-native';

// No react-native-web, o card do React Navigation não limita a altura à viewport
// e o flex-grow:1 do container faz o flexbox ignorar uma altura fixa — então
// telas com conteúdo alto transbordam e a ScrollView/FlatList não rola por dentro.
// Aplicar este estilo no SafeAreaView raiz da tela (junto com flex:1 na ScrollView
// filha) fixa a altura à janela e faz a rolagem interna funcionar no web.
// No mobile nativo, retorna null (o comportamento padrão já funciona).
export const webScreenFill: ViewStyle | null =
  Platform.OS === 'web'
    ? ({
        height: '100%',
        maxHeight: '100dvh',
        minHeight: '100%',
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 'auto',
        overflow: 'hidden',
      } as ViewStyle)
    : null;

// flex:1 para a ScrollView/FlatList filha (para encolher e rolar por dentro).
export const webScroll: ViewStyle = { flex: 1, minHeight: 0 };
