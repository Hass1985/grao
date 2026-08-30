// Regenera os rascunhos marcados pela auditoria (atenção/reprovada),
// mantendo a mesma passagem mas com o contexto ANTIRREPETIÇÃO: o modelo vê
// as práticas e aberturas já existentes na família e é obrigado a divergir.
//
// Mantém a semente aprovada intocada; reescreve só o que foi marcado.
// Uso: npm run content:regen

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';

const SYSTEM = `Você reescreve uma semente do Grão (devocional diário para evangélicos brasileiros) que foi REPROVADA na revisão editorial. Você recebe: a passagem (texto exato), a versão antiga, o motivo da reprovação, e as práticas/aberturas já usadas nesta família.

Sua missão: escrever uma versão NOVA que resolva exatamente o motivo apontado.

VOZ DO GRÃO: português brasileiro caloroso e simples, frases curtas, profundidade sem jargão, zero clichê, zero melosidade. Fala COM a pessoa. Teologicamente sóbrio: nada de prosperidade, cura garantida, culpa espiritual ou fatalismo.

REGRAS DURAS:
- A reflexão (2-3 frases) precisa nascer DA passagem dada, não de outra ideia.
- A oração (1-2 frases) em primeira pessoa, simples.
- A prática deve ser UMA ação física concreta, executável hoje em menos de 5 minutos — e OBRIGATORIAMENTE DIFERENTE de todas as práticas listadas como já usadas. Nada de "reflita sobre".
- A abertura da reflexão não pode repetir as aberturas listadas.
- Se o motivo apontar erro literal (contradição, texto quebrado), corrija-o.

Repertório de gestos para variar: respirar contando · mão no peito ou no batente da porta · falar em voz alta sozinho · mandar mensagem ou ligar · cantar/ouvir um trecho · caminhar prestando atenção · abrir a janela e olhar o céu · acender uma luz · arrumar um objeto · beber água devagar · alarme com lembrete · escrever no espelho/geladeira · fazer algo pequeno por alguém · pedir desculpa ou agradecer a alguém · guardar um objeto · desligar o celular 5 minutos · abraçar alguém · anotar no calendário · lavar o rosto · olhar uma foto · segurar uma pedra/objeto e depois soltá-lo · subir uma escada ou um degrau devagar · tocar a água da torneira e agradecer · plantar/regar uma planta · varrer um cômodo pequeno · trocar o papel de parede do celular por um versículo · dar bom-dia em voz alta a alguém da rua · sentar no chão por um minuto · alongar os braços para cima ao acordar · apagar as luzes e ficar 1 minuto no escuro em silêncio · escrever com o dedo no vapor do espelho · separar uma roupa ou alimento para doar · caminhar até a esquina e voltar · assobiar ou cantarolar uma melodia · pôr a mão na terra ou na grama · abrir a Bíblia física e deixar o dedo achar a página · segurar uma xícara quente com as duas mãos · escrever uma palavra na palma da mão · tirar uma foto de algo bonito no caminho · guardar uma moeda no bolso como lembrete.`;

const TOOL = {
  name: 'reescrever_semente',
  description: 'Entrega a nova versão. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      reflection: { type: 'string' },
      prayer: { type: 'string' },
      practice: { type: 'string' },
      o_que_mudou: { type: 'string', description: 'Como esta versão resolve o motivo apontado.' },
    },
    required: ['reflection', 'prayer', 'practice', 'o_que_mudou'],
  },
};

// Trava de sanidade: o modelo ocasionalmente emite lixo (tags internas,
// texto truncado). Isso NUNCA pode chegar ao banco.
export function looksCorrupt(s: string): string | null {
  const t = (s ?? '').trim();
  if (t.length < 20) return 'muito curto';
  if (/<\/?\w|antml|&lt;\//i.test(t)) return 'contém marcação/tag';
  if (!/[.!?…][)\]"'”»]?$/.test(t)) return 'sem pontuação final (truncado?)';
  return null;
}

async function main() {
  const { rows: flagged } = await pool.query(
    `SELECT * FROM content_drafts WHERE status='draft' AND review_note LIKE 'auditoria%' ORDER BY family, seed_id`);
  if (!flagged.length) { console.log('Nenhum rascunho marcado. Rode npm run content:audit antes.'); return; }
  console.log(`Regenerando ${flagged.length} rascunho(s) marcado(s)…\n`);

  let done = 0;
  for (const d of flagged) {
    // práticas/aberturas das sementes que NÃO serão reescritas (as boas)
    const { rows: keep } = await pool.query(
      `SELECT practice, left(reflection,60) opening FROM (
         SELECT practice, reflection FROM seeds WHERE family=$1
         UNION ALL
         SELECT practice, reflection FROM content_drafts
          WHERE family=$1 AND status='draft' AND seed_id <> $2
            AND (review_note IS NULL OR review_note NOT LIKE 'auditoria%')
       ) x LIMIT 40`, [d.family, d.seed_id]);

    const prompt =
      `Família: ${d.family}\nÊnfase: ${d.type}\nPassagem (${d.reference}): "${d.passage}"\n\n` +
      `VERSÃO ANTIGA:\nREFLEXÃO: ${d.reflection}\nORAÇÃO: ${d.prayer}\nPRÁTICA: ${d.practice}\n\n` +
      `MOTIVO DA REPROVAÇÃO: ${d.review_note}\n\n` +
      (keep.length
        ? `PRÁTICAS JÁ USADAS na família (proibido repetir o gesto):\n${keep.map((k: any) => `- ${k.practice}`).join('\n')}\n\nABERTURAS já usadas:\n${keep.map((k: any) => `- "${k.opening}…"`).join('\n')}`
        : '');

    let out: { reflection: string; prayer: string; practice: string; o_que_mudou: string } | null = null;
    for (let attempt = 1; attempt <= 3 && !out; attempt++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL as any],
        tool_choice: { type: 'tool', name: 'reescrever_semente' },
        messages: [{ role: 'user', content: prompt }],
      });
      const tu = res.content.find((b) => b.type === 'tool_use');
      if (!tu || tu.type !== 'tool_use') continue;
      const cand = tu.input as { reflection: string; prayer: string; practice: string; o_que_mudou: string };
      const bad = (['reflection', 'prayer', 'practice'] as const)
        .map((k) => { const p = looksCorrupt(cand[k]); return p ? `${k}: ${p}` : null; })
        .filter(Boolean);
      if (bad.length) { console.log(`  ↻ ${d.seed_id}: saída inválida (${bad.join(', ')}) — tentativa ${attempt}`); continue; }
      out = cand;
    }
    if (!out) { console.log(`  ✗ ${d.seed_id}: não produziu saída válida em 3 tentativas`); continue; }

    // audited_at volta a NULL de propósito: a versão reescrita é conteúdo novo
    // e precisa passar pelo revisor de novo. Sem isso ela entraria na
    // publicação como "auditada e aprovada" sem nunca ter sido julgada.
    await pool.query(
      `UPDATE content_drafts
          SET reflection=$2, prayer=$3, practice=$4, review_note=NULL, audited_at=NULL,
              model=$5, created_at=now()
        WHERE seed_id=$1`,
      [d.seed_id, out.reflection.trim(), out.prayer.trim(), out.practice.trim(), MODEL + ' (regen)']);
    done++;
    console.log(`  ✓ ${d.seed_id} — ${out.o_que_mudou}`);
  }
  console.log(`\n${done} regenerados. Audite de novo: npm run content:audit`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
