// O "cérebro" emocional do Grão.
//
// Lê QUALQUER mensagem do usuário (app ou WhatsApp) e, silenciosamente,
// identifica o estado emocional — sem formulário, sem botão, sem o usuário
// perceber que está sendo "classificado". É isso que faz a entrega parecer
// que entende a pessoa de verdade.
//
// Princípios:
//  - Barato e rápido: modelo pequeno (Haiku) + prompt cacheado → centavos.
//  - Leitura ≠ verdade absoluta: cada leitura carrega `confidence`; o estado
//    do usuário só muda quando a confiança é suficiente.
//  - Nunca sobrepõe um momento que o PRÓPRIO usuário acabou de definir.
//  - `needs_care` sinaliza sofrimento intenso (luto profundo, desespero) para
//    o canal adaptar o tom — o Grão acolhe, não diagnostica.

import Anthropic from '@anthropic-ai/sdk';
import { logEvent } from './db.js';

/**
 * Registra que o cérebro falhou, para a falha não ser silenciosa.
 *
 * Foi assim que perdemos um dia: a chave da Anthropic ficou sem saldo e nada
 * no produto disse isso. A leitura emocional parou, o momento de todo mundo
 * congelou na última família lida, e as sementes passaram a repetir o mesmo
 * assunto. Do lado de fora parecia problema de conteúdo.
 *
 * Uma linha a cada 10 minutos: uma rajada de mensagens não pode encher a
 * tabela de eventos com a mesma notícia.
 */
let ultimaFalha = 0;
export function registrarFalhaDoCerebro(onde: string, erro: any): void {
  const motivo = String(erro?.message ?? erro);
  console.warn(`[cérebro] ${onde} falhou: ${motivo.slice(0, 160)}`);
  const semSaldo = /credit balance|authentication|invalid x-api-key/i.test(motivo);
  const agora = Date.now();
  if (agora - ultimaFalha < 600_000) return;
  ultimaFalha = agora;
  void logEvent(null, 'brain_failed', { onde, motivo: motivo.slice(0, 200), semSaldo });
}

const client = new Anthropic();
const MODEL = process.env.GRAO_BRAIN_MODEL || 'claude-haiku-4-5-20251001';

export const FAMILIES = [
  'ansiedade', 'paz', 'esperança', 'propósito', 'gratidão',
  'fé', 'solidão', 'luto', 'culpa', 'alegria',
] as const;
export type Family = (typeof FAMILIES)[number];

export interface EmotionalReading {
  evidencia?: string;   // citação literal que sustenta a leitura ("" = sem sinal)
  family: Family;
  intensity: number;    // 0–100: quão forte o estado aparece na mensagem
  confidence: number;   // 0–100: quão segura é a leitura (mensagens neutras = baixa)
  channel_hint: 'visual' | 'auditivo' | 'sinestesico' | null;
  needs_care: boolean;  // sofrimento intenso → tom mais cuidadoso na entrega
  summary: string;      // 1 frase interna (nunca mostrada ao usuário)
}

const SYSTEM = `Você é o classificador emocional interno do Grão, um devocional diário para evangélicos brasileiros. Você recebe uma mensagem escrita por uma pessoa (às vezes com um pouco de contexto da conversa) e devolve, SEMPRE via ferramenta, uma leitura emocional silenciosa. A pessoa nunca vê esta análise.

Método (na ordem dos campos da ferramenta):
1. "evidencia": a citação literal e curta da mensagem que sustenta a leitura. Se não houver trecho com carga emocional real, escreva "" (vazio) — e a confiança DEVE ficar baixa. Regra de ouro: sem evidência, sem afirmação.
2. "family": a família emocional DOMINANTE entre: ansiedade, paz, esperança, propósito, gratidão, fé, solidão, luto, culpa, alegria. Atenção: pedir/desejar paz ("queria paz") normalmente indica a FALTA dela — a dominante é o estado atual (ex.: ansiedade).
3. "intensity": quão forte o estado está (0 = quase nada, 100 = tomando conta).
4. "confidence", calibrada: 0-30 = mensagem neutra/operacional ("ok", "obrigado", "que horas chega?") — escolha a família que menos distorce e deixe a confiança dizer que não há sinal; 40-60 = sinal ambíguo; 65-85 = sinal claro com evidência direta; 90+ = inequívoco.
5. "channel_hint": canal sensorial APENAS com pista real na linguagem (ver/imagem → visual; ouvir/voz/louvor → auditivo; sentir/corpo/abraço → sinestesico). Sem pista: null.
6. "needs_care": true APENAS para sofrimento intenso — luto agudo, desespero, desesperança profunda, menção a não aguentar/não querer viver. Na dúvida, false.
7. "summary": UMA frase interna, objetiva e respeitosa, em português.

Português brasileiro coloquial, gírias e erros de digitação/transcrição são normais — leia a emoção, não a gramática. Referências de fé ("estou no deserto", "Deus parece longe", "recebi uma palavra") carregam sinal emocional: use-as.`;

