// Etiqueta o GESTO de cada semente com um vocabulário controlado.
//
// Por que não basta a similaridade léxica: "segure um objeto na palma" e
// "ponha a mão no peito" não compartilham quase nenhuma palavra, mas são o
// mesmo gesto para quem executa. O usuário percebe a repetição do CORPO, não
// do vocabulário. Só um rótulo semântico captura isso.
//
// O seletor usa esse rótulo para garantir que dois gestos iguais não caiam
// dentro da janela de proteção (COOLDOWN_DIAS em seedSelector.ts).
//
// Uso: npm run content:gestures          (só as sementes ainda sem rótulo)
//      tsx scripts/label-gestures.ts --all   (reetiqueta tudo)

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../src/db.js';

const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';
const TODAS = process.argv.includes('--all');
const LOTE = 20;

// Vocabulário fechado: rótulos livres viram sinônimos ("escrever" vs
// "anotar") e a garantia deixa de valer.
const GESTOS = [
  'escrever_papel', 'rasgar_ou_riscar', 'guardar_objeto', 'segurar_objeto',
  'respirar', 'mao_no_corpo', 'tocar_movel_ou_parede', 'falar_em_voz_alta',
  'ligar_ou_mensagem', 'fazer_algo_por_alguem', 'abracar', 'pedir_desculpa',
  'cantar_ou_ouvir', 'caminhar', 'alongar_ou_levantar', 'olhar_janela_ou_ceu',
  'olhar_foto', 'acender_luz', 'apagar_luz_ou_silencio', 'desligar_celular',
  'beber_agua', 'lavar_rosto_ou_louca', 'arrumar_ou_limpar', 'plantar_ou_regar',
  'tocar_agua_ou_terra', 'usar_celular_apagar_ou_trocar', 'alarme_ou_calendario',
  'escrever_espelho_ou_geladeira', 'sentar_ou_deitar', 'outro',
] as const;

const SYSTEM = `Você classifica o GESTO FÍSICO central de práticas devocionais, usando um vocabulário fechado.

Regra única: escolha o rótulo que descreve O QUE O CORPO FAZ, não o significado espiritual. "Escreva o nome de quem partiu e guarde o papel" → o corpo escreve: escrever_papel. "Ponha a mão no peito e sinta a respiração" → mao_no_corpo (a mão é o gesto dominante; respirar é secundário).

Quando a prática tem dois gestos, escolha o DOMINANTE: aquele sem o qual a prática deixa de existir.

REGRA CRÍTICA sobre falar: quase toda prática do Grão termina com uma frase dita em voz alta — isso é o ACOMPANHAMENTO, não o gesto. Só use falar_em_voz_alta quando FALAR for a única ação física da prática, sem nenhum outro gesto. "Beba um copo de água devagar e diga: Deus, é a ti que eu olho" → beber_agua, não falar_em_voz_alta. "Vá até a janela, olhe o céu e repita a frase" → olhar_janela_ou_ceu. "Diga em voz alta três vezes: eu confio" → aí sim, falar_em_voz_alta.

A mesma lógica vale para respirar: só use respirar quando a respiração for a prática inteira, não quando acompanha outro gesto.

Use 'outro' apenas quando nenhum rótulo servir — evite, é o último recurso.

Vocabulário permitido (use exatamente estas strings): ${GESTOS.join(', ')}`;

const TOOL = {
  name: 'etiquetar',
  description: 'Devolve o gesto de cada prática recebida. Chame exatamente uma vez.',
  strict: true as const,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      rotulos: {
        type: 'array',
        description: 'Um item por prática recebida, na mesma ordem.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            seed_id: { type: 'string' },
            gesto: { type: 'string', enum: GESTOS as unknown as string[] },
          },
          required: ['seed_id', 'gesto'],
        },
      },
    },
    required: ['rotulos'],
  },
};

async function main() {
  const { rows: sementes } = await pool.query<{ id: string; practice: string }>(
    `SELECT id, practice FROM seeds ${TODAS ? '' : 'WHERE gesture IS NULL'} ORDER BY family, id`);
  if (!sementes.length) { console.log('Todas as sementes já têm gesto.'); return; }
  console.log(`Etiquetando ${sementes.length} semente(s)…\n`);

  let feitas = 0;
  const contagem = new Map<string, number>();

  for (let ini = 0; ini < sementes.length; ini += LOTE) {
    const lote = sementes.slice(ini, ini + LOTE);
    const payload = lote.map((s) => `${s.id} :: ${s.practice}`).join('\n');

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [TOOL as any],
      tool_choice: { type: 'tool', name: 'etiquetar' },
      messages: [{ role: 'user', content: `Classifique as ${lote.length} práticas abaixo. Devolva um rótulo para CADA uma.\n\n${payload}` }],
    });
    const tu = res.content.find((b) => b.type === 'tool_use');
    if (!tu || tu.type !== 'tool_use') { console.log(`✗ lote ${ini / LOTE + 1} falhou`); continue; }
    const { rotulos } = tu.input as { rotulos: Array<{ seed_id: string; gesto: string }> };

    const ids = new Set(lote.map((s) => s.id));
    for (const r of rotulos) {
      if (!ids.has(r.seed_id)) continue;
      await pool.query(`UPDATE seeds SET gesture = $2 WHERE id = $1`, [r.seed_id, r.gesto]);
      contagem.set(r.gesto, (contagem.get(r.gesto) ?? 0) + 1);
      feitas++;
    }
    const faltando = lote.filter((s) => !rotulos.some((r) => r.seed_id === s.id)).map((s) => s.id);
    if (faltando.length) console.log(`  ⚠ sem rótulo: ${faltando.join(', ')}`);
    process.stdout.write(`  ${feitas}/${sementes.length}\r`);
  }

  console.log(`\n\n${feitas} etiquetadas. Distribuição:`);
  [...contagem.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([g, n]) => console.log(`  ${String(n).padStart(3)} ${g}`));

  const { rows: [f] } = await pool.query(`SELECT count(*)::int n FROM seeds WHERE gesture IS NULL`);
  if (f.n) console.log(`\n⚠ ${f.n} semente(s) seguem sem gesto — rode de novo.`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
