// Tira o travessão (—) dos textos das sementes.
//
// O travessão virou assinatura de texto de IA. Numa reflexão devocional isso
// custa caro: a pessoa não sabe nomear o que estranhou, mas sente que não foi
// gente que escreveu — e o produto inteiro depende de parecer que foi.
//
// NÃO é um replace de caractere. Apagar o travessão deixaria "a gratidão aqui
// é isso olhar para trás", que é pior do que o problema. Cada caso pede uma
// pontuação diferente: dois-pontos quando o que vem depois explica, vírgula
// quando é aposto, ponto quando são duas frases inteiras. Por isso o modelo
// reescreve a pontuação.
//
// A trava contra o modelo passar do ponto: as PALAVRAS têm que ser as mesmas.
// As 380 sementes já foram lidas e aprovadas uma a uma; um script que
// "melhora" o texto de passagem desfaz esse trabalho sem ninguém perceber.
// Depois de cada resposta, comparamos a sequência de palavras antes e depois,
// ignorando pontuação e maiúscula. Diferiu, a semente é recusada e fica como
// estava — o relatório final diz quais.
//
// O hífen comum NÃO é tocado: ele é ortografia ("meio-dia"), é intervalo de
// versículo ("Provérbios 3:5-6") e é id interno ("s-gratidao-28").
//
// Rode `npm run content:backup` antes. Uso: npm run content:travessao [--aplicar]

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';
const CAMPOS = ['reflection', 'prayer', 'practice'] as const;
type Campo = (typeof CAMPOS)[number];
const APLICAR = process.argv.includes('--aplicar');
const LOTE = 6;

/**
 * O ensaio GRAVA a proposta em disco, e `--aplicar` a reaproveita.
 *
 * Sem isso, revisar antes de gravar custa duas passadas completas pelo modelo
 * — foi exatamente o que aconteceu aqui: a segunda passada esbarrou no saldo
 * da API no meio, e o trabalho ficou pela metade. Revisar não pode custar o
 * dobro, senão ninguém revisa.
 */
const PROPOSTA = 'db/backups/travessao-proposta.json';

const SISTEMA = `Você reescreve a PONTUAÇÃO de textos devocionais em português brasileiro. Só isso.

Tarefa: remover todo travessão (—) do texto, substituindo pela pontuação que a frase pede.

Escolha conforme o sentido:
- dois-pontos, quando o que vem depois do travessão explica ou especifica o que veio antes;
- vírgula, quando é aposto, ressalva ou complemento;
- ponto final, quando os dois lados são frases independentes (aí a próxima palavra começa com maiúscula);
- parênteses ou vírgulas, quando há DOIS travessões cercando um trecho.

REGRAS DURAS:
- NÃO troque, acrescente ou remova NENHUMA palavra. A sequência de palavras tem que ficar idêntica.
- NÃO mexa em hífen: "meio-dia", "bem-vindo", "3:5-6" continuam como estão.
- NÃO mexa em aspas, reticências, pontos de interrogação ou exclamação já existentes.
- Só altere maiúscula/minúscula quando o travessão virar ponto final.
- Se o texto não tiver travessão, devolva exatamente como veio.`;

const FERRAMENTA = {
  name: 'devolver',
  description: 'Devolve os textos com a pontuação corrigida. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      textos: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            id: { type: 'string' as const },
            campo: { type: 'string' as const, enum: [...CAMPOS] },
            texto: { type: 'string' as const },
          },
          required: ['id', 'campo', 'texto'],
        },
      },
    },
    required: ['textos'],
  },
};

