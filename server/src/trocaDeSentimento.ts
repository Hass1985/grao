// "Meu sentimento mudou" — o segundo botão da entrega diária.
//
// O problema que isto resolve é do propósito, não da técnica. O sentimento da
// pessoa era lido uma vez, no cadastro, e alimentava a semente todos os dias
// até que ela avisasse que mudou. Só que não existia caminho para avisar. Um
// produto que se apresenta como personalizado ficava preso ao retrato de um
// dia que pode ter sido há meses — e quem passou por um luto em março
// continuava recebendo sementes de luto em setembro.
//
// A regra central, que vale mais que qualquer otimização: UMA SEMENTE POR DIA,
// NUNCA DUAS. Os dois botões do template são portas alternativas para a mesma
// entrega; depois que uma é usada, a outra deixa de valer naquele dia. É o que
// impede o produto de virar uma máquina de conteúdo sob demanda, e é também o
// que mantém o custo previsível.
//
// A troca é PERMANENTE: o sentimento novo substitui o anterior e passa a
// alimentar os dias seguintes, até a próxima troca.

import { pool, logEvent, saveTurn, saveReading, setMomentBySystem } from './db.js';
import { readOpening } from './brain.js';
import { selectSeedForUser } from './seedSelector.js';
import { formatSeed } from './whatsapp.js';
import { acessoDoUsuario } from './acesso.js';
import { avaliarRisco, respostaDeCuidado } from './seguranca.js';
import { sendText } from './meta.js';
import { transcreverAudioDoWhatsapp, transcricaoConfigurada } from './transcricao.js';

/** O rótulo do segundo botão, como aprovado no template. */
export const BOTAO_TROCA = 'Meu sentimento mudou';

/** O que o Grão pergunta quando a pessoa diz que mudou. */
const PERGUNTA = (nome?: string | null) =>
  `${nome ? nome + ', me' : 'Me'} conta o que está acontecendo. ` +
  `Pode mandar um áudio de até 1 minuto, ou escrever aqui. 🌱`;

const PERGUNTA_SEM_AUDIO = (nome?: string | null) =>
  `${nome ? nome + ', me' : 'Me'} conta o que está acontecendo, aqui por escrito. 🌱`;

const AUDIO_FALHOU =
  'Não consegui ouvir esse áudio. Pode me contar por escrito o que está acontecendo?';

export interface EstadoDoDia {
  /** A semente de hoje já foi entregue. */
  fechado: boolean;
  /** Por qual porta ela saiu. */
  porta: string | null;
  /** Já mandamos hoje a resposta automática de fora de fluxo. */
  foraDeFluxoEnviada: boolean;
  /** Pedimos o relato e ele ainda vale para a semente de hoje. */
  aguardandoRelato: boolean;
  nome: string | null;
}

/**
 * Os quatro estados do documento, numa consulta só.
 *
 * Tudo é resolvido no fuso DA PESSOA. Com o fuso do servidor, quem lê às 23h
 * em Manaus teria o dia virado no meio da leitura.
 *
 * A espera pelo relato NÃO morre em 24 horas. Ela morre quando o dia fecha,
 * que é o que ela existe para preencher. Quem toca no botão de manhã, larga o
 * celular e só volta à noite — ou no dia seguinte, antes da semente daquele
 * dia sair — continua sendo ouvido. A pessoa respondeu a uma pergunta que o
 * Grão fez; descartar a resposta porque ela demorou seria castigá-la por ter
 * tido um dia cheio.
 *
 * O teto de 48h existe só para um pedido esquecido não sequestrar uma mensagem
 * solta uma semana depois.
 */
export async function estadoDoDia(userId: string): Promise<EstadoDoDia> {
  const { rows: [r] } = await pool.query(
    `SELECT u.name,
            (u.wa_fora_fluxo_em = (now() AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date)
              AS fora_enviada,
            (u.wa_relato_pedido_em IS NOT NULL
              AND u.wa_relato_pedido_em > now() - interval '48 hours') AS pedido_vivo,
            d.porta,
            (d.id IS NOT NULL) AS fechado
       FROM users u
       LEFT JOIN LATERAL (
         SELECT d.id, d.porta FROM seed_deliveries d
          WHERE d.user_id = u.id AND d.planted = true
            AND (d.delivered_at AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date
              = (now() AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date
          ORDER BY d.id DESC LIMIT 1
       ) d ON true
      WHERE u.id = $1`, [userId]);

  const fechado = !!r?.fechado;
  return {
    fechado,
    porta: r?.porta ?? null,
    foraDeFluxoEnviada: !!r?.fora_enviada,
    // Dia fechado encerra a espera: a semente daquele dia já saiu, e é ela que
    // o relato existia para escolher.
    aguardandoRelato: !fechado && !!r?.pedido_vivo,
    nome: r?.name ?? null,
  };
}

