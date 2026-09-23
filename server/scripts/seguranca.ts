/**
 * Confere que nenhuma rota de usuário responde sem identidade.
 *
 *   npm run seguranca                      # contra o servidor local
 *   npm run seguranca -- https://url       # contra o que estiver no ar
 *
 * A lista de rotas NÃO está escrita aqui: ela é lida de src/*.ts a cada
 * execução. Uma lista copiada envelhece calada — a 27ª rota entraria sem
 * ninguém notar, e o teste continuaria verde. Assim, rota nova é rota testada.
 *
 * Todas as chamadas usam um UUID aleatório, que não é de ninguém. Sem isso um
 * DELETE /user/:userId rodando contra um servidor mal configurado apagaria uma
 * conta de verdade para provar que a trava não está lá.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const FANTASMA = randomUUID();

type Rota = { metodo: string; caminho: string; arquivo: string };

function rotasDoCodigo(): Rota[] {
  const dir = path.resolve('src');
  const achadas: Rota[] = [];
  for (const nome of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const fonte = fs.readFileSync(path.join(dir, nome), 'utf8');
    const re = /\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]*:userId[^'"`]*)['"`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fonte))) {
      achadas.push({ metodo: m[1].toUpperCase(), caminho: m[2], arquivo: nome });
    }
  }
  return achadas.sort((a, b) => a.caminho.localeCompare(b.caminho));
}

/** Preenche :userId e qualquer outro parâmetro com algo inofensivo. */
function url(caminho: string): string {
  return BASE + caminho
    .replace(':userId', FANTASMA)
    .replace(':data', '2020-01-01')
    .replace(/:[a-zA-Z]+/g, 'x');
}

async function bater(r: Rota, token?: string): Promise<number | string> {
  try {
    const res = await fetch(url(r.caminho), {
      method: r.metodo,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: r.metodo === 'GET' || r.metodo === 'DELETE' ? undefined : '{}',
      signal: AbortSignal.timeout(15_000),
    });
    return res.status;
  } catch (e: any) {
    return e?.name === 'TimeoutError' ? 'timeout' : (e?.message ?? 'erro');
  }
}

(async () => {
  const rotas = rotasDoCodigo();
  console.log(`\nAlvo: ${BASE}`);
  console.log(`Rotas com :userId encontradas no código: ${rotas.length}\n`);

  // Antes de qualquer coisa: em qual modo o servidor está.
  //
  // E aqui vale uma parada, não só um aviso. Fora de "exigindo" as rotas
  // RODAM: duas delas chamam o modelo e outra cria cadastro. Rodar este teste
  // contra um servidor em "observando" gastaria Opus e deixaria usuários de
  // mentira no banco — um teste de segurança que faz estrago é um estrago.
  let modo = '(servidor antigo, sem o campo)';
  try {
    const saude: any = await (await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(15_000) })).json();
    modo = saude?.integracoes?.identidade ?? modo;
  } catch {
    console.log('Não consegui ler /health — o servidor está no ar?\n');
    process.exit(1);
  }
  console.log(`Modo das rotas de usuário: ${modo}\n`);

  if (modo !== 'exigindo' && process.argv[3] !== '--mesmo-assim') {
    console.log('Parei aqui de propósito.\n');
    console.log('Em "' + modo + '" as rotas respondem de verdade, e duas delas chamam o');
    console.log('modelo. Bater nelas para provar que estão abertas custaria dinheiro e');
    console.log('sujaria o banco — e a resposta já é conhecida: estão abertas, é para isso');
    console.log('que serve esse modo.\n');
    console.log('Vire AUTH_ROTAS para "exigindo" e rode de novo. Se quiser forçar assim');
    console.log('mesmo, contra um servidor local descartável: npm run seguranca -- ' + BASE + ' --mesmo-assim\n');
    process.exit(0);
  }

  let passou = 0;
  const falhas: string[] = [];

  // 401 é a recusa por identidade. 429 é o teto de requisições, que nas rotas
  // caras roda ANTES da identidade — quem estourou o balde é barrado sem o
  // servidor chegar a perguntar quem é. As duas são recusa; o que não pode
  // acontecer é 200, 400 ou 500, porque aí a rota rodou.
  const recusou = (s: number | string) => s === 401 || s === 429;

  for (const r of rotas) {
    const semToken = await bater(r);
    const comLixo = await bater(r, 'nao.e.um.token');
    const ok = recusou(semToken) && recusou(comLixo);
    if (ok) passou++;
    else falhas.push(`${r.metodo} ${r.caminho} (${r.arquivo}) — sem token: ${semToken}, token inválido: ${comLixo}`);
    const marca = ok && (semToken === 429 || comLixo === 429) ? '~' : ok ? '✓' : '✗';
    console.log(`  ${marca} ${String(semToken).padStart(3)} ${String(comLixo).padStart(3)}  ${r.metodo.padEnd(6)} ${r.caminho}`);
  }

  console.log(`\n${passou}/${rotas.length} rotas recusam quem não se identifica.`);
  console.log('(~ = recusada pelo teto de requisições antes de chegar na identidade)');
  if (falhas.length) {
    console.log('\nAbertas:');
    falhas.forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log('Nenhuma rota aberta.\n');
})();
