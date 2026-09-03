// Confere as credenciais da Meta SEM revelar nenhuma delas.
//
// Existe porque as três coisas que mais dão errado nessa configuração são
// silenciosas: token vinculado ao app errado, token com prazo de validade, e
// permissões faltando. Nenhuma dá erro na hora — só semanas depois, quando o
// WhatsApp para de responder.
//
// Usa o endpoint debug_token da Meta, que devolve os metadados do próprio
// token: de qual app ele é, quando expira e o que ele autoriza.
//
// Uso: npm run wa:check

import 'dotenv/config';

const GRAPH = 'https://graph.facebook.com/v21.0';

const TOKEN = process.env.WA_ACCESS_TOKEN ?? '';
const PHONE_ID = process.env.WA_PHONE_NUMBER_ID ?? '';
const WABA_ID = process.env.WA_BUSINESS_ACCOUNT_ID ?? '';
const APP_SECRET = process.env.WA_APP_SECRET ?? '';

const PRECISA = ['whatsapp_business_messaging', 'whatsapp_business_management'];

async function main() {
  if (!TOKEN) {
    console.log('✗ WA_ACCESS_TOKEN não está no .env.');
    console.log('  Copie o token e rode: bash scripts/set-secret.sh WA_ACCESS_TOKEN');
    process.exit(1);
  }
  console.log(`token presente (${TOKEN.length} caracteres, termina em …${TOKEN.slice(-4)})\n`);

  const r = await fetch(`${GRAPH}/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`);
  const j: any = await r.json();
  if (j.error) { console.log(`✗ a Meta recusou o token: ${j.error.message}`); process.exit(1); }

  const d = j.data ?? {};
  let falhas = 0;

  console.log(`app: ${d.application ?? '?'} (id ${d.app_id ?? '?'})`);
  console.log(`tipo: ${d.type ?? '?'} · válido: ${d.is_valid ? 'sim' : 'NÃO'}`);
  if (!d.is_valid) { console.log('✗ token inválido ou revogado.'); falhas++; }

  // expires_at = 0 significa "nunca expira" — é o que queremos.
  if (d.expires_at === 0 || d.data_access_expires_at === 0) {
    console.log('validade: ✓ nunca expira');
  } else if (d.expires_at) {
    const quando = new Date(d.expires_at * 1000);
    const dias = Math.round((quando.getTime() - Date.now()) / 86_400_000);
    console.log(`validade: ✗ EXPIRA em ${quando.toLocaleDateString('pt-BR')} (${dias} dias)`);
    console.log('  → gere de novo escolhendo "Nunca" em Definir expiração.');
    falhas++;
  }

  const escopos: string[] = d.scopes ?? [];
  console.log(`\npermissões: ${escopos.join(', ') || '(nenhuma)'}`);
  for (const p of PRECISA) {
    if (!escopos.includes(p)) { console.log(`  ✗ falta ${p}`); falhas++; }
  }
  const extras = escopos.filter((e) => !PRECISA.includes(e));
  if (extras.length) console.log(`  ⚠ permissões além do necessário: ${extras.join(', ')}`);
  if (!falhas) console.log('  ✓ tem exatamente o que o Grão precisa');

  if (WABA_ID) {
    const w: any = await (await fetch(`${GRAPH}/${WABA_ID}?fields=name,timezone_id&access_token=${TOKEN}`)).json();
    console.log(w.error ? `\n✗ conta WhatsApp: ${w.error.message}` : `\nconta WhatsApp: ${w.name}`);
    if (w.error) falhas++;
  } else {
    console.log('\n⚠ WA_BUSINESS_ACCOUNT_ID não configurado (não é segredo, pode editar o .env à mão).');
  }

  if (PHONE_ID) {
    const p: any = await (await fetch(
      `${GRAPH}/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating,code_verification_status&access_token=${TOKEN}`)).json();
    if (p.error) { console.log(`✗ número: ${p.error.message}`); falhas++; }
    else {
      console.log(`número: ${p.display_phone_number} · nome "${p.verified_name}"`);
      console.log(`  verificação: ${p.code_verification_status ?? '?'} · qualidade: ${p.quality_rating ?? '—'}`);
    }
  } else {
    console.log('⚠ WA_PHONE_NUMBER_ID não configurado (não é segredo, pode editar o .env à mão).');
  }

  // Estado do template: 'APPROVED' libera o disparo diário; 'PENDING' ainda
  // está na fila da Meta; 'REJECTED' traz o motivo em rejected_reason.
  if (WABA_ID) {
    const nome = process.env.WA_TEMPLATE_NAME || 'semente_do_dia';
    const t: any = await (await fetch(
      `${GRAPH}/${WABA_ID}/message_templates?name=${encodeURIComponent(nome)}&access_token=${TOKEN}`)).json();
    const achado = (t.data ?? []).find((x: any) => x.name === nome);
    if (!achado) {
      console.log(`\n✗ template "${nome}" não existe nesta conta — confira WA_TEMPLATE_NAME`);
      falhas++;
    } else {
      const ok = achado.status === 'APPROVED';
      console.log(`\ntemplate "${nome}": ${achado.status} · categoria ${achado.category} · ${achado.language}`);
      if (achado.rejected_reason && achado.rejected_reason !== 'NONE') {
        console.log(`  motivo da recusa: ${achado.rejected_reason}`);
      }
      if (!ok) console.log('  → o disparo diário só funciona depois de APPROVED');
    }
  }

  if (!APP_SECRET) {
    console.log('⚠ WA_APP_SECRET não configurado — necessário para validar a assinatura dos webhooks.');
  } else {
    console.log(`chave secreta do app: presente (${APP_SECRET.length} caracteres)`);
  }

  console.log(`\n${falhas ? `✗ ${falhas} problema(s) a resolver` : '✓ credenciais prontas'}`);
  if (falhas) process.exitCode = 1;
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