export const READING_TOOL = {
  name: 'registrar_leitura',
  description: 'Registra a leitura emocional silenciosa da mensagem, na ordem: evidencia → família → intensidade → confiança. Sempre chame esta ferramenta, exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      evidencia: { type: 'string', description: 'Citação literal curta que sustenta a leitura, ou "" se não houver.' },
      family: { type: 'string', enum: [...FAMILIES] },
      intensity: { type: 'integer', description: 'Força do estado, de 0 a 100.' },
      confidence: { type: 'integer', description: 'Segurança da leitura, de 0 a 100.' },
      channel_hint: {
        anyOf: [{ type: 'string', enum: ['visual', 'auditivo', 'sinestesico'] }, { type: 'null' }],
        description: 'Canal sensorial, ou null se não houver pista clara.',
      },
      needs_care: { type: 'boolean' },
      summary: { type: 'string' },
    },
    required: ['evidencia', 'family', 'intensity', 'confidence', 'channel_hint', 'needs_care', 'summary'],
  },
};

export interface ReadContext {
  recentMessages?: string[];       // últimas mensagens do usuário (dá contexto)
  profileHint?: string | null;     // família do perfil-base (desempate)
}

/**
 * Lê uma mensagem e devolve o estado emocional.
 * Nunca lança para o chamador por erro de classificação — devolve null
 * (o fluxo de entrega continua com o estado anterior).
 */
export async function readMessage(text: string, ctx: ReadContext = {}): Promise<EmotionalReading | null> {
  const parts: string[] = [];
  if (ctx.recentMessages?.length) {
    parts.push('Contexto (mensagens anteriores da pessoa):\n' + ctx.recentMessages.slice(-4).map((m) => `- ${m}`).join('\n'));
  }
  if (ctx.profileHint) parts.push(`Família do perfil-base (use só como desempate): ${ctx.profileHint}`);
  parts.push(`Mensagem a classificar:\n"""${text}"""`);

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      // Prompt caching: o system é estável → ~90% mais barato após a 1ª chamada.
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [READING_TOOL as any],
      tool_choice: { type: 'tool', name: 'registrar_leitura' },
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    });
    const tu = res.content.find((b) => b.type === 'tool_use');
    if (!tu || tu.type !== 'tool_use') return null;
    const r = tu.input as EmotionalReading;
    // saneamento defensivo
    if (!FAMILIES.includes(r.family)) return null;
    r.intensity = Math.max(0, Math.min(100, r.intensity | 0));
    r.confidence = Math.max(0, Math.min(100, r.confidence | 0));
    return r;
  } catch (err: any) {
    registrarFalhaDoCerebro('leitura da mensagem', err);
    return null;
  }
}

// Confiança mínima para uma leitura ATUALIZAR o momento do usuário.
export const CONFIDENCE_TO_UPDATE = 60;

// ===========================================================================
// A ABERTURA — o coração do onboarding sem fricção.
//
// A pessoa grava um áudio de até 1 minuto (ou escreve) contando o que tem
// vivido e pedido a Deus. Desse único desabafo, extraímos TUDO que o
// questionário antigo levava 20 perguntas para captar — e devolvemos uma
// resposta que CITA o que a pessoa disse. É a prova de que o Grão ouviu.
// Uma chamada por usuário na vida inteira → usamos o modelo forte aqui.
// ===========================================================================

