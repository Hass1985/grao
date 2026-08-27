// Perfil-base do Grão: classificação silenciosa construída durante a conversa.
// Nunca exibido ao usuário. No protótipo persiste em AsyncStorage;
// em produção, sincroniza com o banco (PostgreSQL) via backend.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VakDelta, OceanDelta } from '../data/onboardingScript';
import { EmotionalFamily } from '../data/seeds';

export type Channel = 'visual' | 'auditivo' | 'sinestesico';

export interface AnswerRecord {
  id: string;
  value: string;
  source: 'chip' | 'text';
}

export interface GraoProfile {
  version: 1;
  createdAt: string;
  name: string;
  tradition: 'evangelical';
  sensory: {
    scores: { visual: number; auditivo: number; sinestesico: number };
    dominant: Channel;
  };
  ocean: { O: number; C: number; E: number; A: number; N: number }; // 0–100
  initialRequest: string | null; // resposta livre de "o que você tem pedido a Deus"
  emotionalHint: EmotionalFamily | null;
  answers: AnswerRecord[];
}

const STORAGE_KEY = 'grao.profile.v1';

// Léxico para pontuar respostas livres (sinais sensoriais no texto).
const LEXICON: { channel: keyof VakDelta; words: string[] }[] = [
  { channel: 'v', words: ['ver', 'vejo', 'olhar', 'olho', 'imagem', 'cena', 'luz', 'cor', 'ler', 'escrito', 'paisagem', 'céu', 'visão'] },
  { channel: 'a', words: ['ouvir', 'ouço', 'escutar', 'som', 'voz', 'música', 'louvor', 'palavra', 'falar', 'áudio', 'canto'] },
  { channel: 'k', words: ['sentir', 'sinto', 'abraço', 'toque', 'tocar', 'caminhar', 'arrepio', 'coração', 'peito', 'mão', 'paz no corpo', 'calor'] },
];

// Palavras da resposta livre que sugerem a família emocional inicial.
// IMPORTANTE: isto é só o FALLBACK offline (modo demo, sem backend). A leitura
// de verdade é o cérebro (server/src/brain.ts). Por isso a regra de honestidade
// em emotionalHintFromText: sinal fraco ou ambíguo → null (não afirmamos nada).
const EMOTION_HINTS: { family: EmotionalFamily; words: string[] }[] = [
  { family: 'ansiedade', words: ['ansiedad', 'ansios', 'medo', 'preocup', 'aflição', 'aflit', 'angusti', 'angústi', 'nervos', 'não durmo', 'nao durmo', 'insôni', 'insoni', 'pânico', 'panico', 'desesper', 'apertando', 'sufoc', 'cabeça a mil', 'cabeca a mil', 'estress'] },
  { family: 'paz', words: ['descanso', 'descansar', 'calma', 'tranquil', 'sossego', 'quiet', 'silêncio com deus', 'alívio', 'alivio'] },
  { family: 'esperança', words: ['esperança', 'esperanca', 'futuro', 'sonho', 'milagre', 'recomeç', 'recomec', 'abrir uma porta', 'abrir portas', 'dias melhores', 'vai melhorar'] },
  { family: 'propósito', words: ['direção', 'direcao', 'propósito', 'proposito', 'caminho', 'vontade de deus', 'chamado', 'vocação', 'vocacao', 'sentido', 'decisão', 'decisao', 'qual rumo'] },
  { family: 'gratidão', words: ['gratidão', 'gratidao', 'grato', 'grata', 'agradec', 'obrigad', 'abençoad', 'abencoad', 'graças a deus', 'gracas a deus', 'vitória', 'vitoria'] },
  { family: 'fé', words: ['fé', 'confiança', 'confianca', 'confiar', 'crer', 'creio', 'promessa', 'firmad', 'crendo'] },
  { family: 'solidão', words: ['sozinh', 'solidão', 'solidao', 'isolad', 'ninguém', 'ninguem', 'abandonad', 'sem amigos', 'não conheço ninguém', 'nao conheco ninguem'] },
  { family: 'luto', words: ['luto', 'falec', 'morreu', 'partiu', 'perdi minha', 'perdi meu', 'saudade d', 'enterr', 'não está mais aqui', 'nao esta mais aqui'] },
  { family: 'culpa', words: ['culpa', 'culpad', 'perdão', 'perdao', 'perdoa', 'errei', 'falhei', 'vergonha', 'arrepend', 'pequei'] },
  { family: 'alegria', words: ['alegria', 'alegre', 'felicidade', 'feliz', 'celebr', 'festejand', 'nasceu', 'radiante', 'coração explodindo', 'coracao explodindo'] },
];