/** Marca o dia como fechado, registrando por qual porta. */
export async function fecharDia(userId: string, porta: string): Promise<void> {
  await pool.query(
    `UPDATE seed_deliveries d
        SET planted = true, porta = $2
       FROM users u
      WHERE d.user_id = $1 AND u.id = d.user_id
        AND (d.delivered_at AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date
          = (now() AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date`,
    [userId, porta]);
}

/**
 * Toque em "Meu sentimento mudou".
 *
 * Se o dia já fechou, a porta não vale mais — e a resposta diz isso sem soar
 * como recusa. Se não, abre a espera e pergunta.
 *
 * O toque no botão já abriu a janela de 24h do lado da Meta, então tanto a
 * pergunta quanto a semente que vem depois saem como texto livre.
 */
export async function pedirRelato(
  userId: string,
  telefone: string,
): Promise<void> {
  const estado = await estadoDoDia(userId);

  if (estado.fechado) {
    await sendText(telefone, await textoDiaFechado(userId));
    void logEvent(userId, 'troca_recusada', { motivo: 'dia já fechado', porta: estado.porta });
    return;
  }

  await pool.query(`UPDATE users SET wa_relato_pedido_em = now() WHERE id = $1`, [userId]);

  const pergunta = transcricaoConfigurada()
    ? PERGUNTA(primeiroNome(estado.nome))
    : PERGUNTA_SEM_AUDIO(primeiroNome(estado.nome));

  const r = await sendText(telefone, pergunta);
  if (!r.ok) console.error(`[troca] falha ao pedir o relato: ${r.erro}`);
  await saveTurn(userId, 'assistant', pergunta);
  void logEvent(userId, 'troca_pedida', { comAudio: transcricaoConfigurada() });
}

/**
 * Chegou o relato — por texto ou por áudio.
 *
 * Devolve `true` quando a mensagem foi consumida por este fluxo, para que o
 * webhook não a processe de novo como conversa comum.
 */
export async function receberRelato(
  userId: string,
  telefone: string,
  msg: { type: string; text?: { body: string }; audio?: { id: string }; voice?: { id: string } },
): Promise<boolean> {
  const estado = await estadoDoDia(userId);
  if (!estado.aguardandoRelato) return false;

  // Áudio vira texto antes de qualquer coisa. Se a transcrição falhar, a
  // espera CONTINUA aberta: a pessoa tenta de novo por escrito, e não perde a
  // semente por causa de um serviço de terceiro.
  let texto: string | null = null;
  const midia = msg.audio?.id || msg.voice?.id;

  if (midia) {
    texto = await transcreverAudioDoWhatsapp(midia);
    if (!texto) {
      await sendText(telefone, AUDIO_FALHOU);
      void logEvent(userId, 'troca_audio_falhou', {});
      return true;
    }
    void logEvent(userId, 'troca_audio_transcrito', { chars: texto.length });
  } else if (msg.type === 'text' && msg.text?.body?.trim()) {
    texto = msg.text.body.trim();
  } else {
    // Figurinha, imagem, documento: não é relato. Mantém a espera aberta.
    await sendText(telefone, AUDIO_FALHOU);
    return true;
  }

  await saveTurn(userId, 'user', texto);

  // SEGURANÇA EMOCIONAL antes de qualquer chamada de IA, como no resto do
  // sistema. Este é justamente o canal onde alguém em crise vai se abrir: o
  // produto acabou de perguntar como ela está. Responder um pedido de socorro
  // com o conteúdo do dia seria o pior desfecho possível.
  const risco = avaliarRisco(texto);
  if (risco.risco !== 'nenhum') {
    void logEvent(userId, 'risco_detectado', {
      nivel: risco.risco, trecho: risco.trecho, origem: 'troca_de_sentimento',
    });
  }
  if (risco.risco === 'grave') {
    const cuidado = respostaDeCuidado(estado.nome);
    const r = await sendText(telefone, cuidado);
    if (!r.ok) console.error(`[troca] FALHA ao enviar resposta de cuidado: ${r.erro}`);
    await saveTurn(userId, 'assistant', '[resposta de cuidado]');
    // A espera fecha, mas o dia NÃO: quem está em crise não recebe a semente
    // agora, e amanhã ainda tem a dela esperando.
    await pool.query(`UPDATE users SET wa_relato_pedido_em = NULL WHERE id = $1`, [userId]);
    return true;
  }

  const leitura = await readOpening(texto, primeiroNome(estado.nome) ?? undefined);

  // O sentimento novo SUBSTITUI o anterior, de forma permanente. É a diferença
  // entre "hoje estou assim" e "mudei" — e é o que o documento pede.
  if (leitura?.family) {
    // `themes` e a leitura inteira ficam gravados; memórias não saem daqui.
    // `readOpening` não extrai memórias — quem faz isso é o cérebro da
    // conversa comum — e chamar um segundo modelo só para extraí-las dobraria
    // o custo do gesto. É a mesma escolha que o cadastro pelo app já faz.
    await saveReading(userId, 'whatsapp', leitura);
    const mudou = await setMomentBySystem(userId, leitura.family);
    void logEvent(userId, 'sentimento_trocado', {
      familia: leitura.family, secundaria: leitura.familia_secundaria,
      confianca: leitura.confidence, temas: leitura.themes,
      mudou, origem: midia ? 'audio' : 'texto',
    });
  }

  // A semente sai do sentimento NOVO, e o relato vai junto para a curadoria
  // escolher entre as candidatas com o que ela acabou de dizer.
  const seed = await selectSeedForUser(userId, leitura?.family ?? null, texto);
  if (!seed) {
    await sendText(telefone, 'Guardei o que você me contou. Sua semente chega já já. 🌱');
    await pool.query(`UPDATE users SET wa_relato_pedido_em = NULL WHERE id = $1`, [userId]);
    return true;
  }

  // O acolhimento entra na MESMA mensagem da semente, no lugar da linha de
  // ligação. Mandar duas mensagens custaria o dobro e, pior, partiria em duas
  // o momento em que ela se abriu e foi respondida.
  const completo = (await acessoDoUsuario(userId)).completo;
  const acolhimento = leitura?.response?.trim() || null;
  const corpo = formatSeed(seed, primeiroNome(estado.nome), completo, acolhimento);

  const r = await sendText(telefone, corpo);
  if (!r.ok) {
    console.error(`[troca] falha ao entregar a semente: ${r.erro}`);
    // A espera FECHA mesmo com o envio falhando, e o dia NÃO.
    //
    // Deixar a espera aberta parecia generoso — a pessoa tentaria de novo —
    // mas cada nova tentativa reexecutaria a leitura e escolheria OUTRA
    // semente, gastando uma das 380 a cada mensagem dela. O que importava já
    // está salvo: o sentimento novo está gravado e a semente está registrada
    // como entrega de hoje. A varredura da agenda reenvia essa mesma semente,
    // sem consumir outra.
    await pool.query(`UPDATE users SET wa_relato_pedido_em = NULL WHERE id = $1`, [userId]);
    return true;
  }

  await saveTurn(userId, 'assistant', corpo);
  await fecharDia(userId, 'troca');
  await pool.query(`UPDATE users SET wa_relato_pedido_em = NULL WHERE id = $1`, [userId]);
  void logEvent(userId, 'seed_planted', {
    seedId: seed.id, family: seed.family, source: 'whatsapp_troca',
  });
  return true;
}