/** Sequência de palavras, sem pontuação nem maiúscula — a impressão digital do texto. */
function palavras(t: string): string {
  return t
    .toLowerCase()
    .replace(/[—–]/g, ' ')
    // hífen entre letras/números é parte da palavra e fica; o resto da
    // pontuação some, porque é justamente ela que estamos autorizando a mudar.
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s-\s/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

interface Pendencia { id: string; campo: Campo; original: string; }

async function reescrever(lote: Pendencia[]): Promise<Map<string, string>> {
  const entrada = lote.map((p) => ({ id: p.id, campo: p.campo, texto: p.original }));
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SISTEMA,
    tools: [FERRAMENTA],
    tool_choice: { type: 'tool', name: 'devolver' },
    messages: [{ role: 'user', content: JSON.stringify(entrada, null, 1) }],
  });

  if (r.stop_reason === 'max_tokens') {
    console.warn('  ⚠ resposta truncada — lote descartado, será tentado sozinho');
    return new Map();
  }
  const uso = r.content.find((c) => c.type === 'tool_use');
  if (!uso || uso.type !== 'tool_use') return new Map();

  const saida = new Map<string, string>();
  for (const t of (uso.input as any).textos ?? []) {
    saida.set(`${t.id}|${t.campo}`, t.texto);
  }
  return saida;
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, reflection, prayer, practice FROM seeds
      WHERE reflection LIKE '%—%' OR prayer LIKE '%—%' OR practice LIKE '%—%'
      ORDER BY id`);

  const pendentes: Pendencia[] = [];
  for (const s of rows) {
    for (const c of CAMPOS) {
      if (String(s[c] ?? '').includes('—')) {
        pendentes.push({ id: s.id, campo: c, original: s[c] });
      }
    }
  }

  console.log(`${pendentes.length} trechos com travessão, em ${rows.length} sementes`);
  console.log(`modo: ${APLICAR ? 'GRAVANDO no banco' : 'ensaio (use --aplicar para gravar)'}\n`);
  if (!pendentes.length) { await pool.end(); return; }

  const aprovados: Pendencia[] = [];
  const recusados: { p: Pendencia; motivo: string }[] = [];
  const amostra: string[] = [];

  // Reaproveita a proposta do ensaio: só entra o que ainda tem travessão hoje,
  // então rodar de novo depois de uma interrupção continua de onde parou.
  const salvas = new Map<string, string>();
  if (existsSync(PROPOSTA)) {
    for (const r of JSON.parse(readFileSync(PROPOSTA, 'utf-8'))) {
      salvas.set(`${r.id}|${r.campo}`, r.texto);
    }
    console.log(`proposta anterior encontrada: ${salvas.size} trecho(s) já reescritos\n`);
  }

  for (let i = 0; i < pendentes.length; i += LOTE) {
    const lote = pendentes.slice(i, i + LOTE);
    // Já reescrito no ensaio? Não gasta chamada.
    const faltando = lote.filter((p) => !salvas.has(`${p.id}|${p.campo}`));
    let saida = new Map<string, string>();
    for (const p of lote) {
      const j = salvas.get(`${p.id}|${p.campo}`);
      if (j !== undefined) saida.set(`${p.id}|${p.campo}`, j);
    }

    if (faltando.length) {
      process.stdout.write(`  lote ${Math.floor(i / LOTE) + 1}/${Math.ceil(pendentes.length / LOTE)}… `);
      try {
        for (const [k, v] of await reescrever(faltando)) saida.set(k, v);
      } catch (e: any) {
        console.log(`erro: ${e.message}`);
        for (const p of faltando) recusados.push({ p, motivo: 'falha na chamada' });
        // Saldo esgotado ou chave inválida não melhora na próxima tentativa:
        // insistir só queima o resto dos lotes com o mesmo erro e enterra a
        // causa no meio de centenas de linhas iguais.
        if (/credit balance|authentication|invalid x-api-key/i.test(e.message)) {
          console.log('\n✗ interrompido: a API da Anthropic recusou por saldo/chave.');
          console.log('  O que já foi reescrito está salvo. Recarregue os créditos e rode de novo.');
          break;
        }
        continue;
      }
    }

    let ok = 0;
    for (const p of lote) {
      const novo = saida.get(`${p.id}|${p.campo}`);
      if (novo === undefined) { recusados.push({ p, motivo: 'não voltou na resposta' }); continue; }
      if (novo.includes('—')) { recusados.push({ p, motivo: 'travessão continuou' }); continue; }
      if (palavras(novo) !== palavras(p.original)) {
        recusados.push({ p, motivo: 'as palavras mudaram' });
        continue;
      }
      aprovados.push({ ...p, original: novo });
      ok++;
      if (amostra.length < 6) {
        amostra.push(`  [${p.id} · ${p.campo}]\n    antes: ${p.original.slice(0, 150)}\n    agora: ${novo.slice(0, 150)}`);
      }
    }
    if (faltando.length) console.log(`${ok}/${lote.length} ok`);
  }

  // Salva a proposta ANTES de qualquer gravação: se o banco falhar no meio, o
  // trabalho do modelo não se perde.
  mkdirSync('db/backups', { recursive: true });
  writeFileSync(PROPOSTA,
    JSON.stringify(aprovados.map((p) => ({ id: p.id, campo: p.campo, texto: p.original })), null, 1),
    'utf-8');

  console.log('\nAMOSTRA DO QUE MUDOU:\n');
  console.log(amostra.join('\n\n'));

  if (recusados.length) {
    console.log(`\n⚠ ${recusados.length} trecho(s) recusados (ficam como estão):`);
    for (const { p, motivo } of recusados.slice(0, 15)) {
      console.log(`  ${p.id} · ${p.campo} — ${motivo}`);
    }
  }

  if (APLICAR && aprovados.length) {
    for (const p of aprovados) {
      await pool.query(`UPDATE seeds SET ${p.campo} = $2 WHERE id = $1`, [p.id, p.original]);
    }
    console.log(`\n✓ ${aprovados.length} trecho(s) gravados`);
  } else {
    console.log(`\n${aprovados.length} trecho(s) prontos em ${PROPOSTA}.`);
    console.log('Rode com --aplicar para gravar (não gasta chamada de novo).');
  }

  await pool.end();
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
