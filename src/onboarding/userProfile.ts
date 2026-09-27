// Dados de exibição do usuário: foto, nome e desde quando ele é do Grão.
//
// ONDE ISSO MORA, E POR QUÊ MUDOU
//
// Morava tudo em AsyncStorage, que é o armazenamento DAQUELE aparelho: o
// sandbox do app no celular, o localStorage no navegador. Dois cofres que
// nunca se falaram. Quem punha a foto pelo iPhone e entrava pelo notebook
// achava o perfil vazio; quem trocava de celular era recebido pela tela que
// pergunta o nome, depois de meses usando o Grão; e o "membro desde" contava a
// primeira vez que aquele navegador abriu o app, não a entrada da pessoa.
//
// Agora o cadastro é o original e o AsyncStorage é CACHE. O que ele guarda
// continua valendo para a tela abrir rápido e para funcionar sem rede — só
// deixou de ser a única cópia.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from './profile';

const AVATAR_KEY = 'grao.avatarUri.v1';
/** Carimbo do servidor correspondente à foto em cache. Ver sincronizarPerfil. */
const AVATAR_EM_KEY = 'grao.avatarEm.v1';
const NAME_KEY = 'grao.displayName.v1';
const MEMBER_KEY = 'grao.memberSince.v1';

type Listener = () => void;
const avatarListeners = new Set<Listener>();

/** Avisa ProfileButton (e outros) quando a foto muda. */
export function subscribeAvatar(listener: Listener): () => void {
  avatarListeners.add(listener);
  return () => {
    avatarListeners.delete(listener);
  };
}

function notifyAvatar() {
  avatarListeners.forEach((l) => l());
}

export async function getAvatarUri(): Promise<string | null> {
  return AsyncStorage.getItem(AVATAR_KEY);
}

/**
 * Guarda a foto: no aparelho agora, no cadastro logo em seguida.
 *
 * A ordem importa. O cache primeiro faz a foto aparecer na tela no mesmo
 * instante em que a pessoa escolheu — ela não fica olhando um círculo vazio
 * esperando a rede. A subida vem depois e pode falhar sem estragar o gesto: na
 * próxima abertura com rede, `sincronizarPerfil` encontra a divergência e
 * resolve.
 */
export async function setAvatarUri(uri: string | null): Promise<void> {
  if (uri) await AsyncStorage.setItem(AVATAR_KEY, uri);
  else await AsyncStorage.multiRemove([AVATAR_KEY, AVATAR_EM_KEY]);
  notifyAvatar();

  try {
    const { enviarFoto, apagarFoto } = await import('./foto');
    if (uri) {
      const em = await enviarFoto(uri);
      if (em) await AsyncStorage.setItem(AVATAR_EM_KEY, em);
    } else {
      await apagarFoto();
    }
  } catch {
    // Sem rede a foto fica só aqui, e a próxima sincronia leva.
  }
}

/**
 * Traz do cadastro o que este aparelho ainda não tem: foto, nome e entrada.
 *
 * Uma chamada só — `/preferencias` já devolve os três. A foto vem por fora e
 * só quando o carimbo do servidor difere do que está em cache: sem essa
 * comparação, abrir o perfil baixaria a mesma imagem toda vez.
 *
 * Devolve true quando alguma coisa mudou, para quem chama redesenhar.
 */
export async function sincronizarPerfil(
  jaLidas?: { nome: string | null; fotoEm: string | null; membroDesde: string | null } | null,
): Promise<boolean> {
  let mudou = false;
  try {
    // Quem já buscou as preferências passa as suas: a tela de ajustes lê essa
    // mesma resposta para o horário, e pedir duas vezes seria pedir duas vezes.
    const pref = jaLidas ?? (await (await import('./assinatura')).minhasPreferencias());
    if (!pref) return false;

    const nome = pref.nome?.trim();
    if (nome && nome !== (await AsyncStorage.getItem(NAME_KEY))) {
      await AsyncStorage.setItem(NAME_KEY, nome);
      mudou = true;
    }

    if (pref.membroDesde) {
      await AsyncStorage.setItem(MEMBER_KEY, pref.membroDesde);
    }

    const emCache = await AsyncStorage.getItem(AVATAR_EM_KEY);
    if (pref.fotoEm && pref.fotoEm !== emCache) {
      const { baixarFoto } = await import('./foto');
      const uri = await baixarFoto();
      if (uri) {
        await AsyncStorage.setItem(AVATAR_KEY, uri);
        await AsyncStorage.setItem(AVATAR_EM_KEY, pref.fotoEm);
        notifyAvatar();
        mudou = true;
      }
    } else if (!pref.fotoEm && emCache) {
      // Apagada noutro aparelho: apagar aqui também é o que "sincronizado"
      // significa, mesmo quando a direção é subtrair.
      await AsyncStorage.multiRemove([AVATAR_KEY, AVATAR_EM_KEY]);
      notifyAvatar();
      mudou = true;
    }
  } catch {
    // Sem rede o aparelho segue com o que tem. É exatamente para isso que o
    // cache existe.
  }
  return mudou;
}

