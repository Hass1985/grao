// A agenda de entrega: quem recebe a semente agora.
//
// Antes eram quatro disparos por dia, um por janela, acionados pelo cron do
// GitHub. Com horário escolhido pela pessoa isso não serve mais — e o cron do
// GitHub muito menos: as execuções agendadas dele chegam a atrasar duas horas
// em horário de pico, o que é irrelevante para uma janela de 4 horas e fatal
// para quem pediu 6h45.
//
// Então a agenda passa a morar aqui dentro, varrendo de minuto em minuto. O
// serviço no Render fica de pé o tempo todo, e o cron do GitHub continua como
// batimento de reserva, de hora em hora, para o caso de o processo cair.
//
// A varredura é IDEMPOTENTE por construção: ela só enxerga quem ainda não
// recebeu a mensagem de hoje (no fuso da própria pessoa). Rodar duas vezes no
// mesmo minuto, ou rodar depois de uma queda, não duplica nada.
//
// O critério é sent_wa_at, não "existe entrega hoje". A diferença derrubou a
// entrega uma vez: abrir o app grava a semente do dia, e a agenda concluía que
// já tinha mandado. Quem usava mais o app recebia menos mensagem.
//
// O WhatsApp é do plano pago: o JOIN com subscriptions é o que garante isso.
// Fosse um filtro no envio, em vez de na busca, uma assinatura vencida ainda
// consumiria template da Meta antes de alguém perceber.

import { pool, logEvent } from './db.js';
import { entregarSemente } from './whatsapp.js';
import { metaConfigurada } from './meta.js';
import { TEM_ACESSO_SQL } from './acesso.js';
import { avisarCobrancasProximas } from './cobranca.js';
import { faxinaDiaria } from './retencao.js';

/** De quanto em quanto tempo a agenda acorda. */
const INTERVALO_MS = 60_000;

/**
 * Quantas entregas correm ao mesmo tempo.
 *
 * Limitado pelo pool do Postgres (PG_POOL_MAX, 10 por padrão), não pela Meta:
 * o throughput STANDARD da Cloud API aceita 80 mensagens por segundo, muito
 * acima disso. Deixar uma conexão de folga evita que a varredura monopolize o
 * pool e trave as requisições do aplicativo que chegam no mesmo instante.
 */
const LARGURA_ENTREGA = Number(process.env.GRAO_LARGURA_ENTREGA ?? 8);

/**
 * Atraso máximo tolerado.
 *
 * Se o processo ficou fora do ar, entregar a semente das 7h às 22h é pior do
 * que não entregar: chega fora de hora, longe da rotina que a pessoa desenhou,
 * e o botão "Plantar" já não encontra ninguém. Passou disso, o dia é perdido e
 * amanhã volta no horário certo.
 *
 * A conta é feita como diferença entre dois horários do MESMO dia local. Quem
 * escolhe 23h50 e é varrido à 00h10 fica com diferença negativa e não recebe —
 * correto, porque já é outro dia para essa pessoa.
 */
const ATRASO_MAXIMO_HORAS = 3;

/**
 * Trava entre instâncias.
 *
 * Duas cópias do serviço varrendo ao mesmo tempo mandariam a mesma semente
 * duas vezes: o registro da entrega e o envio não são atômicos, e existe uma
 * fresta entre um e outro. A trava consultiva do Postgres fecha essa fresta
 * sem tabela nova nem coordenação externa. O número é arbitrário, só precisa
 * ser estável.
 */
const TRAVA = 828_100;

let rodando = false;
/** Quando a varredura atual começou. Null quando não há nenhuma em curso. */
let comecouEm: number | null = null;

/**
 * Quanto tempo uma varredura pode durar antes de ser considerada travada.
 *
 * Existe porque a trava `rodando` já matou a entrega diária. Uma chamada à
 * Meta ficou pendurada — o fetch do Node não tinha timeout —, `despacharDevidos`
 * nunca resolveu, `rodando` nunca voltou a false, e a agenda parou por horas
 * sem UM erro no log. Nos registros aparecia como silêncio: entregas às 13h30
 * num dia, às 15h47 no outro, sempre com falhas: 0.
 *
 * Os timeouts em meta.ts consertam a causa. Isto aqui é o cinto: se um dia
 * outra coisa pendurar, a varredura seguinte assume e grita, em vez de o
 * produto emudecer até alguém reparar.
 */
