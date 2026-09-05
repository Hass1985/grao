// Liga cada dia do devocional anual ao versículo LITERAL que ele retoma.
//
// Por que existe: a "âncora bíblica" do material é paráfrase na voz de Deus,
// mas vem no formato de citação, com a referência ao lado. Medido: 24% de
// sobreposição de palavras com o capítulo citado, onde uma citação literal
// ficaria entre 90% e 100%. O público evangélico conhece os textos, e uma
// citação que não bate desqualifica o produto inteiro.
//
// O princípio, que vale para todo o Grão: a IA NUNCA escreve versículo.
//
// Aqui ela faz só uma coisa, a única que um modelo pode fazer com segurança
// nesse terreno: dizer QUAL versículo do capítulo a paráfrase está retomando.
// O texto sai de bible_verses, a Bíblia Livre completa já no banco. Se o
// modelo apontar um versículo que não existe, a resposta é descartada.
//
// Duas travas contra o modelo inventar:
//  1. ele escolhe entre CANDIDATOS que já vieram do banco, não de memória;
//  2. o texto gravado é lido do banco pela referência escolhida, nunca vem
//     da resposta do modelo.
//
// Uso: npm run content:ancorar [--aplicar]

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';
const APLICAR = process.argv.includes('--aplicar');
const LOTE = 12;

/** Palavras significativas, sem acento e sem as curtas. */
function palavras(t: string): string[] {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
}

interface Candidato { verse: number; text: string }

/**
 * Os versículos do capítulo mais próximos da paráfrase, por sobreposição de
 * palavras.
 *
 * Serve para o modelo escolher entre poucos candidatos reais em vez de ler o
 * capítulo inteiro. Salmos 119 tem 176 versículos: mandar tudo em 365 chamadas
 * custaria caro e daria mais espaço para o modelo divagar, não menos.
 */
/**
 * Nomes que o devocional usa e que não batem com os da Bíblia Livre.
 *
 * Um nome fora do catálogo faz o dia inteiro cair silenciosamente: o capítulo
 * "não existe", e a pessoa fica sem âncora sem que ninguém perceba.
 */
const APELIDOS: Record<string, string> = {
  'Cânticos': 'Cântico dos Cânticos',
  'Cantares': 'Cântico dos Cânticos',
  'Salmo': 'Salmos',
  'Apocalipse de João': 'Apocalipse',
};

async function candidatos(livro: string, cap: number, ancora: string): Promise<Candidato[]> {
  const nome = APELIDOS[livro] ?? livro;
  const { rows } = await pool.query(
    `SELECT verse, text FROM bible_verses WHERE book = $1 AND chapter = $2 ORDER BY verse`,
    [nome, cap]);
  if (!rows.length) return [];

  // Capítulo curto vai INTEIRO. O filtro por palavras erra quando a paráfrase
  // não reaproveita nenhuma: "Mesmo no vale mais escuro, você não anda
  // sozinho" e "Ainda que eu venha a andar pelo vale da sombra da morte" só
  // compartilham "vale". No primeiro ensaio isso custou 66 dias sem
  // correspondência, e a maioria dos capítulos citados cabe folgado. O teto de
  // 60 cobre Lucas 2, Atos 2 e 1 Coríntios 15, que ficaram de fora com 40.
  if (rows.length <= 60) {
    return rows.map((r: any) => ({ verse: r.verse, text: r.text }));
  }

  const alvo = new Set(palavras(ancora));
  const pontuados = rows.map((r: any) => {
    const p = palavras(r.text);
    const bate = p.filter((w) => alvo.has(w)).length;
    return { verse: r.verse, text: r.text, nota: bate / Math.max(1, Math.sqrt(p.length)) };
  });
  pontuados.sort((a, b) => b.nota - a.nota);

  // Nos capítulos longos (Salmos 119 tem 176 versículos), os 10 melhores, na
  // ordem do capítulo: numeração embaralhada atrapalha e não acrescenta nada.
  return pontuados.slice(0, 10).sort((a, b) => a.verse - b.verse)
    .map(({ verse, text }) => ({ verse, text }));
}

const SISTEMA = `Você recebe uma PARÁFRASE devocional em português e alguns versículos REAIS de um capítulo da Bíblia.

Sua única tarefa: dizer qual desses versículos a paráfrase está retomando.

REGRAS DURAS:
- Escolha SOMENTE entre os números de versículo que aparecem na lista. Nunca invente um número.
- NUNCA escreva ou reescreva texto bíblico. Você só devolve o número.
- Se a paráfrase retomar dois versículos seguidos, devolva o primeiro em "verso" e o último em "verso_fim".
- Se nenhum dos candidatos corresponder de verdade, devolva verso: 0. É melhor admitir do que forçar.`;

const FERRAMENTA = {
  name: 'apontar',
  description: 'Aponta o versículo que a paráfrase retoma. Chame uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      escolhas: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            dia: { type: 'string' as const, description: 'no formato "5/3"' },
            verso: { type: 'integer' as const, description: '0 se nenhum corresponder' },
            verso_fim: { type: 'integer' as const, description: '0 quando é um versículo só' },
          },
          required: ['dia', 'verso', 'verso_fim'],
        },
      },
    },
    required: ['escolhas'],
  },
};