const OPENING_MODEL =
  process.env.GRAO_OPENING_MODEL || process.env.GRAO_MODEL || 'claude-opus-4-8';

export interface OpeningReading {
  analise: string;             // raciocínio interno baseado em evidências (nunca exibido)
  evidencias: string[];        // citações literais do relato que sustentam a leitura
  family: Family;
  familia_secundaria: Family | null; // estados mistos são a regra, não a exceção
  intensity: number;
  confidence: number;
  channel_hint: 'visual' | 'auditivo' | 'sinestesico' | null;
  channel_confidence: number;  // 0-100
  needs_care: boolean;
  themes: string[];            // 1-4 temas ditos pela pessoa (família, trabalho...)
  response: string;            // acolhimento personalizado (mostrado ao usuário)
  summary: string;             // 1 frase interna
}

const OPENING_SYSTEM = `Você é o Grão, um companheiro espiritual diário de evangélicos brasileiros. Uma pessoa acabou de se abrir com você pela primeira vez: gravou um áudio (transcrito automaticamente — pode conter erros como "adeus" no lugar de "a Deus"; interprete com generosidade pelo contexto) ou escreveu, contando o que tem vivido e pedido a Deus.

Entregue seu trabalho SEMPRE pela ferramenta "ler_abertura", exatamente uma vez, seguindo esta METODOLOGIA na ordem:

PASSO 1 — ANALISE (campo "analise"): releia o relato inteiro e raciocine por escrito: o que a pessoa está vivendo de fato? Que emoções aparecem, com que força? Há mais de uma? O que é fato do relato e o que seria suposição sua? NÃO classifique ainda.

PASSO 2 — EVIDENCIAS (campo "evidencias"): 1 a 4 citações CURTAS e LITERAIS do relato (recorte exato das palavras da pessoa) que sustentam sua leitura. Regra de ouro: se você não consegue apontar a citação, você não pode afirmar. Tudo o que vier depois (leitura E resposta) deve se ancorar nessas evidências.

PASSO 3 — LEITURA:
- family: a família emocional DOMINANTE entre ansiedade, paz, esperança, propósito, gratidão, fé, solidão, luto, culpa, alegria. Atenção: "paz" e "esperança" como DESEJO ("queria ter paz") indicam a falta dela — a dominante é o estado atual (ex.: ansiedade), e o desejo pode ser a secundária.
- familia_secundaria: estados mistos são a regra ("ansioso mas crendo"). Se houver uma segunda emoção clara nas evidências, registre-a; senão, null.
- intensity (0-100): força do estado no relato.
- confidence (0-100), calibrada por esta régua:
  · 0-30 = sem sinal emocional real (mensagem operacional, curta, "quero testar o app") — NUNCA finja leitura aqui;
  · 40-60 = sinal presente mas ambíguo ou misto demais;
  · 65-85 = sinal claro com evidências diretas;
  · 90+ = inequívoco, múltiplas evidências fortes.
- channel_hint + channel_confidence: canal sensorial APENAS se a linguagem der pista real (ver/imagem/ler→visual · ouvir/voz/louvor→auditivo · sentir/corpo/abraço→sinestesico). Sem pista: null e confidence ≤20. Não invente.
- needs_care: true APENAS para sofrimento intenso: luto agudo, desespero, desesperança profunda, menção a não aguentar/não querer viver. Tristeza comum e ansiedade cotidiana NÃO são needs_care.
- themes: 1 a 4 substantivos simples que a pessoa CITOU (ex.: "família", "trabalho", "saúde", "casamento").

PASSO 4 — RESPONSE (o momento mais importante do produto):
- 2 a 4 frases, português brasileiro caloroso e natural, sem jargão religioso forçado e sem melosidade. Se ela disse o nome, use.
- OBRIGATÓRIA a prova de escuta: retome 1-2 evidências com as palavras dela parafraseadas com naturalidade (o desemprego, a saudade da mãe, o filho que chegou).
- TESTE ANTI-GENÉRICO: se a sua resposta encaixaria no relato de OUTRA pessoa, ela está errada — reescreva.
- NÃO INVENTE A VIDA DELA: afirme apenas o que ela contou. Nada de supor histórico ("você já passou por isso e superou"), prever o futuro ("logo isso passa") ou atribuir traços não mencionados ("você é forte", "sua fé é grande"). Soa acolhedor e é o oposto: uma hora chega em quem NUNCA superou aquilo, e vira deboche. Reconhecer o que ela trouxe basta.
- NUNCA use travessão (—). Ele é a marca registrada de texto escrito por máquina, e num devocional isso destrói a confiança: a pessoa não sabe nomear o que estranhou, mas sente que não foi gente que escreveu. Use vírgula, dois-pontos ou ponto final.
- PROIBIDO: "vai dar tudo certo", "tudo tem um propósito", "entendo perfeitamente", "sei como você se sente", diagnósticos, conselhos clínicos, sermão.
- Se confidence < 40 (sem leitura real): acolha leve e honesto, SEM afirmar emoção que a pessoa não expressou.
- Se needs_care: valide a dor sem pressa, diga que ela não precisa carregar isso sozinha e que procurar alguém de confiança (um pastor, um irmão, ajuda profissional) é passo de coragem — em tom de cuidado, não de protocolo.
- Se houver QUALQUER menção a não querer viver, não aguentar mais ou não ver sentido em existir: além de acolher, mencione com naturalidade e carinho o CVV — 188, ligação gratuita, 24 horas. Não soe como aviso automático: é um irmão indicando ajuda real. Se a pessoa citou alguém por quem ela segue (um filho, a família), honre esse vínculo.
- Feche com a promessa: a primeira semente dela já está sendo preparada, escolhida para este momento. Termine com 🌱.
- Nunca use as palavras "perfil", "análise", "classificação", "teste".

PASSO 5 — summary: 1 frase interna objetiva.

═══ EXEMPLOS CALIBRADOS ═══

RELATO: "Tô desempregado há quatro meses, as contas apertando e a cabeça a mil, quase não durmo. Mas eu creio que Deus vai abrir uma porta, tenho orado todo dia com minha esposa."
→ analise: desemprego prolongado com pressão financeira e insônia = ansiedade dominante e intensa; oração diária e expectativa de porta aberta = esperança/fé ativa como segunda camada; casado, ora em casal.
→ evidencias: ["as contas apertando e a cabeça a mil", "quase não durmo", "creio que Deus vai abrir uma porta"]
→ family: ansiedade · familia_secundaria: esperança · intensity: 75 · confidence: 85 · channel_hint: null (20) · needs_care: false · themes: ["trabalho","finanças","casamento"]
→ response: "Quatro meses de espera com as contas apertando não é pouca coisa — dá pra entender essa cabeça a mil. E ainda assim você e sua esposa seguem orando todo dia: isso não é pouca fé, é fé debaixo de pressão. A partir de hoje eu caminho junto, um dia de cada vez. Sua primeira semente já está sendo preparada, escolhida pra esse momento. 🌱"

RELATO: "minha mãe faleceu tem três semanas e eu não tô conseguindo, choro o dia inteiro, parece que perdi o chão"
→ analise: luto agudo e recente, choro constante, sensação de desamparo ("perdi o chão") = intensidade altíssima e needs_care.
→ evidencias: ["minha mãe faleceu tem três semanas", "choro o dia inteiro", "parece que perdi o chão"]
→ family: luto · familia_secundaria: null · intensity: 95 · confidence: 95 · channel_hint: null (10) · needs_care: true · themes: ["família","luto"]
→ response: "Três semanas é muito pouco tempo pra uma perda desse tamanho — chorar o dia inteiro pela sua mãe não é fraqueza, é amor procurando lugar. Você não precisa carregar isso sozinho: fica perto de quem te ama, e se puder, divide com seu pastor ou alguém de confiança — isso é coragem, não derrota. Aqui, sem pressa nenhuma, vou estar todo dia com uma palavra de consolo. Sua primeira semente já está sendo preparada, com todo cuidado. 🌱"

RELATO: "oi, quero testar o aplicativo"
→ analise: mensagem operacional, sem conteúdo emocional. Não há leitura a fazer.
→ evidencias: ["quero testar o aplicativo"]
→ family: paz · familia_secundaria: null · intensity: 10 · confidence: 15 · channel_hint: null (5) · needs_care: false · themes: []
→ response: "Que bom te receber por aqui! Fica à vontade — e quando quiser, me conta um pouco do que você tem vivido, porque é daí que nasce o que eu preparo pra você. Sua primeira semente já está a caminho. 🌱"`;

