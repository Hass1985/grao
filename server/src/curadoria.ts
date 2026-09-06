// A CURADORIA: qual das sementes fala com esta pessoa, hoje.
//
// Por que este arquivo existe:
//
// O cérebro lê o relato em detalhe — família, intensidade, temas, evidências,
// uma família secundária, um resumo — e passava adiante UMA PALAVRA: a família.
// Daí em diante quem escolhia era uma consulta SQL ordenada por contabilidade
// do acervo ("qual gesto tem mais sementes ainda não vistas"). O que a pessoa
// escreveu não participava da escolha.
//
// O resultado era mensurável e ruim: três pessoas diferentes, dizendo coisas
// diferentes sobre culpa, recebiam a MESMA semente — a primeira da fila. Com 38
// sementes de culpa no acervo, o motor nunca perguntava qual delas falava com
// aquela pessoa. A promessa do produto é curadoria personalizada; o que existia
// era curadoria por rótulo.
//
// Aqui a escolha volta para quem sabe ler: o modelo recebe o relato e as
// candidatas já filtradas pelas regras do acervo (inéditas, fora da janela de
// gesto, sem semelhança recente) e diz qual conversa com aquela situação, e por
// quê. O "por quê" fica gravado — curadoria que ninguém consegue auditar é
// curadoria que ninguém consegue melhorar.
//
// Custo e risco:
//  - modelo pequeno, uma chamada por semente entregue (~US$ 0,002);
//  - o system é estável e vai cacheado;
//  - falhou, ficou lento ou sem saldo? Volta a valer a primeira candidata. A
//    entrega NUNCA depende desta chamada dar certo.

import Anthropic from '@anthropic-ai/sdk';
import { pool } from './db.js';
import { registrarFalhaDoCerebro } from './brain.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_BRAIN_MODEL || 'claude-haiku-4-5-20251001';

/** Abaixo disto não há relato suficiente para escolher — nem para pagar. */
const MINIMO_DE_RELATO = 40;

export interface Candidata {
  id: string;
  family: string;
  type: string;
  reference: string;
  passage: string;
  reflection: string;
}

export interface Escolha {
  id: string;
  porque: string;
  confianca: number;
}

const SYSTEM = `Você é o curador do Grão, um devocional diário para evangélicos brasileiros.

Uma pessoa contou o que está vivendo. Você recebe o relato dela e algumas sementes já preparadas — versículo e reflexão — e escolhe QUAL delas fala com a situação dela hoje. Você não escreve conteúdo: escolhe entre o que existe.

Como escolher:
1. Prefira a semente que toca o ponto ESPECÍFICO do relato, não o tema geral. Entre uma semente sobre "Deus perdoa" e outra sobre "culpa por ter falhado com quem você ama", para quem falou do filho, a segunda fala e a primeira só passa perto.
2. Leve a intensidade a sério. Sofrimento agudo pede presença e consolo; não mande alguém em crise cumprir tarefa. Estado leve ou estável aceita convite prático.
3. Respeite o que a pessoa NÃO disse. Não escolha pela sua interpretação do que ela deveria estar sentindo.
4. Se nenhuma candidata falar de verdade, escolha a menos distante e diga isso na confiança (abaixo de 50).

"porque": uma frase curta, interna, ligando o relato à semente. Ninguém do lado de fora lê isso — é o registro que nos deixa auditar a curadoria depois. Cite o que no relato levou à escolha.

Nunca invente id que não esteja na lista.`;

function ferramenta(ids: string[]) {
  return {
    name: 'escolher_semente',
    description: 'Registra qual semente fala com o relato desta pessoa.',
    input_schema: {
      type: 'object' as const,
      additionalProperties: false,
      properties: {
        id: { type: 'string', enum: ids, description: 'O id da semente escolhida.' },
        porque: { type: 'string', description: 'Uma frase interna ligando o relato à semente.' },
        confianca: { type: 'integer', description: '0 a 100: quanto ela fala mesmo com o relato.' },
      },
      required: ['id', 'porque', 'confianca'],
    },
  };
}

export interface RelatoDaPessoa {
  texto: string;
  temas: string[];
  intensidade: number | null;
  familiaSecundaria: string | null;
}

/**
 * O que sabemos do que a pessoa vive, para escolher a semente.
 *
 * Vem do que o cérebro já gravou e ninguém consultava. Ordem de preferência:
 * a leitura mais recente (é a mais próxima de hoje), depois o resumo da
 * abertura, depois o texto bruto da abertura. As últimas mensagens dela entram
 * como contexto porque quem escreve pelo WhatsApp vai mudando de assunto.
 */