const VARREDURA_TRAVADA_MS = 5 * 60_000;

/**
 * O batimento da agenda.
 *
 * A varredura só deixava rastro quando ENVIAVA alguma coisa, e ela roda 1.440
 * vezes por dia quase sempre sem achar ninguém. O silêncio de uma agenda
 * saudável era idêntico ao de uma agenda morta — foi por isso que o problema
 * levou dias para ser visto. Agora cada volta carimba a hora, e a diferença
 * entre esse carimbo e agora diz na hora se ela está viva.
 */
async function baterPonto(): Promise<void> {
  await pool.query(
    `INSERT INTO agenda_batimento (id, em) VALUES (true, now())
     ON CONFLICT (id) DO UPDATE SET em = now()`).catch(() => {});
}

/** Há quanto tempo a agenda deu sinal de vida. Null se nunca deu. */
export async function segundosDesdeOBatimento(): Promise<number | null> {
  const { rows: [r] } = await pool.query(
    `SELECT extract(epoch from (now() - em))::int s FROM agenda_batimento WHERE id`)
    .catch(() => ({ rows: [] } as any));
  return r?.s ?? null;
}

export interface ResultadoVarredura {
  enviadas: number;
  falhas: number;
  detalhes: string[];
  pulada?: string;
}

/** Entrega para todo mundo cujo horário já chegou e que ainda não recebeu hoje. */
export async function despacharDevidos(): Promise<ResultadoVarredura> {
  const vazio = { enviadas: 0, falhas: 0, detalhes: [] as string[] };
  if (!metaConfigurada()) return { ...vazio, pulada: 'credenciais da Meta ausentes' };

  const cliente = await pool.connect();
  try {
    const { rows: [trava] } = await cliente.query(
      `SELECT pg_try_advisory_lock($1) obtida`, [TRAVA]);
    if (!trava.obtida) return { ...vazio, pulada: 'outra varredura em andamento' };

    try {
      const { rows: usuarios } = await cliente.query(
        `SELECT u.id, u.phone_e164, u.name,
                (u.wa_last_inbound_at > now() - interval '24 hours') janela_aberta
           FROM users u
           JOIN subscriptions s ON s.user_id = u.id
          WHERE ${TEM_ACESSO_SQL('s')}
            AND u.wa_opt_in_at IS NOT NULL
            AND u.phone_e164 IS NOT NULL
            AND ((now() AT TIME ZONE u.timezone)::time - u.delivery_time)
                  BETWEEN interval '0' AND ($1::int * interval '1 hour')
            AND NOT EXISTS (
                  SELECT 1 FROM seed_deliveries d
                   WHERE d.user_id = u.id
                     AND d.sent_wa_at IS NOT NULL
                     AND (d.delivered_at AT TIME ZONE u.timezone)::date
                       = (now() AT TIME ZONE u.timezone)::date)`,
        [ATRASO_MAXIMO_HORAS]);

      let enviadas = 0, falhas = 0;
      const detalhes: string[] = [];

      // Entrega em PARALELO, com largura fixa.
      //
      // Em série, cada entrega custa a ida e volta até a Meta — cerca de 300ms
      // que o processo passa parado esperando a rede. Com todo mundo pedindo
      // 7h, isso vira uma fila: medido, dá 8 minutos para mil pessoas e 39
      // para cinco mil. A última da fila recebe a semente das 7h quase às 8h,
      // e o problema cresce junto com o produto.
      //
      // A largura é fixa e modesta de propósito. O teto real não é a Meta
      // (STANDARD aceita 80 mensagens por segundo), é o pool do Postgres: cada
      // entrega segura uma conexão por várias consultas, e abrir mais frentes
      // do que o pool comporta troca a fila da rede por uma fila pior, a de
      // conexão, com timeout no fim.
      const fila = [...usuarios];
      const trabalhar = async () => {
        for (;;) {
          const u = fila.shift();
          if (!u) return;
          try {
            const r = await entregarSemente(u, 'agenda');
            if (r.ok) enviadas++;
            else if (r.erro) {
              falhas++;
              detalhes.push(`${u.phone_e164}: ${r.erro}`);
              console.error(`[agenda] ${u.phone_e164}: ${r.erro}`);
            }
          } catch (e: any) {
            // Uma pessoa que explode não pode levar junto o resto da fila.
            falhas++;
            detalhes.push(`${u.phone_e164}: ${e?.message || e}`);
            console.error(`[agenda] ${u.phone_e164}: ${e?.message || e}`);
          }
        }
      };
      const largura = Math.min(LARGURA_ENTREGA, usuarios.length);
      await Promise.all(Array.from({ length: largura }, trabalhar));
      // Só registra quando fez algo. A varredura roda 1.440 vezes por dia e
      // quase sempre não acha ninguém — gravar todas afogaria a linha do tempo
      // do painel e nada diria.
      if (enviadas || falhas) {
        void logEvent(null, 'wa_dispatch', { enviadas, falhas, origem: 'agenda' });
        console.log(`[agenda] ${enviadas} enviada(s), ${falhas} falha(s)`);
      }
      return { enviadas, falhas, detalhes };
    } finally {
      await cliente.query(`SELECT pg_advisory_unlock($1)`, [TRAVA]);
    }
  } finally {
    cliente.release();
  }
}

