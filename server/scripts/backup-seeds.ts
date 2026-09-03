// Exporta as sementes publicadas para um arquivo versionado no git.
//
// Existe por causa de um prejuízo real: um script reescreveu 24 reflexões
// gravando por cima em `seeds` E em `content_drafts`, sem backup. O texto
// original só foi recuperado porque, por sorte, existia um painel de revisão
// publicado antes da edição. Sorte não é processo.
//
// Regra a partir de agora: rode isto ANTES de qualquer script que altere
// conteúdo em massa (content:fit, content:regen, ou o que vier).
//
// Uso: npm run content:backup

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pool } from '../src/db.js';

async function main() {
  const { rows } = await pool.query(
    `SELECT id, family, type, passage, reference, reflection, prayer, practice,
            gesture, music_title, music_artist, music_spotify, music_youtube
       FROM seeds ORDER BY id`);

  mkdirSync('db/backups', { recursive: true });
  const dia = new Date().toISOString().slice(0, 10);
  const caminho = `db/backups/seeds-${dia}.json`;
  writeFileSync(caminho, JSON.stringify(rows, null, 1), 'utf-8');

  const chars = rows.reduce((a: number, r: any) => a + r.reflection.length, 0);
  console.log(`${rows.length} sementes salvas em ${caminho}`);
  console.log(`(${Math.round(chars / rows.length)} caracteres de reflexão em média)`);
  console.log('\nCommite este arquivo. É a rede contra edição em massa que dê errado.');
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
