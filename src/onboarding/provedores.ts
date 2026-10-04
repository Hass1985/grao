// Quais formas de entrar estão REALMENTE ligadas.
//
// O QUE ISTO EVITA
//
// O botão "Continuar com a Apple" existe no código antes de a Apple estar
// configurada no Supabase — e tem que existir, senão não dá para construir
// nada antes das credenciais saírem. Só que, enquanto não estiver ligada,
// tocar nele levava a pessoa para fora do app, numa página branca com isto:
//
//   {"code":400,"error_code":"validation_failed",
//    "msg":"Unsupported provider: provider is not enabled"}
//
// Fora do aplicativo, em inglês, em JSON cru, sem botão de voltar. Para quem
// está criando conta num devocional, essa tela não diz "o desenvolvedor ainda
// não terminou" — diz "quebrou, e a culpa pode ser minha".
//
// POR QUE PERGUNTAR EM VEZ DE USAR UMA CHAVE DE CONFIGURAÇÃO
//
// Uma variável de ambiente resolveria, e seria mais uma coisa para alguém
// lembrar de virar no dia certo — e esquecer. O Supabase já publica a
// resposta em `/auth/v1/settings`: é só perguntar. No instante em que a Apple
// for ligada no painel, o botão aparece sozinho, sem build novo.

const URL_BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '') || '';
const CHAVE =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  '';

export interface Provedores {
  apple: boolean;
  google: boolean;
}

/**
 * O padrão quando não dá para perguntar.
 *
 * Google ligado, Apple desligada: é o estado conhecido e seguro. Errar para o
 * lado de mostrar um botão a menos custa um caminho alternativo; errar para o
 * lado de mostrar um que não funciona custa a confiança de quem tocou nele.
 */
const PADRAO: Provedores = { apple: false, google: true };

let cache: Provedores | null = null;
let voando: Promise<Provedores> | null = null;

export async function provedoresLigados(): Promise<Provedores> {
  if (cache) return cache;
  // Duas telas perguntando ao mesmo tempo fazem uma chamada só.
  if (voando) return voando;
  if (!URL_BASE || !CHAVE) return PADRAO;

  voando = (async () => {
    try {
      const res = await fetch(`${URL_BASE}/auth/v1/settings`, {
        headers: { apikey: CHAVE },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return PADRAO;
      const j = await res.json();
      const ext = j?.external ?? {};
      cache = { apple: !!ext.apple, google: !!ext.google };
      return cache;
    } catch {
      return PADRAO;
    } finally {
      voando = null;
    }
  })();

  return voando;
}
