import AsyncStorage from '@react-native-async-storage/async-storage';

/** Já passou pela tela de código de indicação (validou ou pulou). */
const VISTA_KEY = 'grao.auth.indicacaoVista.v1';

/** Código informado na entrada, se houver. */
const CODIGO_KEY = 'grao.indicacao.codigo.v1';

export async function marcarIndicacaoVista(): Promise<void> {
  await AsyncStorage.setItem(VISTA_KEY, '1');
}

export async function viuIndicacao(): Promise<boolean> {
  return (await AsyncStorage.getItem(VISTA_KEY)) === '1';
}

export async function limparIndicacaoVista(): Promise<void> {
  await AsyncStorage.removeItem(VISTA_KEY);
}

/** Normaliza o código: maiúsculas, sem espaços nas pontas. */
export function normalizarCodigo(bruto: string): string {
  return bruto.trim().toUpperCase().replace(/\s+/g, '_');
}

export async function salvarCodigoIndicacao(codigo: string): Promise<void> {
  const v = normalizarCodigo(codigo);
  if (v) await AsyncStorage.setItem(CODIGO_KEY, v);
  else await AsyncStorage.removeItem(CODIGO_KEY);
}

export async function codigoIndicacaoSalvo(): Promise<string | null> {
  return AsyncStorage.getItem(CODIGO_KEY);
}