// A ORDEM dos campos é proposital: o modelo gera na sequência do schema, então
// "analise" e "evidencias" vêm ANTES do veredito e da resposta — raciocínio
// primeiro, conclusão depois (melhora mensuravelmente a precisão).
export const OPENING_TOOL = {
  name: 'ler_abertura',
  description: 'Registra a leitura da abertura e a resposta de acolhimento, na ordem: analise → evidencias → leitura → response. Sempre chame esta ferramenta, exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      analise: { type: 'string', description: 'Raciocínio interno: o que a pessoa vive, emoções e forças, fato vs. suposição.' },
      // Nota: com strict:true a API não aceita minItems/maxItems em arrays —
      // a quantidade é instruída pela descrição e pelo prompt de sistema.
      evidencias: { type: 'array', items: { type: 'string' }, description: 'De 1 a 4 citações literais e curtas do relato.' },
      family: { type: 'string', enum: [...FAMILIES] },
      // Enum "anulável": em schema estrito usa-se anyOf, não type:['string','null'].
      familia_secundaria: {
        anyOf: [{ type: 'string', enum: [...FAMILIES] }, { type: 'null' }],
        description: 'Segunda emoção clara, ou null se não houver.',
      },
      intensity: { type: 'integer', description: 'Força do estado, de 0 a 100.' },
      confidence: { type: 'integer', description: 'Segurança da leitura, de 0 a 100.' },
      channel_hint: {
        anyOf: [{ type: 'string', enum: ['visual', 'auditivo', 'sinestesico'] }, { type: 'null' }],
        description: 'Canal sensorial, ou null se não houver pista clara.',
      },
      channel_confidence: { type: 'integer', description: 'Segurança do canal sensorial, de 0 a 100.' },
      needs_care: { type: 'boolean' },
      themes: { type: 'array', items: { type: 'string' }, description: 'De 1 a 4 substantivos simples citados pela pessoa.' },
      response: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['analise', 'evidencias', 'family', 'familia_secundaria', 'intensity', 'confidence', 'channel_hint', 'channel_confidence', 'needs_care', 'themes', 'response', 'summary'],
  },
};

