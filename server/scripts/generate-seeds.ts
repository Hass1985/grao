// Gerador de sementes em escala — com âncoras que impedem invenção:
//
//  1. A PASSAGEM nunca é gerada: vem de passage_pool (curadoria humana) e o
//     TEXTO vem de bible_verses (Bíblia Livre importada). O modelo só escreve
//     reflexão, oração e prática AO REDOR do texto real.
//  2. A MÚSICA vem do pool validado por API (musics), por família.
//  3. NADA vai direto para o usuário: tudo nasce em content_drafts (status
//     'draft') e só vira semente publicada via scripts/review-seeds.ts.
//
// Uso: npm run content:generate            (2 por família = 20 rascunhos)
//      tsx scripts/generate-seeds.ts 3     (3 por família = 30 rascunhos)

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';
const PER_FAMILY = Number(process.argv[2] ?? 2);

const FAMILIES = ['ansiedade','paz','esperança','propósito','gratidão','fé','solidão','luto','culpa','alegria'];
const TYPES = ['reflexão', 'oração', 'prática'];
const SLUG: Record<string, string> = {
  'ansiedade':'ansiedade','paz':'paz','esperança':'esperanca','propósito':'proposito',
  'gratidão':'gratidao','fé':'fe','solidão':'solidao','luto':'luto','culpa':'culpa','alegria':'alegria',
};

// Frases proibidas na voz do Grão (sinalizadas para o revisor).
const FORBIDDEN = /vai dar tudo certo|tudo tem um prop[oó]sito|entendo perfeitamente|sei como voc[eê] se sente|basta ter f[eé]|declare e receba/i;

const SYSTEM = `Você escreve o conteúdo diário do Grão, um devocional para evangélicos brasileiros. Cada "semente" tem: uma passagem bíblica (JÁ DADA — nunca altere o texto), uma reflexão, uma oração e uma prática.

VOZ DO GRÃO: português brasileiro caloroso e simples, frases curtas, profundidade sem jargão teológico, zero melosidade, zero clichê. Fala COM a pessoa (você), nunca sobre ela. Sóbrio teologicamente: nada de promessa de cura/prosperidade garantida, nada de culpa espiritual ("se você orasse mais…"), nada de "vai dar tudo certo".

O QUE ESCREVER (sempre pela ferramenta, exatamente uma vez):
- reflection (2-3 frases): abre o sentido da passagem PARA a família emocional do dia. Concreta, tocando a vida real (trabalho, casa, cansaço, relações). Deve nascer DA passagem dada — não de outra ideia.
- prayer (1-2 frases): oração em primeira pessoa, simples, que a pessoa consiga fazer sua. Conectada à passagem.
- practice (1-2 frases): UMA ação pequena e física, executável hoje em menos de 5 minutos (escrever, respirar, mandar mensagem, observar, silenciar). Nada vago tipo "reflita sobre".
- O campo "type" indica a ÊNFASE da semente (reflexão, oração ou prática): capriche especialmente nesse campo, mas escreva os três.

Varie começos e estruturas entre sementes — nada de fórmulas repetidas.

ANTIRREPETIÇÃO (regra dura): você receberá a lista de práticas e aberturas JÁ existentes nesta família. Sua semente NÃO pode repetir nenhum daqueles gestos nem aquelas estruturas de abertura. Se a prática que você pensou se parece com uma da lista, DESCARTE e invente outra.

Repertório de gestos possíveis (use para variar, não como lista fechada): escrever/riscar/rasgar/guardar papel · respirar contando · colocar a mão no peito ou no batente da porta · falar em voz alta sozinho · mandar mensagem ou ligar para alguém · cantar ou ouvir um trecho · lavar louça/caminhar prestando atenção · abrir a janela e olhar o céu · acender uma luz/vela · arrumar um objeto da casa · beber água devagar · pôr um alarme com um lembrete · escrever num espelho ou geladeira · fazer algo pequeno por outra pessoa · devolver/consertar/pedir desculpa · guardar um objeto que lembra alguém · desligar o celular por 5 minutos · abraçar alguém da casa · anotar no calendário · segurar uma pedra/objeto e depois soltá-lo · subir uma escada ou um degrau devagar · tocar a água da torneira e agradecer · plantar/regar uma planta · varrer um cômodo pequeno · trocar o papel de parede do celular por um versículo · dar bom-dia em voz alta a alguém da rua · sentar no chão por um minuto · alongar os braços para cima ao acordar · apagar as luzes e ficar 1 minuto no escuro em silêncio · escrever com o dedo no vapor do espelho · separar uma roupa ou alimento para doar · caminhar até a esquina e voltar · assobiar ou cantarolar uma melodia · pôr a mão na terra ou na grama · abrir a Bíblia física e deixar o dedo achar a página · segurar uma xícara quente com as duas mãos · escrever uma palavra na palma da mão · tirar uma foto de algo bonito no caminho · guardar uma moeda no bolso como lembrete.`;

