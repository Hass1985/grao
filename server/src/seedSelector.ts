import { pool, getProfile, getMoment } from './db.js';

// Canal sensorial → formato de semente preferido.
// Visual: palavra para ver e reler. Auditivo: oração/voz. Sinestésico: prática/gesto.
const CHANNEL_TO_TYPE: Record<string, string> = {
  visual: 'reflexão',
  auditivo: 'oração',
  sinestesico: 'prática',
};

/**
 * Janela de proteção contra repetição: nenhuma semente semelhante à que a
 * pessoa recebeu nos últimos N dias pode ser entregue.
 *
 * "Semelhante" tem dois sentidos, e os dois valem:
 *  - mesmo GESTO físico (seeds.gesture) — repetição que a pessoa sente no
 *    corpo, ainda que as palavras sejam outras;
 *  - par registrado em seed_similar — prática ou abertura lexicalmente
 *    próximas.
 *
 * O requisito de produto é no mínimo 5 dias; usamos 7 para ter margem, já que
 * a entrega nem sempre é diária (a pessoa pode pular dias) e a contagem é por
 * data de entrega, não por sementes consecutivas.
 */
const COOLDOWN_DIAS = 7;

export interface SelectedSeed {
  id: string;
  family: string;
  type: string;
  passage: string;
  reference: string;
  reflection: string;
  prayer: string;
  practice: string;
  music: { title?: string; artist?: string; spotifyUrl?: string; youtubeUrl?: string };
  reason: { family: string; source: 'momento' | 'perfil' | 'padrão'; preferredType: string };
}

/**
 * Escolhe a semente do dia para o usuário, priorizando:
 *  1. família emocional = momento manual (se definido) senão o emotional_hint do perfil
 *  2. formato preferido pelo canal sensorial dominante
 *  3. sementes ainda não entregues
 */
/**
 * A semente JÁ entregue hoje, se houver — sem escolher outra.
 *
 * O app e o WhatsApp precisam mostrar a MESMA semente. Antes, cada consulta a
 * /seed/today sorteava uma nova e registrava mais uma entrega: quem recebia
 * pelo WhatsApp e abria o app via duas sementes diferentes, e cada abertura
 * consumia uma das 380.
 *
 * "Hoje" é no fuso do usuário, não em UTC — senão a semente trocaria no meio
 * da noite brasileira.
 */
export async function getTodaySeed(userId: string): Promise<SelectedSeed | null> {
  const { rows } = await pool.query(
    `SELECT s.* FROM seed_deliveries d
       JOIN seeds s ON s.id = d.seed_id
       JOIN users u ON u.id = d.user_id
      WHERE d.user_id = $1
        AND (d.delivered_at AT TIME ZONE u.timezone)::date
          = (now() AT TIME ZONE u.timezone)::date
      ORDER BY d.id DESC LIMIT 1`, [userId]);

  if (!rows.length) return null;
  const s = rows[0];
  return {
    id: s.id, family: s.family, type: s.type,
    passage: s.passage, reference: s.reference,
    reflection: s.reflection, prayer: s.prayer, practice: s.practice,
    music: {
      title: s.music_title || undefined, artist: s.music_artist || undefined,
      spotifyUrl: s.music_spotify || undefined, youtubeUrl: s.music_youtube || undefined,
    },
    reason: { family: s.family, source: 'momento', preferredType: s.type },
  };
}

/**
 * A família que RESPONDE a cada estado, quando é hora de arejar.
 *
 * Quem está ansioso precisa de palavra sobre ansiedade, sim. Mas dez dias
 * seguidos de sementes de ansiedade param de acolher e viram espelho: o app
 * repete todo dia que a pessoa está ansiosa. O que ela também precisa ouvir é
 * a resposta ao que sente, e é isso que estas famílias trazem.
 *
 * Não é troca de assunto: é a mesma conversa, vista do outro lado.
 */
const COMPLEMENTOS: Record<string, string[]> = {
  ansiedade: ['paz', 'fé', 'esperança'],
  solidão: ['fé', 'esperança', 'paz'],
  luto: ['esperança', 'paz', 'fé'],
  culpa: ['paz', 'gratidão', 'fé'],
  medo: ['fé', 'paz', 'esperança'],
  paz: ['gratidão', 'alegria', 'propósito'],
  esperança: ['fé', 'alegria', 'propósito'],
  fé: ['esperança', 'propósito', 'paz'],
  gratidão: ['alegria', 'propósito', 'paz'],
  alegria: ['gratidão', 'propósito', 'paz'],
  propósito: ['fé', 'esperança', 'gratidão'],
};

