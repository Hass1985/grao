/**
 * Junta cadastros que são da mesma pessoa e limpa os órfãos de teste.
 *
 *   npm run unificar              # só mostra o plano
 *   npm run unificar -- --aplicar # executa
 *
 * Sem --aplicar ele não escreve um byte. Isto apaga linhas de produção com
 * histórico real de gente real; ver o que vai acontecer antes não é cerimônia.
 *
 * DUAS COISAS DIFERENTES, e vale não confundir:
 *
 *  ÓRFÃOS   cadastros sem identidade nenhuma ligada e sem semente entregue.
 *           Vieram do identificador local que o app gerava no aparelho ANTES
 *           do login: abrir em outro navegador, limpar o cache ou testar numa
 *           aba anônima criava um. Ninguém consegue chegar neles hoje, nem a
 *           pessoa que os criou. São rastro de teste.
 *
 *  GÊMEOS   dois cadastros COM identidade que são a mesma pessoa, ligados pelo
 *           telefone ou pelo e-mail. Foi o que aconteceu com quem entrou por
 *           Google num dia e por telefone no outro: `users.auth_uid` só cabia
 *           uma identidade, e a segunda virou uma pessoa nova. Aqui eles são
 *           fundidos, não apagados — o histórico dos dois vai para o que fica.
 *
 * O SOBREVIVENTE é sempre o que tem mais história (sementes + eventos). Não é
 * gosto: é o que preserva mais memória de quem usou.
 */
import 'dotenv/config';
import { pool } from '../src/db.js';
import { fundirUsuarios } from '../src/auth.js';

const APLICAR = process.argv.includes('--aplicar');

/**
 * Fusão nominal: `npm run unificar -- --fundir <id-de> <id-para>`
 *
 * Existe para o caso que o automático se recusa a resolver — dois cadastros
 * com identidade que são a mesma pessoa mas não compartilham telefone nem
 * e-mail. Só um humano sabe que são a mesma pessoa, então só um humano manda.
 * Os ids vão inteiros, para ninguém fundir o cadastro errado por causa de um
 * prefixo ambíguo.
 */
const iFundir = process.argv.indexOf('--fundir');
const NOMINAL = iFundir >= 0
  ? { de: process.argv[iFundir + 1], para: process.argv[iFundir + 2] }
  : null;

type Linha = {
  id: string; name: string | null; email: string | null; phone_e164: string | null;
  identidades: number; sementes: number; eventos: number; falas: number; leituras: number;
};

async function carregar(): Promise<Linha[]> {
  const { rows } = await pool.query(`
    SELECT u.id, u.name, nullif(u.email,'') email, u.phone_e164,
           (SELECT count(*) FROM user_identities i WHERE i.user_id = u.id)::int identidades,
           (SELECT count(*) FROM seed_deliveries d WHERE d.user_id = u.id)::int sementes,
           (SELECT count(*) FROM events e WHERE e.user_id = u.id)::int eventos,
           (SELECT count(*) FROM conversation_turns t WHERE t.user_id = u.id)::int falas,
           (SELECT count(*) FROM devotional_reads r WHERE r.user_id = u.id)::int leituras
      FROM users u ORDER BY u.created_at`);
  return rows;
}

const peso = (l: Linha) => l.sementes * 100 + l.eventos + l.falas;
const curto = (id: string) => id.slice(0, 8);

function rotulo(l: Linha): string {
  return `${curto(l.id)} ${(l.name ?? '(sem nome)').padEnd(12)}` +
    `${(l.email ?? '—').padEnd(28)}${(l.phone_e164 ?? '—').padEnd(16)}` +
    `${l.identidades} ident · ${l.sementes} sem · ${l.eventos} ev · ${l.leituras} leituras`;
}