export async function getDisplayName(): Promise<string> {
  const override = await AsyncStorage.getItem(NAME_KEY);
  if (override) return override;
  const profile = await getProfile();
  return profile?.name || 'Você';
}

/**
 * A pessoa já disse como quer ser chamada?
 *
 * Pergunta ao aparelho e, se ele não souber, ao servidor.
 *
 * A segunda pergunta é o conserto. O nome só morava em AsyncStorage, então
 * quem entrasse noutro celular, trocasse de navegador ou limpasse os dados era
 * recebido por "Sua conta está pronta. Como você gosta de ser chamado?" —
 * depois de meses usando o Grão. Num produto que promete lembrar de você, é a
 * pergunta que mais desmente a promessa.
 *
 * Quando o servidor sabe, o nome é gravado aqui também: da próxima vez a
 * abertura não depende da rede.
 */
export async function hasDisplayName(): Promise<boolean> {
  const override = await AsyncStorage.getItem(NAME_KEY);
  if (override && override.trim()) return true;

  try {
    const { minhasPreferencias } = await import('./assinatura');
    // Com teto de espera, e o teto não é zelo: esta pergunta acontece ANTES da
    // primeira tela, e a abertura do app fica parada até ela responder. Sem
    // limite, uma rede ruim — ou uma API fora do ar — deixaria o Grão numa
    // tela preta por tempo indeterminado, sem erro e sem saída. Passou de três
    // segundos, seguimos sem o servidor: o pior caso vira perguntar o nome de
    // novo, que é chato, em vez de não abrir, que é fatal.
    const pref = await Promise.race([
      minhasPreferencias(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    const remoto = pref?.nome?.trim();
    if (remoto) {
      await AsyncStorage.setItem(NAME_KEY, remoto);
      return true;
    }
  } catch {
    // Sem rede a tela do nome aparece, e é o comportamento certo: melhor
    // perguntar do que travar a abertura esperando uma resposta que não vem.
  }
  return false;
}

/** Grava o nome no aparelho e no servidor. O servidor é o que sobrevive. */
export async function setDisplayName(name: string): Promise<void> {
  const v = name.trim();
  if (v) await AsyncStorage.setItem(NAME_KEY, v);
  else await AsyncStorage.removeItem(NAME_KEY);

  if (!v) return;
  try {
    const { salvarNome } = await import('./assinatura');
    await salvarNome(v);
  } catch {
    // Falha de rede não pode travar quem acabou de escrever o próprio nome.
    // Ele fica no aparelho, e a próxima gravação leva para o servidor.
  }
}

const DEVOCIONAL_OPTIN_KEY = 'grao.devocional.optin.v1';

export async function hasDevocionalOptIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEVOCIONAL_OPTIN_KEY)) === '1';
}

export async function setDevocionalOptIn(aceito = true): Promise<void> {
  if (aceito) await AsyncStorage.setItem(DEVOCIONAL_OPTIN_KEY, '1');
  else await AsyncStorage.removeItem(DEVOCIONAL_OPTIN_KEY);
}

/**
 * Desde quando a pessoa é do Grão.
 *
 * Era a primeira vez que o app abriu NAQUELE aparelho — então o notebook
 * anunciava que alguém de três meses de casa tinha chegado hoje. A data certa
 * é `users.created_at`, que existe desde o primeiro dia e vem em
 * `/preferencias`; `sincronizarPerfil` a grava aqui.
 *
 * A gravação local continua, como último recurso para quem ainda não
 * sincronizou — mas deixa de ser a fonte.
 */
export async function getMemberSince(): Promise<string> {
  let iso = await AsyncStorage.getItem(MEMBER_KEY);
  if (!iso) {
    iso = new Date().toISOString();
    await AsyncStorage.setItem(MEMBER_KEY, iso);
  }
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