/**
 * Quantas das últimas 4 entregas podem ser da mesma família antes de arejar.
 *
 * 2 de 4 mantém o momento emocional como assunto dominante sem deixar a
 * pessoa presa nele. O ritmo que sai é mais ou menos A A P F E A A: o estado
 * dela continua sendo o centro, mas a resposta aparece no meio.
 */
const MAX_MESMA_FAMILIA = 2;
const JANELA_VARIEDADE = 4;

/**
 * Escolhe a família da vez: a do momento, ou um complemento quando ela já
 * dominou as últimas entregas.
 *
 * A monotonia não era hipótese. No teste, uma pessoa recebeu DEZ sementes
 * seguidas de ansiedade, porque o momento dela estava fixo nisso e a primeira
 * tentativa do seletor filtra pela família. A base tem 39 de cada família, ou
 * seja, o quadro se manteria por mais de um mês.
 */
async function familiaDaVez(userId: string, alvo: string): Promise<{ family: string; arejou: boolean }> {
  const { rows: ultimas } = await pool.query(
    `SELECT s.family FROM seed_deliveries d
       JOIN seeds s ON s.id = d.seed_id
      WHERE d.user_id = $1
      ORDER BY d.id DESC LIMIT $2`, [userId, JANELA_VARIEDADE]);

  const recentes = ultimas.map((r: any) => r.family);
  if (recentes.filter((f: string) => f === alvo).length < MAX_MESMA_FAMILIA) {
    return { family: alvo, arejou: false };
  }

  // Entre os complementos, o que está parado há mais tempo. Sem este critério
  // a rotação encostaria sempre no mesmo complemento e trocaria uma monotonia
  // por outra.
  const opcoes = COMPLEMENTOS[alvo] ?? [];
  if (!opcoes.length) return { family: alvo, arejou: false };

  const { rows: [escolhida] } = await pool.query(
    `SELECT f.family
       FROM unnest($2::text[]) AS f(family)
       LEFT JOIN LATERAL (
         SELECT max(d.id) ultimo FROM seed_deliveries d
           JOIN seeds s ON s.id = d.seed_id
          WHERE d.user_id = $1 AND s.family = f.family
       ) u ON true
      ORDER BY u.ultimo ASC NULLS FIRST
      LIMIT 1`, [userId, opcoes]);

  return { family: escolhida?.family ?? alvo, arejou: !!escolhida };
}

/**
 * A semente do dia: a que já foi escolhida hoje, ou uma nova.
 *
 * Existe porque escolher e ENVIAR deixaram de ser a mesma coisa. Quem abre o
 * app antes do horário faz a escolha do dia; a agenda, mais tarde, precisa
 * mandar ESSA semente pelo WhatsApp, e não sortear outra nem desistir por já
 * existir uma linha gravada. Era esse desencontro que fazia a mensagem sumir
 * justamente para quem usava mais o app.
 *
 * `jaExistia` diz a quem chamou se a linha é dele: só quem criou pode desfazer
 * em caso de falha no envio.
 */
export async function getOrSelectTodaySeed(
  userId: string,
): Promise<{ seed: SelectedSeed; jaExistia: boolean } | null> {
  const deHoje = await getTodaySeed(userId);
  if (deHoje) return { seed: deHoje, jaExistia: true };
  const nova = await selectSeedForUser(userId);
  return nova ? { seed: nova, jaExistia: false } : null;
}

