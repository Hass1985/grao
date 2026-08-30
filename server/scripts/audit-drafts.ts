// Auditoria de qualidade dos rascunhos — um revisor crítico ANTES do humano.
//
// Analisa família por família (todos os rascunhos juntos), o que permite
// detectar não só problemas individuais como REPETIÇÃO entre sementes da
// mesma família — algo que uma checagem item a item nunca pegaria.
//
// Critérios: fidelidade à passagem · solidez teológica · voz do Grão ·
// prática concreta · variedade.
//
// Uso: npm run content:audit

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_AUDIT_MODEL || 'claude-opus-4-8';

const SYSTEM = `Você é o revisor editorial e teológico do Grão, um devocional diário para evangélicos brasileiros. Recebe as sementes de UMA família emocional e avalia cada uma com rigor — seu trabalho é proteger o usuário e a marca, não elogiar.

Avalie cada semente por 5 critérios:
1. FIDELIDADE — a reflexão nasce mesmo DA passagem citada? Ou usa o versículo como pretexto para outra ideia? Distorce o sentido do texto?
2. TEOLOGIA — há teologia da prosperidade ("declare e receba"), promessa de cura/solução garantida, culpabilização espiritual ("se você tivesse mais fé"), ou fatalismo ("Deus quis assim")? Qualquer um desses = reprovado.
3. VOZ — caloroso, simples, concreto, sem clichê e sem melosidade? Fala COM a pessoa? Frases pesadas ou genéricas demais reprovam.
4. PRÁTICA — é UMA ação física e concreta, executável hoje em menos de 5 minutos? "Reflita sobre" ou "medite em" NÃO é prática concreta.
5. VARIEDADE — comparando com as OUTRAS sementes desta mesma família: há repetição de imagem, estrutura de abertura, metáfora ou prática? Repetição notável merece atenção.

Para CADA semente devolva um veredito:
- "aprovada": pronta para publicar como está.
- "atencao": funciona, mas tem um ponto que o humano deve olhar (repetição, frase fraca, prática limítrofe). Explique o quê.
- "reprovada": problema sério (teologia, distorção da passagem, clichê grave). Explique o quê.

Seja exigente: numa base de qualidade, "aprovada" deve significar realmente boa. Mas não invente problema onde não há.`;

const TOOL = {
  name: 'registrar_auditoria',
  description: 'Registra o veredito de cada semente da família. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      vereditos: {
        type: 'array',
        description: 'Um item por semente recebida, na mesma ordem.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            seed_id: { type: 'string' },
            veredito: { type: 'string', enum: ['aprovada', 'atencao', 'reprovada'] },
            motivo: { type: 'string', description: 'Vazio se aprovada; objetivo e curto caso contrário.' },
            destaque: { type: 'string', description: 'O que ficou especialmente bom (1 frase), ou vazio.' },
          },
          required: ['seed_id', 'veredito', 'motivo', 'destaque'],
        },
      },
      nota_familia: { type: 'string', description: 'Observação geral sobre o conjunto desta família.' },
    },
    required: ['vereditos', 'nota_familia'],
  },
};

interface Verdict { seed_id: string; veredito: string; motivo: string; destaque: string }

