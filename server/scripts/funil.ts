// Mostra onde cada testador parou no fluxo.
//
// Existe porque a primeira rodada de testes deixou uma pergunta sem resposta:
// o sócio fez o onboarding e o WhatsApp não conectou — mas não havia como
// saber se ele pulou a tela, se a chamada falhou, ou se o build era antigo.
//
// A ligação com o WhatsApp falha em SILÊNCIO de propósito (uma queda de rede
// não pode travar o onboarding de alguém). O preço disso é justamente este:
// sem um funil, o silêncio some.
//
// Uso: npm run funil

import 'dotenv/config';
import { pool } from '../src/db.js';

const ETAPAS = [
  ['abriu', 'usuário criado'],
  ['abertura', 'contou o que está vivendo'],
  ['perfil', 'cérebro montou o perfil'],
  ['whatsapp', 'ligou o WhatsApp'],
  ['aviso', 'recebeu o aviso diário'],
  ['plantou', 'tocou em Plantar'],
] as const;

async function main() {
  const { rows } = await pool.query(`
    SELECT u.id, coalesce(u.name, '(sem nome)') nome, u.created_at,
           EXISTS (SELECT 1 FROM conversation_turns t WHERE t.user_id = u.id AND t.role = 'user') abertura,
           EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id) perfil,
           (u.phone_e164 IS NOT NULL AND u.wa_opt_in_at IS NOT NULL) whatsapp,
           EXISTS (SELECT 1 FROM seed_deliveries d WHERE d.user_id = u.id) aviso,
           EXISTS (SELECT 1 FROM seed_deliveries d WHERE d.user_id = u.id AND d.planted) plantou,
           u.delivery_time
      FROM users u
     ORDER BY u.created_at DESC LIMIT 20`);

  if (!rows.length) { console.log('Nenhum usuário ainda.'); return; }

  console.log('FUNIL — onde cada pessoa parou\n');
  const totais: Record<string, number> = {};

  for (const u of rows as any[]) {
    const estado: Record<string, boolean> = {
      abriu: true, abertura: u.abertura, perfil: u.perfil,
      whatsapp: u.whatsapp, aviso: u.aviso, plantou: u.plantou,
    };
    const trilha = ETAPAS.map(([k]) => (estado[k] ? '●' : '○')).join('');
    // primeira etapa não cumprida = onde parou
    const parou = ETAPAS.find(([k]) => !estado[k]);
    ETAPAS.forEach(([k]) => { if (estado[k]) totais[k] = (totais[k] ?? 0) + 1; });

    const quando = new Date(u.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).slice(0, 16);
    console.log(`  ${trilha}  ${quando}  ${u.nome.padEnd(14)} ${parou ? `parou antes de: ${parou[1]}` : 'ciclo completo ✓'}`);
  }

  console.log(`\n  legenda: ${ETAPAS.map(([, d], i) => `${i + 1}.${d}`).join(' · ')}\n`);
  console.log('TOTAIS:');
  for (const [k, desc] of ETAPAS) {
    const n = totais[k] ?? 0;
    const pct = Math.round((n / rows.length) * 100);
    console.log(`  ${String(n).padStart(3)} (${String(pct).padStart(3)}%)  ${desc}`);
  }

  const semWa = rows.filter((u: any) => u.perfil && !u.whatsapp).length;
  if (semWa) {
    console.log(`\n⚠ ${semWa} pessoa(s) completaram o perfil mas não ligaram o WhatsApp.`);
    console.log('  Causas possíveis: build publicado sem a ligação, a pessoa pulou a tela,');
    console.log('  ou a chamada falhou (ela falha em silêncio para não travar o onboarding).');
  }
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
