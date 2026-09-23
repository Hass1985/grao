/**
 * O outro lado do npm run seguranca: quem TEM token entra, e só no que é dele.
 *
 * Roda contra um servidor local subido com o mesmo SUPABASE_JWT_SECRET. A
 * verificação por JWKS (o caminho de produção) não é exercitada aqui — ela já
 * roda a cada login em /auth/vincular. O que este teste prova é o middleware:
 * ler o bearer, resolver auth_uid → users.id e comparar com a URL.
 */
import 'dotenv/config';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

const BASE = process.argv[2] ?? 'http://localhost:3999';

if (!process.env.SUPABASE_JWT_SECRET) {
  console.log(
    '\nEste teste só roda local. Ele assina o próprio token pelo caminho HS256,\n' +
    'e para isso o servidor precisa subir com o mesmo segredo:\n\n' +
    '  WA_PHONE_NUMBER_ID= WA_ACCESS_TOKEN= AUTH_ROTAS=exigindo PORT=3999 \\\n' +
    '  SUPABASE_JWT_SECRET=um-segredo-qualquer npx tsx src/server.ts\n\n' +
    '  SUPABASE_JWT_SECRET=um-segredo-qualquer npm run identidade\n\n' +
    'Produção não tem esse segredo, e é assim que deve ser: lá vale o JWKS.\n');
  process.exit(0);
}

const SEGREDO = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
const EMISSOR = `${(process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')}/auth/v1`;

async function token(sub: string) {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(EMISSOR)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(SEGREDO);
}

async function chamar(caminho: string, t?: string) {
  const res = await fetch(BASE + caminho, {
    headers: t ? { authorization: `Bearer ${t}` } : {},
    signal: AbortSignal.timeout(15_000),
  });
  const corpo = await res.text();
  let json: any = null;
  try { json = JSON.parse(corpo); } catch { /* html ou vazio */ }
  return { status: res.status, json, corpo: corpo.slice(0, 120) };
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
  const { rows } = await pool.query(
    `SELECT id, auth_uid FROM users WHERE auth_uid IS NOT NULL ORDER BY created_at LIMIT 2`);
  await pool.end();
  const [a, b] = rows;

  const tokenA = await token(a.auth_uid);
  const tokenOrfao = await token(randomUUID());

  const casos: Array<[string, () => Promise<{ status: number; json: any }>, (r: any) => boolean, string]> = [
    ['dono lê o que é dele',
      () => chamar(`/state/${a.id}`, tokenA),
      (r) => r.status === 200, 'espera 200'],
    ['dono NÃO lê o do vizinho',
      () => chamar(`/state/${b.id}`, tokenA),
      (r) => r.status === 403 && r.json?.codigo === 'id_divergente', 'espera 403 id_divergente'],
    ['a recusa devolve o id certo, para o app se corrigir',
      () => chamar(`/state/${b.id}`, tokenA),
      (r) => r.json?.userId === a.id, `espera userId=${a.id}`],
    ['token de conta nunca vinculada',
      () => chamar(`/state/${a.id}`, tokenOrfao),
      (r) => r.status === 403 && r.json?.codigo === 'sem_cadastro', 'espera 403 sem_cadastro'],
    ['sem token nenhum',
      () => chamar(`/state/${a.id}`),
      (r) => r.status === 401 && r.json?.codigo === 'sem_token', 'espera 401 sem_token'],
    ['token de outro emissor',
      () => chamar(`/state/${a.id}`, 'eyJhbGciOiJIUzI1NiJ9.e30.x'),
      (r) => r.status === 401 && r.json?.codigo === 'token_invalido', 'espera 401 token_invalido'],
    ['rota sem :userId continua aberta (o painel e a saúde não quebram)',
      () => chamar('/health'),
      (r) => r.status === 200, 'espera 200'],
  ];

  let ok = 0;
  for (const [nome, executar, passa, esperado] of casos) {
    const r = await executar();
    const bom = passa(r);
    if (bom) ok++;
    console.log(`  ${bom ? '✓' : '✗'} ${nome}`);
    if (!bom) console.log(`      ${esperado} — veio ${r.status} ${JSON.stringify(r.json)?.slice(0, 120)}`);
  }
  console.log(`\n${ok}/${casos.length}`);
  process.exit(ok === casos.length ? 0 : 1);
})();