(async () => {
  const linhas = await carregar();

  if (NOMINAL) {
    const de = linhas.find((l) => l.id === NOMINAL.de);
    const para = linhas.find((l) => l.id === NOMINAL.para);
    if (!de || !para) {
      console.log('\nNão achei um dos cadastros. Use os ids INTEIROS:\n');
      console.log('  npm run unificar -- --fundir <id-de> <id-para> --aplicar\n');
      await pool.end(); process.exit(1);
    }
    console.log('\n── FUSÃO NOMINAL ' + '─'.repeat(40));
    console.log('  de:   ' + rotulo(de));
    console.log('  para: ' + rotulo(para) + '   ← sobrevive');
    if (!APLICAR) {
      console.log('\nNada foi alterado. Acrescente --aplicar para executar.\n');
      await pool.end(); return;
    }
    await fundirUsuarios(de.id, para.id);
    const [dep] = (await carregar()).filter((l) => l.id === para.id);
    console.log('\n  feito. O cadastro que ficou:');
    console.log('  ' + rotulo(dep));
    const { rows: ids } = await pool.query(
      `SELECT auth_uid, email, telefone FROM user_identities WHERE user_id = $1`, [para.id]);
    console.log('\n  identidades apontando para ele:');
    ids.forEach((x: any) => console.log(`    ${curto(x.auth_uid)}  ${(x.email ?? '—').padEnd(26)}${x.telefone ?? '—'}`));
    await pool.end();
    return;
  }

  // ---- órfãos ----
  //
  // "Sem identidade e sem semente" não basta como critério, e a primeira
  // versão deste script provou isso: ela marcava para apagar um cadastro com
  // 66 leituras de devocional ao longo de duas semanas. Era uma pessoa de
  // verdade usando o gratuito sem ter criado conta — exatamente o caminho que
  // o produto oferece — e apagar o histórico dela seria destruir uso real para
  // limpar rastro de teste.
  //
  // Órfão é o cadastro que nasceu e não viveu: sem identidade, sem telefone,
  // sem semente, sem nenhuma leitura de devocional e com um punhado de eventos
  // do onboarding. Na dúvida, fica — uma linha a mais no banco não custa nada,
  // e histórico apagado não volta.
  const orfaos = linhas.filter((l) =>
    l.identidades === 0 && l.sementes === 0 && !l.phone_e164 &&
    l.leituras === 0 && l.eventos <= 10);

  // ---- gêmeos: agrupa por telefone e por e-mail ----
  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) {
    if (!l.identidades) continue;
    for (const chave of [l.phone_e164 && 'tel:' + l.phone_e164, l.email && 'mail:' + l.email.toLowerCase()]) {
      if (!chave) continue;
      grupos.set(chave, [...(grupos.get(chave) ?? []), l]);
    }
  }
  // Mesma pessoa também quando o NOME bate e os dois têm identidade — é o caso
  // do cadastro por telefone sem e-mail ao lado do cadastro por Google sem
  // telefone, que nenhuma chave forte alcança. Fica de fora do automático de
  // propósito: nome não é identidade, e fundir por nome junta homônimos.
  const porNome = new Map<string, Linha[]>();
  for (const l of linhas) {
    if (!l.identidades || !l.name) continue;
    porNome.set(l.name, [...(porNome.get(l.name) ?? []), l]);
  }

  const fusoes: Array<{ de: Linha; para: Linha; chave: string }> = [];
  const vistos = new Set<string>();
  for (const [chave, g] of grupos) {
    if (g.length < 2) continue;
    const ordenado = [...g].sort((a, b) => peso(b) - peso(a));
    const para = ordenado[0];
    for (const de of ordenado.slice(1)) {
      const par = `${de.id}->${para.id}`;
      if (vistos.has(par)) continue;
      vistos.add(par);
      fusoes.push({ de, para, chave });
    }
  }

  const suspeitos = [...porNome.entries()]
    .filter(([, g]) => g.length > 1)
    .filter(([, g]) => !g.every((l) => fusoes.some((f) => f.de.id === l.id || f.para.id === l.id)));

  // ---- relatório ----
  console.log(`\n${linhas.length} cadastros no banco.\n`);

  console.log(`── ÓRFÃOS a apagar (${orfaos.length}) ` + '─'.repeat(30));
  if (!orfaos.length) console.log('  nenhum');
  orfaos.forEach((l) => console.log('  ' + rotulo(l)));

  console.log(`\n── FUSÕES automáticas (${fusoes.length}) ` + '─'.repeat(28));
  if (!fusoes.length) console.log('  nenhuma');
  fusoes.forEach((f) => {
    console.log(`  por ${f.chave}`);
    console.log(`    de:   ${rotulo(f.de)}`);
    console.log(`    para: ${rotulo(f.para)}   ← sobrevive`);
  });

  if (suspeitos.length) {
    console.log(`\n── MESMO NOME, sem chave em comum (${suspeitos.length}) ` + '─'.repeat(16));
    console.log('  Não fundo automaticamente: nome não é identidade, e homônimo existe.');
    console.log('  Se forem a mesma pessoa, me diga e eu fundo nominalmente.\n');
    suspeitos.forEach(([nome, g]) => {
      console.log(`  ${nome}:`);
      g.forEach((l) => console.log('    ' + rotulo(l)));
    });
  }

  if (!APLICAR) {
    console.log('\nNada foi alterado. Para executar:\n');
    console.log('  npm run unificar -- --aplicar\n');
    await pool.end();
    return;
  }

  console.log('\n── aplicando ' + '─'.repeat(40));
  for (const f of fusoes) {
    await fundirUsuarios(f.de.id, f.para.id);
    console.log(`  fundido ${curto(f.de.id)} → ${curto(f.para.id)}`);
  }
  for (const l of orfaos) {
    await pool.query('DELETE FROM users WHERE id = $1', [l.id]);
    console.log(`  apagado ${curto(l.id)}`);
  }
  console.log(`\n${fusoes.length} fusões, ${orfaos.length} órfãos apagados.\n`);
  await pool.end();
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
