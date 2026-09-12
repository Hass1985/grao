// Entrega da semente do dia.
//
// A fonte da verdade é o BACKEND. A escolha local existe só como reserva para
// o modo demo (sem EXPO_PUBLIC_GRAO_API_URL) — ela espelha a lógica do
// servidor, mas usa a lista embutida no app, com um punhado de sementes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { todaySeed, pastSeeds, Seed, SeedType, EmotionalFamily } from '../data/seeds';
import { Channel, getProfile } from './profile';
import { API_URL, getUserId } from './aiClient';

/** Converte a resposta do backend para o formato que as telas usam. */
function daApi(j: any): Seed {
  // Assinante só com sinal explícito de plano pago.
  const confirmedPaid =
    j.tipo === 'semente' ||
    j.acesso?.completo === true ||
    j.assinante === true ||
    j.plano === 'plantio' ||
    j.plano === 'anual';

  const tipo: Seed['tipo'] = confirmedPaid ? 'semente' : 'devocional';
  const isFree = !confirmedPaid;

  const musicRaw =
    j.music && (j.music.title || j.music.artist)
      ? {
          title: j.music.title ?? '',
          artist: j.music.artist ?? '',
          spotifyUrl: j.music.spotifyUrl,
          youtubeUrl: j.music.youtubeUrl,
        }
      : null;

  return {
    id: j.id,
    date: j.data || j.date || new Date().toISOString().split('T')[0],
    tipo,
    title: j.title,
    type: (j.type as SeedType) || 'reflexão',
    family: (j.family as EmotionalFamily) || 'esperança',
    passage: j.passage,
    reference: j.reference,
    verse: j.verse,
    reflection: j.reflection || j.body || '',
    prayer: isFree ? null : j.prayer ?? null,
    practice: isFree ? null : j.practice ?? null,
    music: isFree ? null : musicRaw,
    planted: false,
    compartilhavel: j.compartilhavel,
    completa: isFree ? false : true,
    bloqueado: isFree
      ? j.bloqueado ?? { prayer: true, practice: true, music: true }
      : j.bloqueado ?? null,
  };
}

const MOMENT_KEY = 'grao.moment.v1';

const CHANNEL_TO_TYPE: Record<Channel, SeedType> = {
  visual: 'reflexão',
  auditivo: 'oração',
  sinestesico: 'prática',
};

export async function setMoment(family: EmotionalFamily): Promise<void> {
  await AsyncStorage.setItem(MOMENT_KEY, family);
}

export async function getMoment(): Promise<EmotionalFamily | null> {
  return (await AsyncStorage.getItem(MOMENT_KEY)) as EmotionalFamily | null;
}

export async function clearMoment(): Promise<void> {
  await AsyncStorage.removeItem(MOMENT_KEY);
}

export interface SeedSelection {
  seed: Seed;
  /** Devocional do dia já confirmado como lido (só no plano gratuito). */
  lido?: boolean;
  /** Linha em que o Grão retoma algo que a pessoa contou dias atrás. */
  ligacao?: string | null;
  family: EmotionalFamily;
  source: 'momento' | 'perfil' | 'padrão';
  channel: Channel;
}

async function contextoEmocional(): Promise<{
  family: EmotionalFamily;
  source: SeedSelection['source'];
  channel: Channel;
}> {
  const profile = await getProfile();
  const moment = await getMoment();
  const family: EmotionalFamily =
    moment || (profile?.emotionalHint as EmotionalFamily) || 'esperança';
  const source: SeedSelection['source'] = moment
    ? 'momento'
    : profile?.emotionalHint
      ? 'perfil'
      : 'padrão';
  const channel: Channel = profile?.sensory.dominant || 'visual';
  return { family, source, channel };
}

/** Semente local completa (fluxo pago de teste / demo sem assinatura). */
function sementeLocalPaga(
  family: EmotionalFamily,
  channel: Channel,
  source: SeedSelection['source']
): SeedSelection {
  const preferredType = CHANNEL_TO_TYPE[channel];
  const bank = pastSeeds.filter((s) => s.prayer && s.practice && s.music);
  const inFamily = bank.filter((s) => s.family === family);
  const byType = inFamily.find((s) => s.type === preferredType);
  const base = byType || inFamily[0] || bank[0] || pastSeeds[0];

  return {
    seed: {
      ...base,
      id: `test-pago-${base.id}`,
      date: new Date().toISOString().split('T')[0],
      tipo: 'semente',
      completa: true,
      bloqueado: null,
      compartilhavel:
        base.compartilhavel ||
        `${base.passage}\n\n${base.reference}\n\n${base.reflection}\n\nGrão`,
    },
    family,
    source,
    channel,
  };
}

