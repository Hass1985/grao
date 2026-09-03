import 'dotenv/config'; import { pool } from '../src/db.js';
import { readFileSync } from 'node:fs';
async function main(){
  const orig = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-lucassouza/2b1328d2-5e58-48f7-b17b-fd96fdd154fb/scratchpad/originais.json','utf-8'));
  const { rows } = await pool.query(`SELECT id, reflection FROM seeds`);
  const dif = rows.filter((r:any)=> orig[r.id] && orig[r.id] !== r.reflection);
  const semPar = rows.filter((r:any)=> !orig[r.id]);
  console.log(`sementes no banco: ${rows.length} · sem correspondência no painel: ${semPar.length}`);
  console.log(`divergentes (encurtadas por mim): ${dif.length}\n`);
  dif.slice(0,4).forEach((r:any)=>{
    console.log(`${r.id}: ${r.reflection.length} → ${orig[r.id].length} caracteres (recuperando)`);
  });
  const ganho = dif.reduce((a:number,r:any)=> a + orig[r.id].length - r.reflection.length, 0);
  console.log(`\ntexto a recuperar no total: ${ganho} caracteres`);
}
main().catch(e=>console.error(e.message)).finally(()=>pool.end());
