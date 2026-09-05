// A memória longitudinal: o que o Grão lembra da vida da pessoa.
//
// Um devocional que lembra é outra categoria de produto. A biblioteca estática
// entrega o mesmo conteúdo para todos e escolhe por categoria; aqui, se a
// pessoa contou na terça que o filho está internado, na sexta a semente chega
// retomando aquilo. Não é tecnologia difícil, é relação — e é por isso que o
// concorrente não copia sem refazer a arquitetura dele inteira.
//
// TRÊS TRAVAS, todas aprendidas com erro cometido neste produto:
//
//  1. SEM CITAÇÃO, SEM MEMÓRIA. Toda memória guarda as palavras literais da
//     pessoa. O motor já afirmou coisas que ninguém disse, e foi o pior erro
//     que tivemos: parece acolhimento e é o contrário, porque uma hora chega
//     em quem nunca viveu aquilo.
//
//  2. MEMÓRIA ESQUECE. "O filho está internado" é verdade em março e é um tapa
//     na cara em setembro. Cada categoria tem prazo próprio.
//
//  3. RETOMAR COM PARCIMÔNIA. Lembrar todo dia da mesma coisa deixa de ser
//     cuidado e vira insistência. Uma memória descansa depois de usada.

import Anthropic from '@anthropic-ai/sdk';
import { pool } from './db.js';
import { registrarFalhaDoCerebro } from './brain.js';

/**
 * Quanto tempo cada tipo de fato continua valendo, em dias.
 *
 * Os números são de produto, não técnicos:
 *  - `saude` é agudo e muda rápido; perguntar do resfriado um mês depois é
 *    estranho;
 *  - `perda` dura, e o luto não tem prazo — o que muda é COMO se retoma, não
 *    se retoma;
 *  - `pessoa` (nomes, vínculos: "minha filha Sofia") não expira, porque é
 *    quem a pessoa é;
 *  - `trabalho` e `pedido` acompanham um ciclo de meses.
 */
const VALIDADE_DIAS: Record<string, number> = {
  pessoa: 3650,
  perda: 365,
  fe: 180,
  trabalho: 120,
  rotina: 90,
  saude: 45,
};
const VALIDADE_PADRAO = 90;

/** Dias que uma memória descansa depois de o Grão retomá-la. */
const DESCANSO_DIAS = 6;

export interface Memoria {
  id: number;
  fato: string;
  evidencia: string;
  categoria: string;
  confianca: number;
  ultimaMencao: string;
  vezesUsada: number;
}

/** O que o modelo devolve ao ler uma mensagem. */
export interface MemoriaExtraida {
  fato: string;
  evidencia: string;
  categoria: string;
  confianca: number;
  /** true quando a pessoa disse que aquilo terminou ("ele teve alta"). */
  encerra?: boolean;
}

/**
 * Grava o que foi extraído de uma mensagem.
 *
 * Recusa em silêncio o que vier sem citação ou com citação que não aparece na
 * mensagem original. É a diferença entre lembrar e inventar: se o modelo
 * "lembrou" de algo que a pessoa não escreveu, a memória não entra.
 */