/**
 * Escolhe a semente do dia com base no perfil-base e no momento atual.
 * No protótipo, seleciona sobre o banco local (todaySeed + pastSeeds).
 * Sempre respeita o paywall do servidor: free = devocional.
 */
export async function selectTodaySeed(): Promise<SeedSelection> {
  const { family, source, channel } = await contextoEmocional();

  if (API_URL) {
    try {
      const userId = await getUserId();
      const res = await fetch(`${API_URL}/seed/today/${userId}`);
      if (res.ok) {
        const j = await res.json();
        const seed = daApi(j);
        return {
          seed,
          family: (j.family as EmotionalFamily) || family,
          source: j.reason?.source ?? source,
          channel: (j.reason?.preferredType === 'oração'
            ? 'auditivo'
            : j.reason?.preferredType === 'prática'
              ? 'sinestesico'
              : channel) as Channel,
          lido: !!j.lido,
          ligacao: j.ligacao ?? null,
        };
      }
    } catch {
      // Rede fora: cai na escolha local.
    }
  }

  const preferredType = CHANNEL_TO_TYPE[channel];
  const bank: Seed[] = [todaySeed, ...pastSeeds];
  const inFamily = bank.filter((s) => s.family === family);
  const byType = inFamily.find((s) => s.type === preferredType);
  const base = byType || inFamily[0] || todaySeed;

  const free: Seed = {
    ...base,
    tipo: 'devocional',
    title: base.title || 'Devocional de hoje',
    prayer: null,
    practice: null,
    music: null,
    completa: false,
    bloqueado: { prayer: true, practice: true, music: true },
    compartilhavel:
      base.compartilhavel ||
      `${base.passage}\n\n${base.reference}\n\n${base.reflection}\n\nGrão`,
  };

  return {
    seed: free,
    family,
    source,
    channel,
  };
}

/**
 * A página do devocional anual de hoje, que agora mora na Raiz.
 *
 * Rota própria porque `/seed/today` decide pelo acesso: para quem assina, ela
 * devolve a semente, e o devocional ficaria inalcançável. Ele não é o consolo
 * de quem não paga — é outro material, e vale para os dois planos.
 */
export async function devocionalDeHoje(): Promise<
  { seed: Seed; lido: boolean } | null
> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/devocional/${userId}/hoje`);
    if (!res.ok) return null;
    const j = await res.json();
    return { seed: daApi(j), lido: !!j.lido };
  } catch {
    return null;
  }
}

/**
 * Contei um momento novo — escolhe outra semente para hoje.
 *
 * A semente do dia é travada na primeira entrega, de propósito: abrir o app não
 * pode trocar o que já foi lido. Mas quem acabou de contar como está, ou de
 * dizer que está passando por outra coisa, fez um gesto — e o gesto precisa
 * chegar na tela, senão o app aceita o que a pessoa disse e mostra a mesma
 * coisa de antes.
 *
 * Silenciosa de propósito: quem chama já vai recarregar a tela em seguida, e
 * uma falha aqui no máximo mantém a semente que já estava lá.
 */
export async function reescolherSementeDeHoje(dados: {
  familia?: EmotionalFamily | null;
  relato?: string | null;
}): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/seed/today/${userId}/reescolher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familia: dados.familia ?? undefined, relato: dados.relato ?? undefined }),
    });
    if (!res.ok) return false;
    const j = await res.json();
    return !!j.trocou;
  } catch {
    return false;
  }
}

/**
 * A semente REAL do plano pago, na tela de teste.
 *
 * Pede ao motor a semente que a pessoa receberia se assinasse: mesma escolha,
 * mesma regra de variedade, mesma curadoria, com oração, prática e louvor. É
 * teste de verdade — semente de mentira não testa nada.
 *
 * A família vem da conversa de teste e vai no pedido; nada é gravado no
 * momento emocional da pessoa, então a tela Hoje segue no devocional do dia.
 *
 * Se o servidor não responder, cai no banco local: uma demonstração não pode
 * quebrar na frente de alguém por causa da rede.
 */
export async function selectSementeTeste(
  familyOverride?: EmotionalFamily | null,
  relato?: string | null
): Promise<SeedSelection & { restantesHoje?: number }> {
  const ctx = await contextoEmocional();
  const family = familyOverride ?? ctx.family;
  const source = familyOverride ? 'momento' : ctx.source;

  if (API_URL) {
    try {
      const userId = await getUserId();
      // O relato vai no pedido, não no cadastro: é o que a curadoria lê para
      // escolher, e some depois disso. Sem ele, a demonstração testaria a fila
      // do acervo em vez do motor — e é o motor que está em teste.
      const res = await fetch(`${API_URL}/seed/experimentar/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family, relato: relato ?? null }),
      });
      if (res.ok) {
        const j = await res.json();
        const real = daApi(j);
        if (real.prayer && real.practice) {
          return {
            seed: { ...real, tipo: 'semente', completa: true, bloqueado: null },
            family: (j.family as EmotionalFamily) || family,
            source,
            channel: ctx.channel,
            restantesHoje: j.restantesHoje,
          };
        }
      }
    } catch {
      // Cai no banco local.
    }
  }

  return sementeLocalPaga(family, ctx.channel, source);
}