/** Liga a varredura periódica. Chamada uma vez, na subida do servidor. */
export function iniciarAgenda(): void {
  if (!metaConfigurada()) {
    console.log('[agenda] desligada — credenciais da Meta ausentes');
    return;
  }
  console.log(`[agenda] varrendo a cada ${INTERVALO_MS / 1000}s`);

  // A faxina de retenção, uma vez por dia. Ver retencao.ts.
  //
  // .unref() de propósito, ao contrário do timer da entrega: apagar dado velho
  // é importante, mas não é motivo para segurar o processo de pé. Se ele for
  // encerrar, que encerre — a faxina de amanhã pega o que faltou, porque o
  // critério é a idade do dado, não a data da última execução.
  //
  // A primeira roda um minuto depois de subir, e não na virada de nenhum dia:
  // assim um deploy já aplica a política, em vez de esperar até amanhã.
  setTimeout(() => { void faxinaDiaria(); }, 60_000).unref?.();
  setInterval(() => { void faxinaDiaria(); }, 24 * 3_600_000).unref?.();

  // O aviso de cobrança de 24h roda de hora em hora, na mesma agenda. Não
  // precisa de precisão de minuto: o que importa é sair no dia anterior, com
  // folga para a pessoa ler e decidir.
  setInterval(() => {
    avisarCobrancasProximas().catch((e) => console.error('[cobrança]', e?.message || e));
  }, 3_600_000).unref?.();

  // Sem .unref() aqui, de propósito. Este é o timer que faz o produto
  // acontecer; ele deve segurar o processo vivo, não pedir licença para existir.
  setInterval(() => {
    // Guarda contra sobreposição dentro do MESMO processo: uma varredura lenta
    // (muitas entregas, Meta devagar) não pode acumular ticks por cima.
    if (rodando) {
      const ha = comecouEm ? Date.now() - comecouEm : 0;
      if (ha < VARREDURA_TRAVADA_MS) return;
      // Passou do teto: a anterior travou. Solta a guarda e deixa esta entrar.
      // A trava do Postgres continua impedindo duas varreduras de verdade ao
      // mesmo tempo, então liberar aqui é seguro.
      console.error(
        `[agenda] varredura anterior presa há ${Math.round(ha / 1000)}s — assumindo`);
    }
    rodando = true;
    comecouEm = Date.now();
    despacharDevidos()
      .catch((e) => console.error('[agenda]', e?.message || e))
      .finally(() => { rodando = false; comecouEm = null; void baterPonto(); });
  }, INTERVALO_MS);
}
