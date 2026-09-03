// Reescreve as reflexões que não cabem no template do WhatsApp.
//
// O problema: o corpo do template tem 1024 caracteres para a mensagem MONTADA,
// e uma minoria das sementes passa disso. Cortar no envio resolveria o limite
// e estragaria o produto — a pessoa receberia um texto terminado em "…" e
// pensaria que faltou alguma coisa.
//
// A saída é reescrever na ORIGEM: o conteúdo é nosso, então a reflexão vira
// uma versão mais enxuta e COMPLETA, revisada como qualquer outra. No envio
// não sobra nada para cortar.
//
// Uso: npm run content:fit          (mostra o que faria)
//      npm run content:fit -- gravar

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';
const GRAVAR = process.argv.includes('gravar');

const LIMITE = 1024;
// Texto fixo do template, sem as variáveis. O fecho fica no corpo porque a
// Meta não aceita corpo terminado em variável.
const MOLDE = 'Olá , sua semente de hoje 🌱\n\n""\n— \n\n\n\nPrática de hoje: \n\n🎵 \n\nQue Deus te guarde. 🌱';
const NOME_LONGO = 12;   // margem para nomes compridos

const SYSTEM = `Você é o editor do Grão, um devocional diário para evangélicos brasileiros. Sua tarefa: encurtar UMA reflexão que não cabe no limite do WhatsApp, sem que o leitor perceba que ela foi encurtada.

O resultado precisa ser uma reflexão INTEIRA — começo, meio e fim — e não um trecho. Nada de reticências, nada de frase interrompida. Se o leitor comparasse com a versão longa, deveria achar as duas igualmente completas; a curta apenas mais direta.

COMO ENCURTAR, nesta ordem:
1. Corte redundância: ideia repetida com outras palavras, adjetivo que não acrescenta, exemplo a mais.
2. Junte frases que dizem a mesma coisa.
3. Troque construções longas por diretas ("naquilo que você está vivendo" → "no que você vive").
4. Só então, se ainda não couber, sacrifique o detalhe MENOS essencial — nunca a ideia central nem a ligação com a passagem.

O QUE NÃO PODE MUDAR: a ideia central, a ancoragem na passagem citada, a voz do Grão (português brasileiro caloroso e simples, frases curtas, sem clichê, sem melosidade, falando COM a pessoa).

PROIBIDO: "vai dar tudo certo", "tudo tem um propósito", "entendo perfeitamente", "sei como você se sente". Também é proibido afirmar coisas sobre a vida da pessoa que ela não contou.`;

const TOOL = {
  name: 'encurtar',
  description: 'Devolve a reflexão reescrita. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      reflexao: { type: 'string', description: 'Versão nova, completa, dentro do limite pedido.' },
      o_que_saiu: { type: 'string', description: 'O que foi cortado e por quê, em uma frase.' },
    },
    required: ['reflexao', 'o_que_saiu'],
  },
};

function orcamentoDaReflexao(s: any, musica: string): number {
  const fixo = MOLDE.length + NOME_LONGO + s.passage.length + s.reference.length +
    s.practice.length + musica.length;
  return LIMITE - fixo;
}

function completa(t: string): string | null {
  const x = (t ?? '').trim();
  if (x.length < 40) return 'curta demais';
  if (/[…]|\.\.\.$/.test(x)) return 'contém reticências';
  if (!/[.!?]$/.test(x)) return 'não termina em pontuação';
  if (/<\/?\w|antml/i.test(x)) return 'contém marcação';
  return null;
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, family, passage, reference, reflection, practice,
            music_title, music_artist, coalesce(music_spotify, music_youtube) url
       FROM seeds ORDER BY id`);

  const foraDoLimite = rows
    .map((s: any) => {
      const musica = `${s.music_title}, de ${s.music_artist} — ${s.url}`;
      return { s, musica, orcamento: orcamentoDaReflexao(s, musica) };
    })
    .filter((x) => x.s.reflection.length > x.orcamento);

  if (!foraDoLimite.length) { console.log('Todas as sementes cabem no template ✓'); return; }
  console.log(`${foraDoLimite.length} semente(s) não cabem${GRAVAR ? '' : ' — modo simulação, nada será gravado'}\n`);

  let ok = 0;
  for (const { s, orcamento } of foraDoLimite) {
    // Mira em 92% do orçamento: margem para nome comprido e para a contagem
    // de emoji, que o WhatsApp pode medir diferente de nós.
    const alvo = Math.floor(orcamento * 0.92);

    let nova: { reflexao: string; o_que_saiu: string } | null = null;
    for (let tentativa = 1; tentativa <= 3 && !nova; tentativa++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [TOOL as any],
        tool_choice: { type: 'tool', name: 'encurtar' },
        messages: [{ role: 'user', content:
          `Família: ${s.family}\nPassagem (${s.reference}): "${s.passage}"\n\n` +
          `REFLEXÃO ATUAL (${s.reflection.length} caracteres):\n${s.reflection}\n\n` +
          `LIMITE: no máximo ${alvo} caracteres. Precisa de ${s.reflection.length - alvo} a menos.` }],
      });
      const tu = res.content.find((b) => b.type === 'tool_use');
      if (!tu || tu.type !== 'tool_use') continue;
      const cand = tu.input as { reflexao: string; o_que_saiu: string };

      const problema = completa(cand.reflexao);
      if (problema) { console.log(`  ↻ ${s.id}: ${problema} — tentativa ${tentativa}`); continue; }
      if (cand.reflexao.length > orcamento) {
        console.log(`  ↻ ${s.id}: ainda tem ${cand.reflexao.length} (cabe ${orcamento}) — tentativa ${tentativa}`);
        continue;
      }
      nova = cand;
    }

    if (!nova) { console.log(`  ✗ ${s.id}: não consegui encurtar em 3 tentativas`); continue; }

    console.log(`  ✓ ${s.id}: ${s.reflection.length} → ${nova.reflexao.length} caracteres (cabe ${orcamento})`);
    console.log(`     ${nova.o_que_saiu}`);
    if (GRAVAR) {
      await pool.query(`UPDATE seeds SET reflection = $2 WHERE id = $1`, [s.id, nova.reflexao.trim()]);
      await pool.query(
        `UPDATE content_drafts SET reflection = $2 WHERE seed_id = $1`, [s.id, nova.reflexao.trim()]);
    }
    ok++;
  }

  console.log(`\n${ok} de ${foraDoLimite.length} encurtadas${GRAVAR ? ' e gravadas' : ' (simulação)'}`);
  if (!GRAVAR && ok) console.log('Para gravar: npm run content:fit -- gravar');
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