/**
 * Confirma a leitura do devocional de hoje.
 *
 * É o gesto que dá história ao plano gratuito: é ele que marca o dia no Campo
 * e guarda a página na Raiz. Sem ele, o Campo é um calendário onde nada
 * acontece e a Raiz mostra o ano inteiro como se tudo já tivesse sido lido.
 */
export async function confirmarLeitura(): Promise<{ totalLidos: number } | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/devocional/${userId}/lido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return { totalLidos: j.totalLidos ?? 0 };
  } catch {
    return null;
  }
}

export interface ResumoLeitura {
  total: number;
  sequencia: number;
  maiorSequencia: number;
  ultimoLido: string | null;
}

/** Sequência e total de dias lidos — os dois números do topo do Campo. */
export async function resumoDeLeitura(): Promise<ResumoLeitura | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/devocional/${userId}/resumo`);
    if (!res.ok) return null;
    return (await res.json()) as ResumoLeitura;
  } catch {
    return null;
  }
}

/**
 * "Esta semente falou com você?"
 *
 * Silenciosa de propósito: se a rede falhar, a pessoa não precisa saber que a
 * opinião dela não chegou — ela já fez a parte dela ao responder.
 */
export async function avaliarSemente(seedId: string, util: boolean): Promise<void> {
  if (!API_URL) return;
  try {
    const userId = await getUserId();
    await fetch(`${API_URL}/seed/${encodeURIComponent(seedId)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, util }),
    });
  } catch {
    /* segue o fluxo */
  }
}

/**
 * A semente de hoje da demonstração, só para reler.
 *
 * Não pede semente nova nem gasta do teto diário: é a mesma que já foi
 * entregue. Devolve null quando ainda não houve nenhuma hoje.
 */
export async function sementeTesteDeHoje(): Promise<Seed | null> {
  if (!API_URL) return null;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/seed/experimentar/${userId}/hoje`);
    if (!res.ok) return null;
    const real = daApi(await res.json());
    return { ...real, tipo: 'semente', completa: true, bloqueado: null };
  } catch {
    return null;
  }
}

/** Histórico só da demonstração do plano pago — Campo e Raiz do modo teste. */
export async function fetchHistoricoTeste(): Promise<Seed[]> {
  if (!API_URL) return [];
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/seed/experimentar/${userId}/historico`);
    if (!res.ok) return [];
    const lista = await res.json();
    if (!Array.isArray(lista)) return [];
    return lista.map((j: any) => ({
      ...daApi(j),
      date: j.date || j.data,
      planted: !!j.planted,
    }));
  } catch {
    return [];
  }
}

/**
 * Histórico real de sementes entregues — Campo e Raiz.
 */
export async function fetchHistory(): Promise<Seed[]> {
  if (!API_URL) return pastSeeds;
  try {
    const userId = await getUserId();
    const res = await fetch(`${API_URL}/seeds/history/${userId}`);
    if (!res.ok) return pastSeeds;
    const lista = await res.json();
    if (!Array.isArray(lista)) return pastSeeds;
    return lista.map((j: any) => ({
      ...daApi(j),
      date: j.date || j.data,
      planted: !!j.planted,
    }));
  } catch {
    return pastSeeds;
  }
}
