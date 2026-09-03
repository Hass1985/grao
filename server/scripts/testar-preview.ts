// Manda uma semente pelo WhatsApp para comparar COM e SEM o card do louvor.
//
// A decisão entre os dois é de gosto, e gosto se decide vendo no aparelho —
// não na descrição. Este script existe para encurtar essa volta.
//
// Só usa texto livre, então depende da janela de 24h estar aberta (a pessoa
// precisa ter escrito para o Grão nas últimas 24 horas). E de propósito NÃO
// registra entrega: testar não pode gastar uma das 380 nem fazer a pessoa
// perder a semente de amanhã.
//
// Uso:
//   npm run wa:preview -- +5511999999999            → sem card (o que se quer ver)
//   npm run wa:preview -- +5511999999999 --com-card → com card, para comparar
//   npm run wa:preview -- +5511999999999 s-paz-12   → escolhendo a semente

import 'dotenv/config';
import { pool } from '../src/db.js';
import { sendText } from '../src/meta.js';
import { formatSeed, normalizePhone } from '../src/whatsapp.js';
import type { SelectedSeed } from '../src/seedSelector.js';

const args = process.argv.slice(2);
const comCard = args.includes('--com-card');
const resto = args.filter((a) => !a.startsWith('--'));
const telefone = normalizePhone(resto[0] ?? '');
const seedPedida = resto[1];

async function main() {
  if (!telefone) {
    console.log('Uso: npm run wa:preview -- +5511999999999 [seedId] [--com-card]');
    process.exit(1);
  }

  const { rows: [u] } = await pool.query(
    `SELECT id, name, (wa_last_inbound_at > now() - interval '24 hours') janela_aberta
       FROM users WHERE phone_e164 = $1`, [telefone]);
  if (!u) { console.log(`✗ ninguém cadastrado com ${telefone}`); process.exit(1); }
  if (!u.janela_aberta) {
    console.log('✗ a janela de 24h está fechada para esta pessoa.');
    console.log('  Texto livre só passa dentro dela — peça para responder qualquer coisa no WhatsApp e rode de novo.');
    process.exit(1);
  }

  // A semente de hoje da própria pessoa, para o teste ser realista. Se ela
  // ainda não recebeu nenhuma, pega uma que tenha louvor — sem link não há
  // card nenhum para avaliar.
  const { rows: [s] } = await pool.query(
    seedPedida
      ? `SELECT * FROM seeds WHERE id = $1`
      : `SELECT s.* FROM seed_deliveries d JOIN seeds s ON s.id = d.seed_id
          WHERE d.user_id = $1 ORDER BY d.id DESC LIMIT 1`,
    [seedPedida ?? u.id]);

  const { rows: [alternativa] } = s ? { rows: [null] } : await pool.query(
    `SELECT * FROM seeds WHERE music_spotify IS NOT NULL ORDER BY random() LIMIT 1`);
  const escolhida = s ?? alternativa;
  if (!escolhida) { console.log('✗ nenhuma semente encontrada'); process.exit(1); }

  const seed: SelectedSeed = {
    id: escolhida.id, family: escolhida.family, type: escolhida.type,
    passage: escolhida.passage, reference: escolhida.reference,
    reflection: escolhida.reflection, prayer: escolhida.prayer, practice: escolhida.practice,
    music: {
      title: escolhida.music_title || undefined, artist: escolhida.music_artist || undefined,
      spotifyUrl: escolhida.music_spotify || undefined, youtubeUrl: escolhida.music_youtube || undefined,
    },
    reason: { family: escolhida.family, source: 'momento', preferredType: escolhida.type },
  };

  if (!seed.music.title) {
    console.log('⚠ esta semente não tem louvor — sem link, não há card para comparar.');
  }

  const r = await sendText(telefone, formatSeed(seed, u.name), comCard);
  console.log(r.ok
    ? `✓ enviada para ${u.name ?? telefone} — ${seed.id} · ${seed.reference} · ${comCard ? 'COM card' : 'SEM card'}`
    : `✗ falhou: ${r.erro}`);
  if (!r.ok) process.exitCode = 1;
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