const TOOL = {
  name: 'escrever_semente',
  description: 'Entrega a semente escrita. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      reflection: { type: 'string', description: '2-3 frases.' },
      prayer: { type: 'string', description: '1-2 frases, primeira pessoa.' },
      practice: { type: 'string', description: '1 ação concreta, hoje, <5 min.' },
    },
    required: ['reflection', 'prayer', 'practice'],
  },
};

async function passageText(p: any): Promise<string> {
  const { rows } = await pool.query(
    `SELECT text FROM bible_verses WHERE book=$1 AND chapter=$2 AND verse BETWEEN $3 AND $4 ORDER BY verse`,
    [p.book, p.chapter, p.verse_start, p.verse_end ?? p.verse_start]
  );
  return rows.map((r: any) => r.text.trim()).join(' ');
}

async function nextSeedNumber(family: string): Promise<number> {
  const slug = SLUG[family];
  const { rows } = await pool.query(
    `SELECT coalesce(max((regexp_match(id, '-(\\d+)$'))[1]::int), 0) n FROM (
       SELECT id FROM seeds WHERE id LIKE 's-' || $1 || '-%'
       UNION ALL
       SELECT seed_id FROM content_drafts WHERE seed_id LIKE 's-' || $1 || '-%'
     ) x`, [slug]);
  return (rows[0]?.n ?? 0) + 1;
}