interface Pendente {
  month: number; day: number; reference: string; verse: string;
  livro: string; cap: number; opcoes: Candidato[];
}

async function main() {
  const { rows: devs } = await pool.query(
    `SELECT month, day, verse, reference FROM devotionals
      WHERE verse_literal IS NULL ORDER BY month, day`);
  console.log(`${devs.length} dia(s) sem versículo literal`);
  console.log(`modo: ${APLICAR ? 'GRAVANDO' : 'ensaio (use --aplicar)'}\n`);
  if (!devs.length) { await pool.end(); return; }

  const pendentes: Pendente[] = [];
  const semCapitulo: string[] = [];
  for (const d of devs as any[]) {
    const m = /^([1-3]?\s?[A-Za-zÀ-ú]+)\s*(\d+)/.exec(String(d.reference).trim());
    if (!m) { semCapitulo.push(`${d.day}/${d.month} (${d.reference})`); continue; }
    const livro = m[1].trim(), cap = Number(m[2]);
    const opcoes = await candidatos(livro, cap, d.verse);
    if (!opcoes.length) { semCapitulo.push(`${d.day}/${d.month} (${d.reference} não está na base)`); continue; }
    pendentes.push({ month: d.month, day: d.day, reference: d.reference, verse: d.verse, livro, cap, opcoes });
  }
  if (semCapitulo.length) {
    console.log(`⚠ ${semCapitulo.length} sem capítulo localizável: ${semCapitulo.slice(0, 5).join(', ')}\n`);
  }

  let gravados = 0, semCorrespondencia = 0, recusados = 0;
  const amostra: string[] = [];

  for (let i = 0; i < pendentes.length; i += LOTE) {
    const lote = pendentes.slice(i, i + LOTE);
    process.stdout.write(`  lote ${Math.floor(i / LOTE) + 1}/${Math.ceil(pendentes.length / LOTE)}… `);

    const entrada = lote.map((p) => ({
      dia: `${p.day}/${p.month}`,
      parafrase: p.verse,
      capitulo: `${p.livro} ${p.cap}`,
      candidatos: p.opcoes.map((o) => `${o.verse}. ${o.text}`),
    }));

    let escolhas: any[] = [];
    try {
      const r = await client.messages.create({
        model: MODEL, max_tokens: 1500, system: SISTEMA,
        tools: [FERRAMENTA], tool_choice: { type: 'tool', name: 'apontar' },
        messages: [{ role: 'user', content: JSON.stringify(entrada, null, 1) }],
      });
      const uso = r.content.find((c) => c.type === 'tool_use');
      if (uso && uso.type === 'tool_use') escolhas = (uso.input as any).escolhas ?? [];
    } catch (e: any) {
      console.log(`erro: ${e.message.slice(0, 80)}`);
      if (/credit balance|authentication/i.test(e.message)) break;
      continue;
    }

    let ok = 0;
    for (const p of lote) {
      const e = escolhas.find((x) => x.dia === `${p.day}/${p.month}`);
      const inicio = Number(e?.verso ?? 0);
      if (!inicio) { semCorrespondencia++; continue; }
      // O modelo só pode escolher entre os candidatos que MANDAMOS.
      if (!p.opcoes.some((o) => o.verse === inicio)) { recusados++; continue; }

      const fim = Number(e?.verso_fim ?? 0) > inicio ? Number(e.verso_fim) : inicio;
      // O TEXTO vem do banco, pela referência escolhida. Nada do que o modelo
      // escreveu entra aqui.
      const { rows: vs } = await pool.query(
        `SELECT string_agg(text, ' ' ORDER BY verse) t FROM bible_verses
          WHERE book = $1 AND chapter = $2 AND verse BETWEEN $3 AND $4`,
        [APELIDOS[p.livro] ?? p.livro, p.cap, inicio, fim]);
      const literal = vs[0]?.t;
      if (!literal) { recusados++; continue; }

      const ref = `${p.livro} ${p.cap}:${inicio}${fim > inicio ? `-${fim}` : ''}`;
      if (APLICAR) {
        await pool.query(
          `UPDATE devotionals SET verse_literal = $3, reference_exact = $4
            WHERE month = $1 AND day = $2`, [p.month, p.day, literal, ref]);
      }
      gravados++; ok++;
      if (amostra.length < 5) {
        amostra.push(`  [${p.day}/${p.month}] ${ref}\n     paráfrase: "${p.verse}"\n     literal:   "${literal.slice(0, 130)}"`);
      }
    }
    console.log(`${ok}/${lote.length}`);
  }

  console.log(`\n✓ ${gravados} dia(s) com versículo literal`);
  if (semCorrespondencia) console.log(`  ${semCorrespondencia} sem correspondência clara (ficam só com a paráfrase)`);
  if (recusados) console.log(`  ${recusados} recusados por apontarem versículo fora dos candidatos`);
  console.log('\nAMOSTRA:\n' + amostra.join('\n\n'));
  if (!APLICAR) console.log('\nNada gravado. Rode com --aplicar.');
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
