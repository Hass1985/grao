// Acompanha em tempo real o que acontece com os testadores.
//
// Cada linha impressa vira uma notificação. Serve para assistir a um teste
// acontecendo — quem entrou, o que o cérebro leu, se o WhatsApp ligou, se a
// semente saiu — sem ficar rodando consulta na mão.
//
// Uso: npm run watch

import 'dotenv/config';
import { pool } from '../src/db.js';

const BR = (d: any) =>
  new Date(d).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

const DESCRICAO: Record<string, string> = {
  onboarding_done: 'concluiu a Abertura',
  wa_opt_in: 'LIGOU O WHATSAPP',
  seed_announced: 'recebeu o aviso da semente',
  seed_delivered: 'recebeu a semente (janela aberta, grátis)',
  seed_planted: 'TOCOU EM PLANTAR — semente entregue',
  message_in: 'escreveu no WhatsApp',
  moment_changed: 'cérebro atualizou o momento emocional',
  wa_send_failed: '⚠ FALHA no envio',
  user_merged: 'cadastros fundidos (webapp + WhatsApp)',
};

async function main() {
  // Marco zero: só reporta o que acontecer daqui para a frente.
  const { rows: [e0] } = await pool.query(`SELECT coalesce(max(id), 0) id FROM events`);
  const { rows: [u0] } = await pool.query(`SELECT coalesce(max(created_at), now()) t FROM users`);
  let ultimoEvento = Number(e0.id);
  let ultimoUsuario = u0.t;

  console.log(`observando… (a partir de agora, ${BR(new Date())})`);

  for (;;) {
    try {
      const { rows: novos } = await pool.query(
        `SELECT id FROM users WHERE created_at > $1 ORDER BY created_at`, [ultimoUsuario]);
      if (novos.length) {
        const { rows } = await pool.query(
          `SELECT coalesce(name,'(sem nome)') nome, created_at FROM users
            WHERE created_at > $1 ORDER BY created_at`, [ultimoUsuario]);
        for (const u of rows as any[]) {
          console.log(`${BR(u.created_at)} · ${u.nome} — abriu o app`);
          ultimoUsuario = u.created_at;
        }
      }

      const { rows: evs } = await pool.query(
        `SELECT e.id, e.type, e.payload, e.created_at, coalesce(u.name,'?') nome
           FROM events e LEFT JOIN users u ON u.id = e.user_id
          WHERE e.id > $1 ORDER BY e.id`, [ultimoEvento]);
      for (const ev of evs as any[]) {
        ultimoEvento = Number(ev.id);
        const extra = ev.type === 'onboarding_done'
          ? ` (leu: ${ev.payload?.family ?? '?'}${ev.payload?.needsCare ? ' · CUIDADO' : ''})`
          : ev.type === 'wa_send_failed'
            ? ` — ${ev.payload?.details ?? ''}`
            : '';
        console.log(`${BR(ev.created_at)} · ${ev.nome} — ${DESCRICAO[ev.type] ?? ev.type}${extra}`);
      }
    } catch (err: any) {
      console.log(`⚠ erro ao consultar: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
