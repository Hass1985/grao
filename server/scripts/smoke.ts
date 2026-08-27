// Smoke test do backend — valida o serviço inteiro depois do deploy.
// Roda o caminho real do usuário: health → abertura → mensagem (cérebro) →
// estado → semente do dia → exclusão LGPD.
//
// Uso:
//   npm run smoke                              (testa http://localhost:8787)
//   GRAO_API=https://seu-app.up.railway.app npm run smoke

const BASE = (process.env.GRAO_API || 'http://localhost:8787').replace(/\/+$/, '');
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  → ${JSON.stringify(detail)}`}`);
  ok ? pass++ : fail++;
};

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, body };
}

async function main() {
  console.log(`Smoke test contra ${BASE}\n`);
  const userId = uuid();

  // 1. Health
  const health = await req('/health');
  check('health responde', health.status === 200 || health.status === 503, health.body);
  check('chave da Anthropic configurada', health.body?.anthropicKey === 'ok', health.body);
  check('banco conectado', health.body?.db === 'ok', health.body);
  if (health.body?.db !== 'ok' || health.body?.anthropicKey !== 'ok') {
    console.log('\n⚠️  Configure ANTHROPIC_API_KEY e DATABASE_URL antes de seguir.');
    process.exit(1);
  }

  // 2. Abertura (o coração): relato com sinal claro de ansiedade + fé
  const relato =
    'Tô desempregado há quatro meses, as contas apertando e a cabeça a mil, quase não durmo. Mas creio que Deus vai abrir uma porta, tenho orado todo dia com minha esposa.';
  const opening = await req('/onboarding/opening', {
    method: 'POST',
    body: JSON.stringify({ userId, name: 'Marcos', transcript: relato, source: 'audio' }),
  });
  check('abertura responde 200', opening.status === 200, opening.body);
  check('abertura devolve mensagem', !!opening.body?.message, opening.body);
  check(
    'leitura emocional coerente (ansiedade/esperança/fé)',
    ['ansiedade', 'esperança', 'fé'].includes(opening.body?.emotionalHint),
    opening.body?.emotionalHint
  );
  check(
    'resposta ancorada no relato (cita conteúdo específico)',
    /desempreg|contas|esposa|dorm|porta|quatro meses/i.test(opening.body?.message ?? ''),
    opening.body?.message
  );
  check('needs_care correto (false neste caso)', opening.body?.needsCare === false, opening.body?.needsCare);
  console.log(`   resposta: ${opening.body?.message}\n`);

  // 3. Cérebro: nova mensagem muda o estado emocional
  const msg = await req('/message', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      text: 'Hoje recebi a notícia que passei na entrevista! Tô muito feliz e grato a Deus.',
      source: 'app',
    }),
  });
  check('mensagem processada', msg.status === 200, msg.body);
  check(
    'cérebro leu alegria/gratidão',
    ['alegria', 'gratidão'].includes(msg.body?.reading?.family),
    msg.body?.reading
  );
  check('confiança alta em sinal claro', (msg.body?.reading?.confidence ?? 0) >= 60, msg.body?.reading);
  check('momento foi atualizado pelo cérebro', msg.body?.momentUpdated === true, msg.body);

  // 4. Mensagem neutra NÃO deve mudar o estado
  const neutra = await req('/message', {
    method: 'POST',
    body: JSON.stringify({ userId, text: 'ok, obrigado', source: 'app' }),
  });
  check(
    'mensagem neutra tem confiança baixa',
    (neutra.body?.reading?.confidence ?? 100) < 60,
    neutra.body?.reading
  );

  // 5. Estado
  const state = await req(`/state/${userId}`);
  check('estado devolve momento atual', !!state.body?.moment, state.body);

  // 6. Semente do dia
  const seed = await req(`/seed/today/${userId}`);
  check('semente do dia entregue', seed.status === 200 && !!seed.body?.passage, seed.body);
  check('semente tem música', !!seed.body?.music?.title, seed.body?.music);
  if (seed.body?.passage) {
    console.log(`   semente: ${seed.body.reference} (${seed.body.family}/${seed.body.type}) · ${seed.body.music?.title}\n`);
  }

  // 7. LGPD: exclusão total
  const del = await req(`/user/${userId}`, { method: 'DELETE' });
  check('exclusão LGPD funciona', del.status === 200, del.body);
  const after = await req(`/profile/${userId}`);
  check('dados realmente apagados', after.status === 404, after.status);

  console.log('\n' + '═'.repeat(60));
  console.log(`RESULTADO: ${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 2 : 0);
}

main().catch((e) => { console.error('ERRO', e); process.exit(1); });