/**
 * Texto livre com o dia já fechado.
 *
 * Responde UMA vez por dia e depois cala. Não puxa assunto, não faz pergunta
 * de volta, não abre conversa — o documento é explícito, e a razão é boa: um
 * companheiro que responde a tudo, sempre, deixa de ser um ritual diário e
 * vira um chat. O silêncio aqui é parte do produto.
 *
 * Devolve `true` quando consumiu a mensagem.
 */
export async function responderForaDeFluxo(
  userId: string,
  telefone: string,
): Promise<boolean> {
  const estado = await estadoDoDia(userId);
  if (!estado.fechado) return false;

  if (estado.foraDeFluxoEnviada) {
    void logEvent(userId, 'fora_de_fluxo_silencio', {});
    return true;    // consumida, sem resposta
  }

  const texto = await textoDiaFechado(userId);
  const r = await sendText(telefone, texto);
  if (r.ok) {
    await pool.query(
      `UPDATE users
          SET wa_fora_fluxo_em = (now() AT TIME ZONE coalesce(timezone,'America/Sao_Paulo'))::date
        WHERE id = $1`, [userId]);
    void logEvent(userId, 'fora_de_fluxo_respondido', {});
  }
  return true;
}

/**
 * "Sua semente de hoje já foi plantada. Amanhã, às 7h, tem uma nova."
 *
 * O horário é o da pessoa, puxado da preferência dela. Sem isso a frase
 * prometeria 7h para quem escolheu 21h, e a promessa quebrada seria a última
 * coisa que ela leria naquele dia.
 */
async function textoDiaFechado(userId: string): Promise<string> {
  const { rows: [u] } = await pool.query(
    `SELECT to_char(delivery_time, 'HH24:MI') horario FROM users WHERE id = $1`, [userId]);
  const quando = u?.horario ? `às ${u.horario}` : 'no seu horário';
  return `Recebi. Sua semente de hoje já foi plantada. ` +
         `Amanhã, ${quando}, tem uma nova esperando você. 🌱`;
}

function primeiroNome(nome: string | null): string | null {
  const n = (nome ?? '').trim().split(/\s+/)[0];
  return n || null;
}
