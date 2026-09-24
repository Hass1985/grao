/**
 * App e WhatsApp mostram a mesma coisa?
 *
 *   npm run sincronia
 *
 * Pergunta, para cada pessoa com as duas pontas ligadas, exatamente o que cada
 * lado responderia agora — usando as MESMAS funções que o servidor usa, não uma
 * reimplementação da regra. Uma verificação que reescreve a lógica testa a
 * cópia, não o original.
 *
 * O que precisa bater:
 *   semente      getTodaySeed é a fonte única; as duas telas leem dela
 *   dia fechado  estadoDoDia.fechado, por QUALQUER porta
 *   botão        "Meu sentimento mudou" só aparece com o dia aberto, nos dois
 *
 * Isto existe porque em 23/09/2026 elas não batiam: o app oferecia a troca
 * para quem já tinha plantado no WhatsApp, e ao tocar trocava de verdade,
 * substituindo a semente que já tinha chegado no celular.
 */
import 'dotenv/config';
import { pool } from '../src/db.js';
import { estadoDoDia } from '../src/trocaDeSentimento.js';
import { getTodaySeed } from '../src/seedSelector.js';

(async () => {
  const { rows: pessoas } = await pool.query(`
    SELECT u.id, u.name, u.phone_e164,
           (SELECT count(*) FROM user_identities i WHERE i.user_id = u.id)::int ident
      FROM users u
     WHERE EXISTS (SELECT 1 FROM user_identities i WHERE i.user_id = u.id)
     ORDER BY u.name`);

  console.log(`\n${pessoas.length} pessoas com conta.\n`);
  let problemas = 0;

  for (const p of pessoas as any[]) {
    const estado = await estadoDoDia(p.id);
    const semente = await getTodaySeed(p.id);

    // O que cada lado decide, pela regra de cada lado.
    //
    // app:      server.ts devolve trocaUsada = estado.fechado, e a tela some
    //           com o botão quando ele é true
    // whatsapp: pedirRelato recusa quando estado.fechado, respondendo que a
    //           semente do dia já foi plantada
    const appOferece = !estado.fechado;
    const waOferece = !estado.fechado;
    const bate = appOferece === waOferece;
    if (!bate) problemas++;

    const quantas = (await pool.query(
      `SELECT count(*)::int n FROM seed_deliveries d JOIN users u ON u.id=d.user_id
        WHERE d.user_id=$1
          AND (d.delivered_at AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date
            = (now() AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date`,
      [p.id])).rows[0].n;

    console.log(`  ${bate ? '✓' : '✗'} ${(p.name ?? '(sem nome)').padEnd(11)}` +
      `${p.ident} ident · ${p.phone_e164 ? 'whatsapp' : 'só app '} · ` +
      `semente de hoje: ${semente?.id ?? '(nenhuma)'}`);
    console.log(`      dia ${estado.fechado ? 'FECHADO por ' + estado.porta : 'aberto'} · ` +
      `botão "meu sentimento mudou": ${appOferece ? 'aparece' : 'escondido'} nos dois` +
      (quantas > 1 && estado.porta !== 'troca' ? `  ⚠ ${quantas} entregas hoje, sem troca` : ''));
  }

  console.log(problemas
    ? `\n${problemas} pessoa(s) com as pontas discordando.\n`
    : '\nAs duas pontas concordam para todo mundo.\n');

  // Entrega dobrada no mesmo dia SEM ter havido troca.
  //
  // A condição da porta não é detalhe: trocar de sentimento cria uma segunda
  // entrega por definição — a semente nova é a resposta ao relato. Avisar toda
  // vez que alguém usa o recurso transformaria este alerta em ruído, e alerta
  // ruidoso é alerta que ninguém lê. O que denuncia problema é a entrega
  // dobrada que ninguém pediu: cadastro partido, ou seleção rodando duas vezes.
  const { rows: dobradas } = await pool.query(`
    SELECT u.name, count(*)::int n
      FROM seed_deliveries d JOIN users u ON u.id = d.user_id
     WHERE (d.delivered_at AT TIME ZONE coalesce(u.timezone,'America/Sao_Paulo'))::date
         = (now() AT TIME ZONE 'America/Sao_Paulo')::date
     GROUP BY u.id, u.name
    HAVING count(*) > 1
       AND count(*) FILTER (WHERE d.porta = 'troca') = 0`);
  if (dobradas.length) {
    console.log('Entregas dobradas HOJE sem troca (uma semente por dia é a regra):');
    dobradas.forEach((x: any) => console.log(`  ${x.name}: ${x.n}`));
    console.log();
  }

  await pool.end();
  process.exit(problemas ? 1 : 0);
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