export async function selectSeedForUser(userId: string): Promise<SelectedSeed | null> {
  const profile = await getProfile(userId);
  const moment = await getMoment(userId);

  const alvo = moment || profile?.emotional_hint || 'esperança';
  const { family, arejou } = await familiaDaVez(userId, alvo);
  const source: SelectedSeed['reason']['source'] = moment ? 'momento' : profile?.emotional_hint ? 'perfil' : 'padrão';
  const channel = profile?.dominant_channel || 'visual';
  const preferredType = CHANNEL_TO_TYPE[channel] || 'reflexão';
  if (arejou) console.log(`[seleção] ${userId}: ${alvo} dominou as últimas entregas, arejando com ${family}`);

  // Duas leituras do histórico do usuário:
  //  gesto_ultimo — quando cada gesto foi entregue pela última vez (FILTRO);
  //  gesto_restante — quantas sementes inéditas ainda existem de cada gesto
  //                   (ORDENAÇÃO).
  //
  // A ordenação por "mais restantes primeiro" é o que sustenta a garantia por
  // um ano inteiro. O gesto mais abundante da base tem 60 sementes e a janela
  // só permite uma a cada COOLDOWN_DIAS: se ele não for escalonado desde o
  // começo, sobra um bolo dele no fim do ano e não há candidato elegível.
  // É o mesmo raciocínio de reorganizar uma fila para que itens iguais nunca
  // fiquem vizinhos — sempre gaste primeiro o que tem mais.
  const GESTOS_USADOS = `
    WITH gesto_ultimo AS (
      SELECT r.gesture, max(d.delivered_at) ultimo
        FROM seed_deliveries d JOIN seeds r ON r.id = d.seed_id
       WHERE d.user_id = $1 AND r.gesture IS NOT NULL
       GROUP BY r.gesture
    ),
    gesto_restante AS (
      SELECT s2.gesture, count(*)::int n
        FROM seeds s2
       WHERE s2.gesture IS NOT NULL
         AND s2.id NOT IN (SELECT seed_id FROM seed_deliveries WHERE user_id = $1)
       GROUP BY s2.gesture
    )`;

  // Elegibilidade: gesto fora da janela E nenhum par semelhante recente.
  const SEM_REPETICAO = `
        AND (g.ultimo IS NULL OR g.ultimo <= now() - ($4::int * interval '1 day'))
        AND NOT EXISTS (
              SELECT 1 FROM seed_deliveries d
                JOIN seed_similar sim ON sim.seed_id = d.seed_id
               WHERE d.user_id = $1
                 AND d.delivered_at > now() - ($4::int * interval '1 day')
                 AND sim.similar_id = s.id)`;

  // Gesto com mais sementes inéditas primeiro; empate desfeito pelo gesto
  // parado há mais tempo.
  const ORDEM_GESTO = `rem.n DESC NULLS LAST, g.ultimo ASC NULLS FIRST`;

  // 1ª tentativa: família-alvo, formato do canal, inédita E sem repetição.
  const params = [userId, family, preferredType, COOLDOWN_DIAS];
  let { rows } = await pool.query(
    `${GESTOS_USADOS}
     SELECT s.* FROM seeds s
       LEFT JOIN gesto_ultimo g ON g.gesture = s.gesture
       LEFT JOIN gesto_restante rem ON rem.gesture = s.gesture
      WHERE s.family = $2
        AND s.id NOT IN (SELECT seed_id FROM seed_deliveries WHERE user_id = $1)
        ${SEM_REPETICAO}
      ORDER BY ${ORDEM_GESTO}, (s.type = $3) DESC, random()
      LIMIT 1`,
    params
  );

  // 2ª: qualquer família, ainda com a garantia de não repetição.
  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `${GESTOS_USADOS}
       SELECT s.* FROM seeds s
         LEFT JOIN gesto_ultimo g ON g.gesture = s.gesture
         LEFT JOIN gesto_restante rem ON rem.gesture = s.gesture
        WHERE s.id NOT IN (SELECT seed_id FROM seed_deliveries WHERE user_id = $1)
          ${SEM_REPETICAO}
        ORDER BY (s.family = $2) DESC, ${ORDEM_GESTO}, (s.type = $3) DESC, random()
        LIMIT 1`,
      params
    ));
  }

  // 3ª: relaxa a janela de proteção, mas mantém o ineditismo. Só chega aqui
  // quem tem histórico atípico (muitas entregas em poucos dias); é melhor
  // entregar uma semente inédita parecida do que repetir uma já vista.
  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `SELECT s.* FROM seeds s
        WHERE s.id NOT IN (SELECT seed_id FROM seed_deliveries WHERE user_id = $1)
        ORDER BY (s.family = $2) DESC, (s.type = $3) DESC, random()
        LIMIT 1`,
      [userId, family, preferredType]
    ));
  }

  // 4ª: já viu as 380 — repete a mais alinhada ao momento/canal.
  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `SELECT s.* FROM seeds s
        WHERE s.family = $1
        ORDER BY (s.type = $2) DESC, random()
        LIMIT 1`,
      [family, preferredType]
    ));
  }

  if (rows.length === 0) return null;
  const s = rows[0];

  await pool.query(
    `INSERT INTO seed_deliveries (user_id, seed_id) VALUES ($1, $2)`,
    [userId, s.id]
  );

  return {
    id: s.id,
    family: s.family,
    type: s.type,
    passage: s.passage,
    reference: s.reference,
    reflection: s.reflection,
    prayer: s.prayer,
    practice: s.practice,
    music: {
      title: s.music_title || undefined,
      artist: s.music_artist || undefined,
      spotifyUrl: s.music_spotify || undefined,
      youtubeUrl: s.music_youtube || undefined,
    },
    reason: { family, source, preferredType },
  };
}
