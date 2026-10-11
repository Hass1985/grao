import AsyncStorage from '@react-native-async-storage/async-storage';

/** Marca que o usuário saiu para o OAuth e deve retomar no pós-login. */
const POS_OAUTH_KEY = 'grao.auth.posOAuth.v1';

/** Já viu as telas de apresentação depois de autenticar. */
const APRESENTACAO_KEY = 'grao.auth.apresentacao.v1';

export async function marcarPosOAuth(): Promise<void> {
  await AsyncStorage.setItem(POS_OAUTH_KEY, '1');
}

export async function consumirPosOAuth(): Promise<boolean> {
  const v = await AsyncStorage.getItem(POS_OAUTH_KEY);
  if (v === '1') {
    await AsyncStorage.removeItem(POS_OAUTH_KEY);
    return true;
  }
  return false;
}

export async function marcarApresentacaoVista(): Promise<void> {
  await AsyncStorage.setItem(APRESENTACAO_KEY, '1');
}

export async function viuApresentacao(): Promise<boolean> {
  return (await AsyncStorage.getItem(APRESENTACAO_KEY)) === '1';
}

export async function limparApresentacaoVista(): Promise<void> {
  await AsyncStorage.removeItem(APRESENTACAO_KEY);
}