export async function relatoDaPessoa(
  userId: string,
  textoDireto?: string | null,
): Promise<RelatoDaPessoa> {
  // Relato entregue no próprio pedido: é o caminho da demonstração do plano
  // pago, que não grava nada da pessoa. Sem isto a curadoria não teria o que
  // ler justamente no teste — e o teste passaria a avaliar a fila do acervo em
  // vez do motor. O texto é usado e descartado; nada dele fica no cadastro.
  if (textoDireto && textoDireto.trim().length >= MINIMO_DE_RELATO) {
    return {
      texto: textoDireto.trim().slice(0, 1200),
      temas: [],
      intensidade: null,
      familiaSecundaria: null,
    };
  }

  const { rows: [p] } = await pool.query(
    `SELECT p.initial_request,
            p.raw->'themes' temas,
            p.raw->'opening'->>'summary' resumo_abertura,
            p.raw->'opening'->>'familia_secundaria' familia2,
            (p.raw->'opening'->>'intensity')::int intensidade_abertura,
            (SELECT r.summary FROM emotional_readings r
              WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 1) resumo_leitura,
            (SELECT r.intensity FROM emotional_readings r
              WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 1) intensidade_leitura
       FROM profiles p WHERE p.user_id = $1`, [userId]);

  const { rows: mensagens } = await pool.query(
    `SELECT content FROM conversation_turns
      WHERE user_id = $1 AND role = 'user'
      ORDER BY created_at DESC LIMIT 2`, [userId]);

  const pedacos = [
    p?.resumo_leitura,
    p?.resumo_abertura,
    p?.initial_request,
    ...mensagens.map((m: any) => m.content),
  ].filter((s: any) => typeof s === 'string' && s.trim().length > 0);

  // Sem repetir a mesma frase que veio por dois caminhos.
  const vistos = new Set<string>();
  const texto = pedacos
    .filter((s: string) => {
      const chave = s.trim().slice(0, 80).toLowerCase();
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .join('\n')
    .slice(0, 1200);

  const temas = Array.isArray(p?.temas) ? p.temas.filter((t: any) => typeof t === 'string') : [];

  return {
    texto,
    temas: temas.slice(0, 6),
    intensidade: p?.intensidade_leitura ?? p?.intensidade_abertura ?? null,
    familiaSecundaria: p?.familia2 ?? null,
  };
}

/** Vale a pena chamar o modelo? Sem relato, não há o que escolher. */
export function temRelatoSuficiente(r: RelatoDaPessoa): boolean {
  return r.texto.trim().length >= MINIMO_DE_RELATO;
}

/**
 * Escolhe entre as candidatas. Devolve null em qualquer falha — quem chamou
 * segue com a primeira da lista, que é a ordem do acervo.
 */
export async function escolherSemente(
  relato: RelatoDaPessoa,
  candidatas: Candidata[],
): Promise<Escolha | null> {
  if (candidatas.length < 2 || !temRelatoSuficiente(relato)) return null;

  const lista = candidatas
    .map((c, i) => `${i + 1}. id: ${c.id} · ${c.family} · ${c.type}
   ${c.reference} — ${c.passage}
   ${c.reflection.slice(0, 320)}`)
    .join('\n\n');

  const partes = [`O que esta pessoa contou:\n"""${relato.texto}"""`];
  if (relato.temas.length) partes.push(`Temas que já apareceram na vida dela: ${relato.temas.join(', ')}`);
  if (relato.intensidade != null) partes.push(`Intensidade do estado agora: ${relato.intensidade}/100`);
  partes.push(`Sementes disponíveis:\n\n${lista}`);

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 250,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [ferramenta(candidatas.map((c) => c.id)) as any],
      tool_choice: { type: 'tool', name: 'escolher_semente' },
      messages: [{ role: 'user', content: partes.join('\n\n') }],
    });

    const tu = res.content.find((b) => b.type === 'tool_use');
    if (!tu || tu.type !== 'tool_use') return null;
    const e = tu.input as Escolha;
    // O enum já protege, mas modelo é entrada externa: confere de novo.
    if (!candidatas.some((c) => c.id === e.id)) return null;
    return {
      id: e.id,
      porque: String(e.porque ?? '').slice(0, 400),
      confianca: Math.max(0, Math.min(100, Number(e.confianca) | 0)),
    };
  } catch (err: any) {
    registrarFalhaDoCerebro('curadoria da semente', err);
    return null;
  }
}
