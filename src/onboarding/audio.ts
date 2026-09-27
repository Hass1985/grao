// Gravar e transcrever no aplicativo nativo.
//
// O QUE ISTO CONSERTA
//
// A tela do relato decidia se dava para falar assim:
//
//   const SR = !NATIVE && window.SpeechRecognition;
//
// `SpeechRecognition` é do NAVEGADOR. No iOS e no Android não existe, e a
// própria linha já se desligava com `!NATIVE`. Resultado: quem abrisse o
// aplicativo das lojas caía direto no modo escrito, sem microfone e sem aviso
// nenhum — num produto cuja promessa é "me conta como você está, pode ser por
// áudio". A pessoa que mais precisa do Grão é justamente a que menos digita.
//
// COMO FUNCIONA
//
// Grava com expo-audio, manda o arquivo para o servidor e recebe o texto. O
// servidor já sabia transcrever: é o mesmo caminho do áudio do WhatsApp, em
// server/src/transcricao.ts, rodando em produção desde setembro.
//
// A web continua com o reconhecimento do navegador, que é gratuito e
// instantâneo. Trocar os dois por este caminho deixaria o comportamento igual
// em todo lugar — inclusive no Firefox, onde hoje não há microfone nenhum —,
// mas passaria a custar por áudio. Fica para quando alguém reclamar.

import { Platform } from 'react-native';
import { API_URL, getUserId, tokenDaSessao } from './aiClient';

export const NATIVO = Platform.OS !== 'web';

/**
 * Teto de espera do upload mais a transcrição.
 *
 * Generoso de propósito: a pessoa acabou de falar um minuto sobre o que está
 * vivendo, e desistir aos 20 segundos faria ela achar que o Grão não ouviu.
 */
const TIMEOUT_MS = 90_000;

/**
 * O arquivo gravado vira texto.
 *
 * Devolve null quando não deu — serviço fora do ar, áudio mudo, rede ruim.
 * Quem chama oferece o modo escrito, exatamente como o WhatsApp faz quando a
 * transcrição falha: o áudio é um conforto, não um pré-requisito.
 */
export async function transcreverAudio(uri: string): Promise<string | null> {
  if (!API_URL) return null;

  try {
    // expo/fetch, e não o fetch global: só ele aceita o File do expo-file-system
    // como corpo. O import é dinâmico para a web nunca carregar isso.
    const { fetch: fetchNativo } = await import('expo/fetch');
    const { File } = await import('expo-file-system');

    const userId = await getUserId();
    const token = await tokenDaSessao();
    const arquivo = new File(uri);

    const res = await fetchNativo(`${API_URL}/transcrever/${userId}`, {
      method: 'POST',
      headers: {
        // m4a é o que o preset do expo-audio grava. O servidor repassa este
        // tipo ao serviço de transcrição, que decide o decodificador por ele.
        'Content-Type': 'audio/m4a',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: arquivo as any,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn('[audio] servidor recusou a transcrição:', res.status);
      return null;
    }
    const j = await res.json();
    const texto = typeof j?.texto === 'string' ? j.texto.trim() : '';
    return texto.length >= 2 ? texto : null;
  } catch (e: any) {
    console.warn('[audio] falha ao transcrever:', e?.message ?? e);
    return null;
  }
}