export interface EmotionalSignal {
  family: EmotionalFamily;
  score: number;       // nº de sinais encontrados
  runnerUp: number;    // score da 2ª família (para medir ambiguidade)
}

// Leitura por léxico com pontuação. Devolve null quando o sinal é fraco
// (nenhuma palavra) ou ambíguo (empate) — melhor não afirmar do que errar.
export function emotionalSignalFromText(text: string): EmotionalSignal | null {
  const t = text.toLowerCase();
  const scores = EMOTION_HINTS.map(({ family, words }) => ({
    family,
    score: words.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  if (!best || best.score === 0) return null;
  if (second && second.score === best.score) return null; // empate = ambíguo
  return { family: best.family, score: best.score, runnerUp: second?.score ?? 0 };
}

export function scoreFreeText(text: string): VakDelta {
  const t = text.toLowerCase();
  const delta: VakDelta = {};
  for (const { channel, words } of LEXICON) {
    const hits = words.filter((w) => t.includes(w)).length;
    if (hits > 0) delta[channel] = Math.min(hits, 2);
  }
  return delta;
}

export function emotionalHintFromText(text: string): EmotionalFamily | null {
  // Delega para a leitura pontuada: sinal fraco ou empatado → null.
  return emotionalSignalFromText(text)?.family ?? null;
}

export class ProfileBuilder {
  private vak = { v: 0, a: 0, k: 0 };
  private ocean = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  private answers: AnswerRecord[] = [];
  private initialRequest: string | null = null;
  private hint: EmotionalFamily | null = null;
  name = '';

  addVak(d?: VakDelta) {
    if (!d) return;
    this.vak.v += d.v ?? 0;
    this.vak.a += d.a ?? 0;
    this.vak.k += d.k ?? 0;
  }

  addOcean(d?: OceanDelta) {
    if (!d) return;
    (Object.keys(d) as (keyof OceanDelta)[]).forEach((k) => {
      this.ocean[k] += d[k] ?? 0;
    });
  }

  record(id: string, value: string, source: 'chip' | 'text') {
    this.answers.push({ id, value, source });
    if (id === 'pedido') {
      this.initialRequest = value;
      this.hint = emotionalHintFromText(value);
    }
  }

  dominant(): Channel {
    const { v, a, k } = this.vak;
    if (k >= v && k >= a) return 'sinestesico';
    if (a >= v) return 'auditivo';
    return 'visual';
  }

  build(): GraoProfile {
    const norm = (x: number) => Math.max(0, Math.min(100, 50 + x * 10));
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      name: this.name,
      tradition: 'evangelical',
      sensory: {
        scores: { visual: this.vak.v, auditivo: this.vak.a, sinestesico: this.vak.k },
        dominant: this.dominant(),
      },
      ocean: {
        O: norm(this.ocean.O),
        C: norm(this.ocean.C),
        E: norm(this.ocean.E),
        A: norm(this.ocean.A),
        N: norm(this.ocean.N),
      },
      initialRequest: this.initialRequest,
      emotionalHint: this.hint,
      answers: this.answers,
    };
  }
}

export async function saveProfile(profile: GraoProfile): Promise<void> {
  const json = JSON.stringify(profile);
  await AsyncStorage.setItem(STORAGE_KEY, json);
  // JSON silencioso — visível só para desenvolvimento / futura sincronização.
  console.log('[grao] perfil-base salvo:', json);
}

export async function getProfile(): Promise<GraoProfile | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as GraoProfile) : null;
}

// Grava um perfil-base mínimo vindo do backend (modo IA), o suficiente para
// a entrega da semente (canal dominante + família emocional inicial).
export async function saveMinimalProfile(input: {
  name: string;
  channel: Channel;
  emotionalHint?: EmotionalFamily | null;
}): Promise<void> {
  const profile: GraoProfile = {
    version: 1,
    createdAt: new Date().toISOString(),
    name: input.name,
    tradition: 'evangelical',
    sensory: {
      scores: { visual: 0, auditivo: 0, sinestesico: 0 },
      dominant: input.channel,
    },
    ocean: { O: 50, C: 50, E: 50, A: 50, N: 50 },
    initialRequest: null,
    emotionalHint: input.emotionalHint ?? null,
    answers: [],
  };
  await saveProfile(profile);
}
