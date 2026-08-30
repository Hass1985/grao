// Gera o painel de revisão humana em HTML, direto do banco.
//
// Existe porque revisar centenas de sementes no terminal é inviável: aqui o
// revisor lê a semente inteira (passagem + reflexão + oração + prática +
// música), filtra por família ou por ressalva da auditoria, e marca
// aprovar/reprovar. O veredito fica no localStorage do navegador e a barra
// inferior lista os seed_id reprovados para colar no content:review.
//
// Uso: npm run content:page            → rascunhos pendentes
//      tsx scripts/review-page.ts all  → rascunhos + já publicadas

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { pool } from '../src/db.js';

const SCOPE = process.argv[2] === 'all' ? 'all' : 'draft';
const OUT = process.argv[3] ?? 'review.html';

const esc = (s: string | null) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cleanNote = (n: string | null) => (n ?? '').replace(/^auditoria\((atencao|reprovada)\):\s*/, '').trim();

interface Row {
  seed_id: string; family: string; type: string; reference: string; passage: string;
  reflection: string; prayer: string; practice: string; review_note: string | null;
  music_title: string | null; music_artist: string | null; estado: string;
}

async function main() {
  const { rows } = await pool.query<Row>(
    `SELECT * FROM (
       SELECT d.seed_id, d.family, d.type, d.reference, d.passage, d.reflection, d.prayer, d.practice,
              d.review_note, m.title music_title, m.artist music_artist, 'rascunho' estado
         FROM content_drafts d LEFT JOIN musics m ON m.id = d.music_id
        WHERE d.status = 'draft'
      ${SCOPE === 'all' ? `UNION ALL
       SELECT s.id, s.family, s.type, s.reference, s.passage, s.reflection, s.prayer, s.practice,
              NULL, s.music_title, s.music_artist, 'publicada'
         FROM seeds s` : ''}
     ) x
      ORDER BY family, (regexp_match(seed_id, '(\\d+)$'))[1]::int`);

  const families = [...new Set(rows.map((r) => r.family))];
  const flagged = rows.filter((r) => r.review_note).length;
  const flagByFam = new Map<string, number>();
  rows.forEach((r) => { if (r.review_note) flagByFam.set(r.family, (flagByFam.get(r.family) ?? 0) + 1); });

  const cards = rows.map((d) => `<article class="seed${d.review_note ? ' is-flagged' : ''}" data-id="${esc(d.seed_id)}" data-family="${esc(d.family)}" data-flag="${d.review_note ? '1' : '0'}">
<header class="seed-head">
<span class="id">${esc(d.seed_id)}</span>
<span class="tags"><span class="tag tag-fam">${esc(d.family)}</span><span class="tag">${esc(d.type)}</span>${d.estado === 'publicada' ? '<span class="tag tag-pub">publicada</span>' : ''}</span>
<cite class="ref">${esc(d.reference)}</cite>
</header>
<blockquote class="passage">${esc(d.passage)}</blockquote>
<div class="body">
<div class="part"><span class="label">Reflexão</span><p>${esc(d.reflection)}</p></div>
<div class="part"><span class="label">Oração</span><p>${esc(d.prayer)}</p></div>
<div class="part"><span class="label">Prática</span><p>${esc(d.practice)}</p></div>
</div>
${d.review_note ? `<p class="note"><span class="note-tag">olhar</span>${esc(cleanNote(d.review_note))}</p>` : ''}
<footer class="seed-foot">
<span class="music"><span class="note-icon" aria-hidden="true">&#9834;</span>${esc(d.music_title)} <span class="artist">${esc(d.music_artist)}</span></span>
<span class="verdict" role="group" aria-label="Veredito para ${esc(d.seed_id)}">
<button type="button" class="v v-ok" data-v="ok">Aprovar</button>
<button type="button" class="v v-no" data-v="no">Reprovar</button>
</span>
</footer>
</article>`).join('\n');

  const chips = families.map((f) =>
    `<button type="button" class="chip" data-fam="${esc(f)}">${esc(f)}${flagByFam.get(f) ? `<span class="chip-n">${flagByFam.get(f)}</span>` : ''}</button>`).join('');

  const html = `<title>Sementes do Grão</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&display=swap">
<style>
:root {
  --paper:#EFF1EA; --surface:#FBFCF8; --ink:#191D17; --ink-soft:#565E51; --ink-faint:#838B7C;
  --line:#D8DDCF; --line-soft:#E5E9DD; --accent:#3F5A34; --accent-soft:#E2EAD8;
  --flag:#8A6212; --flag-soft:#F5EBD5; --ok:#3F5A34; --no:#96412C;
  --shadow:0 1px 2px rgba(25,29,23,.05), 0 8px 24px -18px rgba(25,29,23,.35);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper:#12150F; --surface:#1A1E16; --ink:#E7EADF; --ink-soft:#A3AB99; --ink-faint:#78806F;
    --line:#2C3227; --line-soft:#242A20; --accent:#A3C486; --accent-soft:#26301F;
    --flag:#D8AC5C; --flag-soft:#2E2716; --ok:#A3C486; --no:#E08E75;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -18px rgba(0,0,0,.9);
  }
}
:root[data-theme="dark"] {
  --paper:#12150F; --surface:#1A1E16; --ink:#E7EADF; --ink-soft:#A3AB99; --ink-faint:#78806F;
  --line:#2C3227; --line-soft:#242A20; --accent:#A3C486; --accent-soft:#26301F;
  --flag:#D8AC5C; --flag-soft:#2E2716; --ok:#A3C486; --no:#E08E75;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -18px rgba(0,0,0,.9);
}
* { box-sizing:border-box; }
body { background:var(--paper); color:var(--ink); font-family:Archivo,"Helvetica Neue",Arial,sans-serif;
  font-size:16px; line-height:1.5; margin:0; -webkit-font-smoothing:antialiased; }
.wrap { max-width:54rem; margin:0 auto; padding:0 1.25rem 7rem; }
.masthead { padding:4.5rem 0 2rem; display:flex; flex-direction:column; gap:1.25rem; }
.eyebrow { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-faint); font-weight:500; }
h1 { font-family:Newsreader,Georgia,serif; font-weight:400; font-size:clamp(2.4rem,6vw,3.6rem);
  line-height:1.05; margin:0; text-wrap:balance; letter-spacing:-.015em; }
h1 em { font-style:italic; color:var(--accent); }
.lede { font-family:Newsreader,Georgia,serif; font-size:1.2rem; line-height:1.55; color:var(--ink-soft);
  max-width:40rem; margin:0; }
.tally { display:grid; grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr)); gap:1px;
  background:var(--line); border:1px solid var(--line); border-radius:3px; overflow:hidden; margin-top:.5rem; }
.tally div { background:var(--surface); padding:.95rem 1.1rem; }
.tally b { display:block; font-size:1.7rem; line-height:1.1; font-weight:500;
  font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.tally span { font-size:.74rem; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-faint); }
.tally .t-flag b { color:var(--flag); }
.controls { position:sticky; top:0; z-index:20; background:color-mix(in srgb,var(--paper) 92%,transparent);
  backdrop-filter:blur(8px); border-bottom:1px solid var(--line); margin:2.5rem -1.25rem 0;
  padding:.8rem 1.25rem; display:flex; flex-wrap:wrap; gap:.45rem; align-items:center; }
.controls .sep { width:1px; align-self:stretch; background:var(--line); margin:0 .35rem; }
button { font:inherit; cursor:pointer; }
.chip { font-size:.8rem; font-weight:500; padding:.3rem .68rem; border:1px solid var(--line);
  background:var(--surface); color:var(--ink-soft); border-radius:999px; display:inline-flex;
  align-items:center; gap:.35rem; transition:background .12s,color .12s,border-color .12s; }
.chip:hover { border-color:var(--accent); color:var(--ink); }
.chip[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:var(--paper); }
.chip-n { font-size:.68rem; font-variant-numeric:tabular-nums; background:var(--flag-soft);
  color:var(--flag); padding:0 .32rem; border-radius:3px; }
.chip[aria-pressed="true"] .chip-n { background:color-mix(in srgb,var(--paper) 25%,transparent); color:inherit; }
:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.list { display:flex; flex-direction:column; gap:1.1rem; padding-top:2rem; }
.seed { background:var(--surface); border:1px solid var(--line); border-radius:4px;
  padding:1.4rem 1.5rem 1.1rem; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:1.05rem; }
.seed.is-flagged { border-left:3px solid var(--flag); }
.seed[hidden] { display:none; }
.seed-head { display:flex; flex-wrap:wrap; align-items:baseline; gap:.55rem; }
.id { font-size:.74rem; letter-spacing:.04em; font-weight:600; color:var(--ink-faint); font-variant-numeric:tabular-nums; }
.tags { display:flex; gap:.35rem; }
.tag { font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft);
  border:1px solid var(--line); border-radius:2px; padding:.1rem .38rem; }
.tag-fam { color:var(--accent); border-color:var(--accent); }
.tag-pub { color:var(--ink-faint); }
.ref { margin-left:auto; font-family:Newsreader,Georgia,serif; font-style:normal; font-size:1rem;
  color:var(--ink); font-weight:500; }
.passage { margin:0; padding:.1rem 0 .1rem 1.1rem; border-left:2px solid var(--accent-soft);
  font-family:Newsreader,Georgia,serif; font-size:1.16rem; line-height:1.5; font-style:italic; color:var(--ink); }
.body { display:flex; flex-direction:column; gap:.85rem; }
.part { display:grid; grid-template-columns:5.5rem 1fr; gap:1rem; align-items:start; }
.label { font-size:.68rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-faint);
  padding-top:.32rem; font-weight:500; }
.part p { margin:0; font-family:Newsreader,Georgia,serif; font-size:1.05rem; line-height:1.6; color:var(--ink); }
.note { margin:0; background:var(--flag-soft); color:var(--ink); border-radius:3px; padding:.7rem .85rem;
  font-size:.88rem; line-height:1.5; display:flex; gap:.6rem; align-items:baseline; }
.note-tag { flex:none; font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; font-weight:600; color:var(--flag); }
.seed-foot { display:flex; flex-wrap:wrap; gap:.8rem; align-items:center; border-top:1px solid var(--line-soft); padding-top:.85rem; }
.music { font-size:.85rem; color:var(--ink-soft); }
.note-icon { color:var(--accent); margin-right:.4rem; }
.artist { color:var(--ink-faint); }
.artist::before { content:"— "; }
.verdict { margin-left:auto; display:flex; gap:.35rem; }
.v { font-size:.78rem; font-weight:500; padding:.28rem .7rem; border-radius:999px; border:1px solid var(--line);
  background:transparent; color:var(--ink-soft); transition:background .12s,color .12s,border-color .12s; }
.v:hover { border-color:var(--ink-soft); color:var(--ink); }
.seed[data-verdict="ok"] .v-ok { background:var(--accent-soft); border-color:var(--ok); color:var(--ok); }
.seed[data-verdict="no"] .v-no { background:var(--flag-soft); border-color:var(--no); color:var(--no); }
.seed[data-verdict="no"] .passage, .seed[data-verdict="no"] .body { opacity:.5; }
.dock { position:fixed; left:50%; transform:translateX(-50%); bottom:1rem; z-index:30;
  width:min(52rem,calc(100vw - 2rem)); background:var(--surface); border:1px solid var(--line);
  border-radius:4px; box-shadow:0 12px 40px -20px rgba(0,0,0,.5); padding:.75rem 1rem;
  display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; font-size:.84rem; }
.dock output { font-variant-numeric:tabular-nums; color:var(--ink-soft); }
.dock output b { color:var(--ink); font-weight:600; }
.dock .chip { margin-left:auto; }
.ids { flex-basis:100%; margin:0; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.78rem;
  color:var(--ink-soft); overflow-x:auto; white-space:nowrap; padding:.5rem .6rem; background:var(--paper); border-radius:3px; }
.ids:empty { display:none; }
@media (max-width:640px) {
  .part { grid-template-columns:1fr; gap:.2rem; }
  .label { padding-top:0; }
  .ref { margin-left:0; flex-basis:100%; }
  .masthead { padding-top:2.5rem; }
}
@media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
</style>

<div class="wrap">
<header class="masthead">
  <p class="eyebrow">Revisão editorial · base 365 · agosto de 2026</p>
  <h1>${rows.length} sementes esperando o seu <em>sim</em></h1>
  <p class="lede">Cada semente nasceu de uma passagem real da Bíblia Livre e de uma música validada por API — o modelo escreveu só a reflexão, a oração e a prática ao redor do texto. Um revisor de IA já passou por todas${flagged ? `; ${flagged} ficaram com uma ressalva para o seu olho decidir` : ' e nenhuma ficou com ressalva'}.</p>
  <div class="tally">
    <div><b>${rows.length}</b><span>Sementes</span></div>
    <div><b>${families.length}</b><span>Famílias</span></div>
    <div><b>${rows.length - flagged}</b><span>Sem ressalva</span></div>
    <div class="t-flag"><b>${flagged}</b><span>Para olhar</span></div>
  </div>
</header>

<div class="controls">
  <button type="button" class="chip" data-view="all" aria-pressed="true">Todas</button>
  <button type="button" class="chip" data-view="flag" aria-pressed="false">Só as marcadas</button>
  <button type="button" class="chip" data-view="todo" aria-pressed="false">Sem veredito</button>
  <span class="sep"></span>
  ${chips}
</div>

<main class="list" id="list">
${cards}
</main>
</div>

<div class="dock">
  <output id="score"></output>
  <button type="button" class="chip" id="reset">Limpar vereditos</button>
  <p class="ids" id="ids"></p>
</div>

<script>
(function () {
  var KEY = 'grao-review-365';
  var seeds = Array.prototype.slice.call(document.querySelectorAll('.seed'));
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (err) { store = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (err) {} }
  function paint() {
    var ok = 0, no = 0, rejected = [];
    seeds.forEach(function (s) {
      var v = store[s.dataset.id];
      if (v) s.dataset.verdict = v; else s.removeAttribute('data-verdict');
      if (v === 'ok') ok++;
      if (v === 'no') { no++; rejected.push(s.dataset.id); }
    });
    document.getElementById('score').innerHTML =
      '<b>' + ok + '</b> aprovadas · <b>' + no + '</b> reprovadas · <b>' + (seeds.length - ok - no) + '</b> pendentes';
    document.getElementById('ids').textContent = rejected.length ? 'reprovadas: ' + rejected.join(' ') : '';
  }
  document.getElementById('list').addEventListener('click', function (ev) {
    var btn = ev.target.closest('.v');
    if (!btn) return;
    var seed = btn.closest('.seed'), want = btn.dataset.v;
    store[seed.dataset.id] = store[seed.dataset.id] === want ? null : want;
    if (!store[seed.dataset.id]) delete store[seed.dataset.id];
    save(); paint();
  });
  document.getElementById('reset').addEventListener('click', function () { store = {}; save(); paint(); });
  var view = 'all', fam = null;
  function filter() {
    seeds.forEach(function (s) {
      var okView = view === 'all' || (view === 'flag' && s.dataset.flag === '1') || (view === 'todo' && !store[s.dataset.id]);
      s.hidden = !(okView && (!fam || s.dataset.family === fam));
    });
  }
  document.querySelector('.controls').addEventListener('click', function (ev) {
    var chip = ev.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.view) {
      view = chip.dataset.view;
      document.querySelectorAll('[data-view]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
    } else {
      var on = chip.getAttribute('aria-pressed') !== 'true';
      fam = on ? chip.dataset.fam : null;
      document.querySelectorAll('[data-fam]').forEach(function (c) { c.setAttribute('aria-pressed', String(on && c === chip)); });
    }
    filter();
  });
  paint(); filter();
})();
</script>
`;

  writeFileSync(OUT, html, 'utf-8');
  console.log(`${rows.length} sementes · ${flagged} com ressalva → ${OUT}`);
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