export async function guardarMemorias(
  userId: string,
  mensagem: string,
  extraidas: MemoriaExtraida[],
): Promise<number> {
  if (!extraidas?.length) return 0;
  const normal = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const original = normal(mensagem);
  let gravadas = 0;

  for (const m of extraidas) {
    if (!m?.fato?.trim() || !m?.evidencia?.trim()) continue;
    // A citação precisa existir MESMO na mensagem. Sem esta conferência, a
    // trava da evidência seria decorativa: bastaria o modelo escrever
    // qualquer frase no campo.
    if (!original.includes(normal(m.evidencia.trim()).slice(0, 40))) continue;
    if ((m.confianca ?? 0) < 60) continue;

    if (m.encerra) {
      // A pessoa disse que acabou. Encerrar é tão importante quanto lembrar:
      // é o que impede o Grão de perguntar do internamento depois da alta.
      await pool.query(
        `UPDATE user_memories SET encerrada_em = now()
          WHERE user_id = $1 AND encerrada_em IS NULL AND categoria = $2`,
        [userId, m.categoria]);
      continue;
    }

    // Fato repetido não vira linha nova: atualiza a data e a confiança. Sem
    // isto, quem menciona o desemprego toda semana acumularia dez memórias
    // iguais e afogaria as outras.
    const { rows: [existente] } = await pool.query(
      `SELECT id FROM user_memories
        WHERE user_id = $1 AND encerrada_em IS NULL
          AND (fato ILIKE $2 OR $2 ILIKE '%' || fato || '%')
        LIMIT 1`, [userId, m.fato.trim()]);

    if (existente) {
      await pool.query(
        `UPDATE user_memories
            SET ultima_mencao = now(), confianca = greatest(confianca, $2)
          WHERE id = $1`, [existente.id, m.confianca]);
    } else {
      await pool.query(
        `INSERT INTO user_memories (user_id, fato, evidencia, categoria, confianca)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, m.fato.trim(), m.evidencia.trim(), m.categoria || 'rotina', m.confianca]);
    }
    gravadas++;
  }
  return gravadas;
}

/**
 * As memórias vivas da pessoa, mais recentes primeiro.
 *
 * "Viva" = não encerrada e dentro do prazo da categoria. O prazo entra na
 * consulta, e não numa limpeza periódica, porque memória vencida não deve ser
 * apagada: ela é histórico, e um dia pode explicar um padrão. O que ela não
 * pode é voltar à conversa.
 */
export async function memoriasVivas(userId: string, limite = 6): Promise<Memoria[]> {
  const { rows } = await pool.query(
    `SELECT id, fato, evidencia, categoria, confianca,
            ultima_mencao "ultimaMencao", vezes_usada "vezesUsada"
       FROM user_memories
      WHERE user_id = $1
        AND encerrada_em IS NULL
        AND ultima_mencao > now() - (coalesce(($2::jsonb ->> categoria)::int, $3) * interval '1 day')
      ORDER BY ultima_mencao DESC
      LIMIT $4`,
    [userId, JSON.stringify(VALIDADE_DIAS), VALIDADE_PADRAO, limite]);
  return rows as Memoria[];
}

/**
 * A memória que vale retomar HOJE, se houver.
 *
 * Critérios, todos para evitar a insistência: confiança alta, mencionada
 * recentemente pela pessoa, e descansada desde a última vez que o Grão a
 * retomou. Devolver null é o caso comum e está certo — o silêncio é melhor
 * que uma retomada forçada.
 */
export async function memoriaParaRetomar(userId: string): Promise<Memoria | null> {
  const { rows: [m] } = await pool.query(
    `SELECT id, fato, evidencia, categoria, confianca,
            ultima_mencao "ultimaMencao", vezes_usada "vezesUsada"
       FROM user_memories
      WHERE user_id = $1
        AND encerrada_em IS NULL
        AND confianca >= 70
        AND ultima_mencao > now() - (coalesce(($2::jsonb ->> categoria)::int, $3) * interval '1 day')
        AND (ultima_vez_usada IS NULL
             OR ultima_vez_usada < now() - ($4::int * interval '1 day'))
      ORDER BY ultima_mencao DESC
      LIMIT 1`,
    [userId, JSON.stringify(VALIDADE_DIAS), VALIDADE_PADRAO, DESCANSO_DIAS]);
  return (m as Memoria) ?? null;
}

/** Marca que o Grão acabou de retomar esta memória. */
export async function registrarUso(id: number): Promise<void> {
  await pool.query(
    `UPDATE user_memories
        SET vezes_usada = vezes_usada + 1, ultima_vez_usada = now()
      WHERE id = $1`, [id]);
}

/** Uma linha por memória, para entrar no prompt sem virar parágrafo. */
export function paraPrompt(ms: Memoria[]): string {
  if (!ms.length) return '';
  return '\n\nO que você já sabe da vida dela (só use se couber, e NUNCA vá além disto):\n' +
    ms.map((m) => `- ${m.fato} (ela disse: "${m.evidencia}")`).join('\n');
}

// ===========================================================================
// A linha que liga o que ela contou à semente de hoje.
// ===========================================================================

const cliente = new Anthropic();
const MODELO = process.env.GRAO_BRAIN_MODEL || 'claude-haiku-4-5-20251001';

/** Teto de tamanho. Uma linha, não um parágrafo. */
const MAX_CARACTERES = 160;

/**
 * Frases que já estragaram resposta neste produto, e que não podem voltar por
 * esta porta.
 *
 * A verificação é mecânica de propósito: prompt é pedido, não garantia, e esta
 * linha vai para o topo da mensagem mais importante do dia. O que dá para
 * conferir por regra, se confere por regra.
 */
const PROIBIDAS = [
  /vai\s+dar\s+(tudo\s+)?certo/i,
  /logo\s+(isso\s+)?(vai\s+)?pass(a|ar)/i,
  /tudo\s+tem\s+um\s+prop[óo]sito/i,
  /sei\s+como\s+voc[êe]\s+se\s+sente/i,
  /entendo\s+perfeitamente/i,
  /voc[êe]\s+[ée]\s+(forte|guerreir[oa]|vencedor)/i,
  /sua\s+f[ée]\s+[ée]\s+grande/i,
  /deus\s+vai\s+(curar|resolver|dar)/i,
];

const SISTEMA_LIGACAO = `Você escreve UMA frase curta que liga o que a pessoa contou ao tema da semente que ela vai receber agora.

A frase abre a mensagem do dia, antes do versículo.

REGRAS DURAS:
- UMA frase. No máximo 20 palavras.
- Use SOMENTE o fato e a citação que eu te der. Não deduza nada além disso, não complete a história, não suponha como ela está hoje.
- NÃO prometa nada: nem cura, nem solução, nem que vai passar.
- NÃO diga que entende como ela se sente, e não a elogie ("você é forte", "sua fé é grande").
- NÃO use travessão.
- NÃO cite versículo: ele vem logo abaixo.
- Não use vocativo com gênero ("irmão", "querida") nem adjetive no masculino ou feminino: você não sabe o gênero dela.
- Se a ligação entre o fato e o tema da semente for forçada, devolva "" (vazio). Silêncio é melhor que retomada artificial.

Exemplo bom: "Você me contou do seu filho no hospital. A semente de hoje fala de descanso no meio da espera."
Exemplo ruim: "Sei que está sendo difícil com seu filho, mas logo tudo se resolve." (promete, e supõe)`;

/**
 * Escreve a linha de ligação, ou devolve null.
 *
 * Devolver null é o caminho comum e está certo: sem memória viva, sem confiança
 * alta ou sem ligação natural com o tema, a semente sai como sempre saiu. Uma
 * retomada forçada é pior que nenhuma.
 */
export async function linhaDeLigacao(
  userId: string,
  temaDaSemente: string,
): Promise<{ texto: string; memoriaId: number } | null> {
  const m = await memoriaParaRetomar(userId);
  if (!m) return null;

  try {
    const r = await cliente.messages.create({
      model: MODELO,
      max_tokens: 120,
      system: SISTEMA_LIGACAO,
      messages: [{
        role: 'user',
        content: `Fato: ${m.fato}\nPalavras dela: "${m.evidencia}"\nTema da semente de hoje: ${temaDaSemente}`,
      }],
    });
    const bloco = r.content.find((c) => c.type === 'text');
    const texto = bloco && bloco.type === 'text' ? bloco.text.trim().replace(/^["']|["']$/g, '') : '';

    if (!texto || texto.length > MAX_CARACTERES) return null;
    if (PROIBIDAS.some((re) => re.test(texto))) {
      console.warn(`[memória] linha recusada por frase proibida: "${texto}"`);
      return null;
    }
    return { texto, memoriaId: m.id };
  } catch (e: any) {
    registrarFalhaDoCerebro('linha de ligação', e);
    return null;
  }
}