// Trava de sanidade: modelo pode emitir lixo (tags internas, truncamento).
function looksCorrupt(s: string): string | null {
  const t = (s ?? '').trim();
  if (t.length < 20) return 'muito curto';
  if (/<\/?\w|antml|&lt;\//i.test(t)) return 'contém marcação/tag';
  if (!/[.!?…][)\]"'”»]?$/.test(t)) return 'sem pontuação final (truncado?)';
  return null;
}

async function main() {
  console.log(`Gerando ${PER_FAMILY} rascunho(s) por família com ${MODEL}…\n`);
  let created = 0;

  for (const family of FAMILIES) {
    // passagens menos usadas primeiro; evita repetir referência já usada em seeds
    const { rows: passages } = await pool.query(
      `SELECT p.* FROM passage_pool p
        WHERE p.family = $1
          AND NOT EXISTS (SELECT 1 FROM seeds s WHERE s.family = $1 AND s.reference = p.reference)
          AND NOT EXISTS (SELECT 1 FROM content_drafts d WHERE d.family = $1 AND d.reference = p.reference AND d.status IN ('draft','approved','published'))
        ORDER BY p.used_count ASC, random() LIMIT $2`,
      [family, PER_FAMILY]);

    // tipos já publicados (para variar a ênfase)
    const { rows: typesRows } = await pool.query(
      `SELECT type, count(*)::int n FROM seeds WHERE family=$1 GROUP BY type`, [family]);
    const typeCount: Record<string, number> = Object.fromEntries(TYPES.map((t) => [t, 0]));
    typesRows.forEach((r: any) => { typeCount[r.type] = r.n; });

    let n = await nextSeedNumber(family);
    for (const p of passages) {
      const type = TYPES.reduce((a, b) => (typeCount[a] <= typeCount[b] ? a : b));
      typeCount[type]++;
      const text = await passageText(p);
      if (!text) { console.log(`  ✗ sem texto para ${p.reference}`); continue; }

      // ANTIRREPETIÇÃO: mostra ao modelo o que a família JÁ tem, para ele
      // divergir. Sem isso cada chamada é cega às outras e converge para os
      // mesmos gestos ("escreva num papel e guarde") — foi o principal achado
      // da auditoria da primeira leva.
      const { rows: existing } = await pool.query(
        `SELECT practice, left(reflection, 60) opening FROM (
           SELECT practice, reflection FROM seeds WHERE family=$1
           UNION ALL
           SELECT practice, reflection FROM content_drafts WHERE family=$1 AND status IN ('draft','approved','published')
         ) x LIMIT 40`, [family]);
      const avoid = existing.length
        ? `\n\nPRÁTICAS JÁ USADAS nesta família (NÃO repita o gesto nem a estrutura):\n${existing.map((e: any) => `- ${e.practice}`).join('\n')}\n\nABERTURAS já usadas (comece de outro jeito):\n${existing.map((e: any) => `- "${e.opening}…"`).join('\n')}`
        : '';

      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 900,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL as any],
        tool_choice: { type: 'tool', name: 'escrever_semente' },
        messages: [{ role: 'user', content:
          `Família emocional: ${family}\nÊnfase (type): ${type}\nPassagem (texto EXATO, não altere): "${text}"\nReferência: ${p.reference}\nContexto da curadoria: ${p.note ?? '—'}${avoid}` }],
      });
      const tu = res.content.find((b) => b.type === 'tool_use');
      if (!tu || tu.type !== 'tool_use') { console.log(`  ✗ sem resposta para ${p.reference}`); continue; }
      const out = tu.input as { reflection: string; prayer: string; practice: string };
      const corrupt = (['reflection','prayer','practice'] as const)
        .map((k) => { const c = looksCorrupt(out[k]); return c ? `${k}: ${c}` : null; }).filter(Boolean);
      if (corrupt.length) { console.log(`  ✗ ${p.reference}: saída inválida (${corrupt.join(', ')}) — descartada`); continue; }

      // música da família, menos usada nos drafts recentes
      const { rows: [music] } = await pool.query(
        `SELECT m.id, m.title, m.artist FROM musics m
          WHERE $1 = ANY(m.families)
          ORDER BY (SELECT count(*) FROM content_drafts d WHERE d.music_id = m.id) ASC, random() LIMIT 1`,
        [family]);

      // checagens automáticas → nota para o revisor
      const issues: string[] = [];
      const all = `${out.reflection} ${out.prayer} ${out.practice}`;
      if (FORBIDDEN.test(all)) issues.push('frase proibida detectada');
      if (out.reflection.length > 420) issues.push('reflexão longa');
      if (out.practice.length > 320) issues.push('prática longa');

      const seedId = `s-${SLUG[family]}-${n++}`;
      await pool.query(
        `INSERT INTO content_drafts (seed_id, family, type, passage, reference, reflection, prayer, practice, music_id, model, review_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [seedId, family, type, text, p.reference, out.reflection.trim(), out.prayer.trim(), out.practice.trim(),
         music?.id ?? null, MODEL, issues.length ? 'auto: ' + issues.join('; ') : null]);
      await pool.query(`UPDATE passage_pool SET used_count = used_count + 1 WHERE id = $1`, [p.id]);
      created++;
      console.log(`  ✓ ${seedId} · ${type} · ${p.reference} · ♪ ${music?.title ?? '—'}${issues.length ? '  ⚠ ' + issues.join('; ') : ''}`);
    }
  }
  console.log(`\n${created} rascunhos criados. Revise com: npm run content:review`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