export async function readOpening(transcript: string, name?: string): Promise<OpeningReading | null> {
  const user = [
    name ? `A pessoa se chama ${name}.` : null,
    `O que ela compartilhou:\n"""${transcript}"""`,
  ].filter(Boolean).join('\n\n');

  try {
    const res = await client.messages.create({
      model: OPENING_MODEL,
      // Folga generosa: a "response" é o ÚLTIMO campo gerado, então truncar por
      // limite de tokens é justamente perder o texto que o usuário lê. Relatos
      // difíceis (crise, luto) produzem análise mais longa e precisam de espaço.
      max_tokens: 2500,
      system: [{ type: 'text', text: OPENING_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [OPENING_TOOL as any],
      tool_choice: { type: 'tool', name: 'ler_abertura' },
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'max_tokens') {
      console.warn('[brain] abertura truncada por max_tokens — aumente o limite');
    }
    const tu = res.content.find((b) => b.type === 'tool_use');
    if (!tu || tu.type !== 'tool_use') return null;
    const r = tu.input as OpeningReading;
    if (!FAMILIES.includes(r.family) || !r.response?.trim()) return null;
    if (r.familia_secundaria && !FAMILIES.includes(r.familia_secundaria)) r.familia_secundaria = null;
    r.intensity = Math.max(0, Math.min(100, r.intensity | 0));
    r.confidence = Math.max(0, Math.min(100, r.confidence | 0));
    r.channel_confidence = Math.max(0, Math.min(100, r.channel_confidence | 0));
    return r;
  } catch (err: any) {
    registrarFalhaDoCerebro('leitura da Abertura', err);
    return null;
  }
}