async function main() {
  const { rows: families } = await pool.query(
    `SELECT DISTINCT family FROM content_drafts WHERE status='draft' ORDER BY family`);
  if (!families.length) { console.log('Nenhum rascunho pendente.'); return; }

  const totals = { aprovada: 0, atencao: 0, reprovada: 0 };
  const flagged: Verdict[] = [];

  for (const { family } of families) {
    // Só o que ainda não foi auditado. Sem esse filtro, reauditar custaria a
    // base inteira de novo a cada rodada.
    const { rows: drafts } = await pool.query(
      `SELECT seed_id, type, passage, reference, reflection, prayer, practice
         FROM content_drafts WHERE status='draft' AND family=$1 AND audited_at IS NULL
         ORDER BY seed_id`, [family]);
    if (!drafts.length) continue;

    // Contexto de VARIEDADE: as práticas/aberturas das OUTRAS sementes da
    // família (auditadas ou publicadas). Vai como referência compacta, para o
    // revisor comparar sem precisar receber cada semente por inteiro.
    const { rows: contexto } = await pool.query(
      `SELECT seed_id, practice, left(reflection, 70) opening FROM (
         SELECT id seed_id, practice, reflection FROM seeds WHERE family = $1
         UNION ALL
         SELECT seed_id, practice, reflection FROM content_drafts
          WHERE family = $1 AND status = 'draft' AND audited_at IS NOT NULL
       ) x ORDER BY seed_id`, [family]);

    const refVariedade = contexto.length
      ? `\n\nOUTRAS SEMENTES JÁ EXISTENTES nesta família (use só para julgar VARIEDADE — não as avalie):\n` +
        contexto.map((c: any) => `- ${c.seed_id} · prática: ${c.practice}\n  abertura: "${c.opening}…"`).join('\n')
      : '';

    // Lotes pequenos: com ~27 sementes de uma vez o modelo parou de emitir
    // veredito no meio e 41 sementes ficaram sem julgamento. 12 é seguro.
    const LOTE = 12;
    for (let ini = 0; ini < drafts.length; ini += LOTE) {
      const lote = drafts.slice(ini, ini + LOTE);
      const nLote = Math.floor(ini / LOTE) + 1;
      const totLotes = Math.ceil(drafts.length / LOTE);

      const payload = lote.map((d: any, i: number) =>
        `--- SEMENTE ${i + 1} · id: ${d.seed_id} · ênfase: ${d.type} ---
PASSAGEM (${d.reference}): "${d.passage}"
REFLEXÃO: ${d.reflection}
ORAÇÃO: ${d.prayer}
PRÁTICA: ${d.practice}`).join('\n\n');

      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL as any],
        tool_choice: { type: 'tool', name: 'registrar_auditoria' },
        messages: [{ role: 'user', content:
          `Família emocional: ${family}\nAvalie as ${lote.length} sementes abaixo (lote ${nLote}/${totLotes}). Devolva um veredito para CADA UMA, sem exceção.\n\n${payload}${refVariedade}` }],
      });
      if (res.stop_reason === 'max_tokens') {
        console.log(`✗ ${family} lote ${nLote}: resposta truncada — lote NÃO auditado`);
        continue;
      }
      const tu = res.content.find((b) => b.type === 'tool_use');
      if (!tu || tu.type !== 'tool_use') { console.log(`✗ auditoria falhou para ${family} lote ${nLote}`); continue; }
      const out = tu.input as { vereditos: Verdict[]; nota_familia: string };

      // O revisor precisa julgar TODAS as sementes do lote: um veredito
      // faltando viraria aprovação silenciosa na hora de publicar.
      const idsLote = new Set(lote.map((d: any) => d.seed_id));
      const vereditos = out.vereditos.filter((v) => idsLote.has(v.seed_id));
      const julgados = new Set(vereditos.map((v) => v.seed_id));
      const faltando = lote.filter((d: any) => !julgados.has(d.seed_id)).map((d: any) => d.seed_id);
      if (faltando.length) console.log(`  ⚠ ${family}: sem veredito para ${faltando.join(', ')} — seguem não auditadas`);
      console.log(`\n═══ ${family.toUpperCase()} · lote ${nLote}/${totLotes} ═══`);
      for (const v of vereditos) {
        const icon = v.veredito === 'aprovada' ? '✓' : v.veredito === 'atencao' ? '⚠' : '✗';
        console.log(`  ${icon} ${v.seed_id}${v.motivo ? ` — ${v.motivo}` : ''}`);
        totals[v.veredito as keyof typeof totals]++;
        if (v.veredito !== 'aprovada') flagged.push(v);
        // A nota fica no rascunho para o revisor humano ver; audited_at marca
        // que esta semente JÁ passou pelo revisor (aprovada ou não).
        await pool.query(
          `UPDATE content_drafts SET review_note = $2, audited_at = now() WHERE seed_id = $1`,
          [v.seed_id, v.veredito === 'aprovada' ? null : `auditoria(${v.veredito}): ${v.motivo}`]);
      }
      if (out.nota_familia) console.log(`  › ${out.nota_familia}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`RESULTADO: ${totals.aprovada} aprovadas · ${totals.atencao} atenção · ${totals.reprovada} reprovadas`);
  if (flagged.length) {
    console.log(`\nPrecisam do seu olhar (${flagged.length}):`);
    flagged.forEach((f) => console.log(`  ${f.seed_id}: ${f.motivo}`));
  }
  console.log(`\nPublicar as aprovadas: npm run content:review -- approve-all`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
