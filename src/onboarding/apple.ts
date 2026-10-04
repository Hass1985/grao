// Entrar com a Apple.
//
// POR QUE ISTO EXISTE
//
// A regra 4.8 da App Store: um aplicativo que oferece login de terceiros —
// e o Grão oferece o do Google — precisa oferecer o da Apple junto. Não é
// recomendação, é causa de recusa na revisão, e a recusa vem antes de qualquer
// pessoa ver o produto.
//
// Mas tem um motivo melhor que a regra. O público do Grão é, em boa parte,
// gente mais velha, e a entrada é o ponto onde um app desse público mais
// perde: criar senha, confirmar e-mail, lembrar qual foi. O botão da Apple
// resolve isso com a digital, sem teclado nenhum.
//
// O NOME SÓ VEM UMA VEZ, E ISSO MUDA TUDO
//
// A Apple devolve `fullName` apenas na PRIMEIRA autorização daquele Apple ID
// para este aplicativo. Da segunda em diante vem vazio, para sempre, mesmo
// reinstalando o app. Quem não guardar naquele instante nunca mais tem.
//
// Por isso o nome é gravado aqui, na hora, por `setDisplayName` — que desde
// a correção de sincronia escreve no cadastro, e não só no aparelho. Se
// ficasse só no aparelho, trocar de celular apagaria um dado que a Apple não
// devolve.

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { setDisplayName } from './userProfile';

export type ResultadoApple =
  | { ok: true; userId: string | null; sessao: unknown }
  | { ok: false; cancelado: boolean; erro?: string };

/**
 * Dá para usar a folha nativa da Apple aqui?
 *
 * Só no iPhone, e só quando o sistema suporta. Em todo o resto — navegador e
 * Android — o botão continua existindo, mas por outro caminho: o fluxo de
 * OAuth pelo navegador, o mesmo do Google.
 *
 * POR QUE O BOTÃO APARECE TAMBÉM FORA DO IPHONE
 *
 * Não é simetria bonita, é destrancar porta. Quem cria a conta com a Apple no
 * celular não tem senha: nunca escolheu uma. Se o botão existisse só no iOS,
 * essa pessoa abriria o Grão no notebook e não teria por onde entrar — o
 * Google é outra conta, e "esqueci minha senha" iria para um endereço
 * `@privaterelay.appleid.com` que ela talvez nem saiba que tem.
 */
export async function appleNativoDisponivel(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** O nome como a pessoa gostaria de ser chamada, a partir do que a Apple deu. */
function nomeDe(fullName: {
  givenName?: string | null;
  familyName?: string | null;
} | null): string | null {
  if (!fullName) return null;
  // Só o primeiro nome. O Grão chama pelo primeiro nome em toda a copy, e
  // "Bom dia, Lucas Henrique de Souza" soa como cobrança de banco.
  const primeiro = fullName.givenName?.trim();
  if (primeiro && primeiro.length >= 2) return primeiro;
  const ultimo = fullName.familyName?.trim();
  return ultimo && ultimo.length >= 2 ? ultimo : null;
}

/**
 * Abre a folha da Apple e troca o token dela por uma sessão do Supabase.
 *
 * O `identityToken` é um JWT assinado pela Apple. O Supabase valida a
 * assinatura do lado dele, então não há segredo nenhum viajando pelo app —
 * é por isso que este caminho não precisa de chave embutida, ao contrário do
 * fluxo de OAuth pelo navegador.
 */
export async function entrarComApple(): Promise<ResultadoApple> {
  if (!supabase) return { ok: false, cancelado: false, erro: 'Supabase não configurado' };

  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const credencial = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credencial.identityToken) {
      return { ok: false, cancelado: false, erro: 'A Apple não devolveu o token.' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credencial.identityToken,
    });
    if (error) return { ok: false, cancelado: false, erro: error.message };

    // Agora, antes de qualquer navegação: é a única janela em que o nome
    // existe. Falhar aqui custa o nome para sempre, então não fica para depois.
    const nome = nomeDe(credencial.fullName);
    if (nome) {
      try { await setDisplayName(nome); } catch { /* o nome será perguntado */ }
    }

    return { ok: true, userId: data.user?.id ?? null, sessao: data.session };
  } catch (e: any) {
    // Desistir não é erro: a pessoa tocou "Cancelar" na folha da Apple, e
    // mostrar uma mensagem vermelha para isso é repreender quem mudou de ideia.
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, cancelado: true };
    }
    return { ok: false, cancelado: false, erro: e?.message ?? 'Falha ao entrar com a Apple.' };
  }
}
