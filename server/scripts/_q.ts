import 'dotenv/config';
import { pool } from '../src/db.js';
const r = await pool.query(`select seed_id, reflection, prayer, practice, model, review_note from content_drafts where seed_id='s-fe-9'`);
const d = r.rows[0];
console.log('REFLEXÃO:', JSON.stringify(d.reflection?.slice(0,200)));
console.log('ORAÇÃO  :', JSON.stringify(d.prayer));
console.log('PRÁTICA :', JSON.stringify(d.practice));
console.log('modelo  :', d.model);
// quais estão reprovadas
const rep = await pool.query(`select seed_id, review_note from content_drafts where status='draft' and review_note like '%reprovada%'`);
console.log('\nREPROVADAS:', rep.rows.length);
rep.rows.forEach((x:any)=>console.log(' -', x.seed_id, '→', x.review_note.slice(0,110)));
await pool.end();
