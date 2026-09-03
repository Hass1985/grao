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
  //
  // Guardar os ids já vistos em vez de comparar por timestamp é deliberado: o
  // Date do JavaScript trunca os microssegundos do Postgres, e a comparação
  // "created_at > $1" acabava incluindo a própria linha de referência.
  const vistosUsuarios = new Set<string>(
    (await pool.query(`SELECT id FROM users`)).rows.map((r: any) => r.id));
  const { rows: [e0] } = await pool.query(`SELECT coalesce(max(id), 0) id FROM events`);
  let ultimoEvento = Number(e0.id);

  console.log(`observando… (${vistosUsuarios.size} usuários já existentes serão ignorados)`);

  for (;;) {
    try {
      const { rows: usuarios } = await pool.query(
        `SELECT id, coalesce(name,'(sem nome)') nome, created_at FROM users ORDER BY created_at`);
      for (const u of usuarios as any[]) {
        if (vistosUsuarios.has(u.id)) continue;
        vistosUsuarios.add(u.id);
        console.log(`${BR(u.created_at)} · ${u.nome} — abriu o app`);
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
