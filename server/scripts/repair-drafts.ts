// Conserto pontual de dois rascunhos corrompidos na primeira rodada de
// regeneração (antes da trava looksCorrupt existir).
//
// O modelo escreveu conteúdo BOM, mas vazou as tags internas da chamada de
// ferramenta para dentro do campo `reflection` — e prayer/practice ficaram com
// lixo ou "placeholder". O texto correto estava preservado ali dentro; aqui ele
// é apenas extraído e recolocado nos campos certos. NADA foi reescrito.
//
// Idempotente: só age se o campo ainda contiver marcação.
// Uso: npx tsx scripts/repair-drafts.ts

import 'dotenv/config';
import { pool } from '../src/db.js';

const REPAIRS: Record<string, { reflection: string; prayer: string; practice: string }> = {
  's-solidao-9': {
    reflection:
      'Deus repete três vezes a mesma ordem a Josué — esforça-te, sê valente, não temas — como quem sabe que uma vez só não bastaria. E a razão não é a coragem dele, é a companhia dele: "o SENHOR será contigo onde quer que fores." A valentia que Deus pede não é sentir-se forte, é dar o passo confiando que não vai sozinho.',
    prayer:
      'Senhor, não me sinto valente hoje, mas quero dar meus passos crendo que Tu vais junto. Sustenta a minha coragem quando ela falta.',
    practice:
      'Ligue para alguém agora — não mensagem, ligação — e diga só uma frase: "queria ouvir sua voz um pouco". Deixe a conversa acontecer sem pressa.',
  },
  's-fe-7': {
    reflection:
      'Repare no que Jesus corrige: não é o tamanho da montanha, é o tamanho da confiança. O foco dele não está no monte que sai do lugar, mas em quem confiamos quando estamos com pouca coisa nas mãos. A fé de mostarda não é uma alavanca mágica — é um jeito de olhar para Deus mesmo quando quase tudo em nós hesita.',
    prayer:
      'Senhor, hoje eu não trago uma fé grande, trago a que tenho. Que ela me faça olhar para ti, e não para o tamanho do meu problema.',
    practice:
      'Beba um copo de água devagar, em pequenos goles. A cada gole, diga baixinho: "Deus, é a ti que eu olho hoje." Termine o copo sem pressa.',
  },
};

async function main() {
  for (const [seedId, r] of Object.entries(REPAIRS)) {
    const { rowCount } = await pool.query(
      `UPDATE content_drafts
          SET reflection=$2, prayer=$3, practice=$4
        WHERE seed_id=$1
          AND (reflection ~ '</?[a-zA-Z]' OR prayer ~ '</?[a-zA-Z]' OR lower(prayer)='placeholder')`,
      [seedId, r.reflection, r.prayer, r.practice]);
    console.log(rowCount ? `  ✓ ${seedId} recuperado` : `  – ${seedId} já estava limpo`);
  }
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
