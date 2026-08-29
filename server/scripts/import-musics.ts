// Pool de louvores VALIDADOS — o antídoto definitivo contra música inventada.
//
// Cada candidato passa pela busca do iTunes (API pública, sem chave, catálogo
// BR). Só entra no banco quem for ENCONTRADO no catálogo, com o nome oficial
// da faixa/artista devolvido pela API. Quem não passar é listado e fica fora.
//
// Links: Spotify de faixa exata quando já verificado manualmente (pool
// original); para os demais, link de busca (nunca quebra, nunca mente).
// Uso: npm run content:musics

import 'dotenv/config';
import { pool } from '../src/db.js';

interface Candidate {
  title: string;
  artist: string;
  families: string[];
  spotify?: string; // faixa exata já verificada manualmente
}

// Curadoria inicial: clássicos do louvor brasileiro + os 7 já verificados.
const CANDIDATES: Candidate[] = [
  // — já verificados manualmente (faixa exata no Spotify) —
  { title: 'Deus Proverá', artist: 'Gabriela Gomes', families: ['esperança', 'ansiedade'], spotify: 'https://open.spotify.com/track/2zouxoanOhjJi3HB8mBr9F' },
  { title: 'Lugar Secreto', artist: 'Gabriela Rocha', families: ['ansiedade', 'paz'], spotify: 'https://open.spotify.com/track/19KSVYPZSOZtvhYx8aVCvb' },
  { title: 'Quão Grande é o Meu Deus', artist: 'Soraya Moraes', families: ['gratidão', 'alegria'], spotify: 'https://open.spotify.com/track/7DhiPsmpu4kzIQyCtvWqzd' },
  { title: 'Deus Cuida de Mim', artist: 'Kleber Lucas', families: ['solidão', 'luto'], spotify: 'https://open.spotify.com/track/449TmbIw140iAdtYpUWB4h' },
  { title: 'Príncipe da Paz', artist: 'Diante do Trono', families: ['paz', 'ansiedade'], spotify: 'https://open.spotify.com/track/1sBvuSkhAnfppzUBpvIKi3' },
  { title: 'Oceanos (Onde Meus Pés Podem Falhar)', artist: 'Hillsong em Português', families: ['fé', 'propósito'], spotify: 'https://open.spotify.com/track/49TMWB2yqSHcm7aomyeR7G' },
  { title: 'Nada Além do Sangue', artist: 'Fernandinho', families: ['fé', 'culpa'], spotify: 'https://open.spotify.com/track/2mI6Oxf5FhUlSoDT67SeZM' },
  // — candidatos a validar via iTunes —
  { title: 'Faz Chover', artist: 'Fernandinho', families: ['esperança'] },
  { title: 'Uma Nova História', artist: 'Fernandinho', families: ['esperança', 'propósito'] },
  { title: 'Ainda Que a Figueira', artist: 'Fernandinho', families: ['fé', 'esperança'] },
  { title: 'Me Atraiu', artist: 'Gabriela Rocha', families: ['paz', 'gratidão'] },
  { title: 'Creio Que Tu És a Cura', artist: 'Gabriela Rocha', families: ['fé'] },
  { title: 'Ressuscita-me', artist: 'Aline Barros', families: ['esperança', 'luto'] },
  { title: 'Sonda-me, Usa-me', artist: 'Aline Barros', families: ['propósito'] },
  { title: 'Águas Purificadoras', artist: 'Diante do Trono', families: ['paz', 'culpa'] },
  { title: 'Aos Olhos do Pai', artist: 'Kleber Lucas', families: ['culpa', 'gratidão'] },
  { title: 'Aceito o Teu Chamado', artist: 'Bruna Karla', families: ['propósito'] },
  { title: 'Sou Humano', artist: 'Bruna Karla', families: ['culpa', 'solidão'] },
  { title: 'Raridade', artist: 'Anderson Freire', families: ['propósito', 'esperança'] },
  { title: 'Coração Valente', artist: 'Anderson Freire', families: ['fé', 'ansiedade'] },
  { title: 'Nunca Pare de Lutar', artist: 'Ludmila Ferber', families: ['esperança', 'fé'] },
  { title: 'Os Sonhos de Deus', artist: 'Ludmila Ferber', families: ['esperança', 'propósito'] },
  { title: 'Bondade de Deus', artist: 'Isaias Saad', families: ['gratidão', 'fé'] },
  { title: 'A Casa É Sua', artist: 'Casa Worship', families: ['paz'] },
  { title: 'Restitui', artist: 'Davi Sacer', families: ['esperança'] },
  { title: 'Getsêmani', artist: 'Leonardo Gonçalves', families: ['luto', 'fé'] },
  { title: 'Ninguém Explica Deus', artist: 'Preto no Branco', families: ['fé', 'gratidão'] },
  { title: 'Em Teus Braços', artist: 'Laura Souguellis', families: ['paz', 'solidão'] },
  { title: 'Tua Graça Me Basta', artist: 'Davi Sacer', families: ['culpa', 'gratidão'] },
  { title: 'Grandes Coisas', artist: 'Fernandinho', families: ['gratidão', 'alegria'] },
  { title: 'Pra Sempre', artist: 'Kari Jobe', families: ['luto', 'esperança'] },
  { title: 'Espírito Santo', artist: 'Laura Souguellis', families: ['paz'] },
  { title: 'Deserto', artist: 'Maria Marçal', families: ['solidão', 'esperança'] },
  { title: 'Advogado Fiel', artist: 'Bruna Karla', families: ['fé', 'ansiedade'] },
  { title: 'Acalma o Meu Coração', artist: 'Anderson Freire', families: ['ansiedade', 'paz'] },
  { title: 'Casa do Pai', artist: 'Aline Barros', families: ['alegria', 'gratidão'] },
  // — 2ª leva: reforço de luto, alegria, culpa e solidão —
  { title: 'Teu Amor Não Falha', artist: 'Nívea Soares', families: ['esperança', 'fé'] },
  { title: 'Digno É o Senhor', artist: 'Aline Barros', families: ['alegria', 'gratidão'] },
  { title: 'Aclame ao Senhor', artist: 'Diante do Trono', families: ['alegria', 'gratidão'] },
  { title: 'Preciso de Ti', artist: 'Diante do Trono', families: ['solidão', 'paz'] },
  { title: 'Jeová Jireh', artist: 'Midian Lima', families: ['fé', 'ansiedade'] },
  { title: 'Não Pare', artist: 'Midian Lima', families: ['esperança', 'luto'] },
  { title: 'Ele Não Desiste de Você', artist: 'Marquinhos Gomes', families: ['esperança', 'culpa'] },
  { title: 'Canção do Apocalipse', artist: 'Marine Friesen', families: ['luto', 'esperança'] },
  { title: 'Faz um Milagre em Mim', artist: 'Regis Danese', families: ['culpa', 'esperança'] },
  { title: 'Abraça-me', artist: 'David Quinlan', families: ['paz', 'solidão'] },
  { title: 'Santo Espírito', artist: 'Laura Souguellis', families: ['paz'] },
  { title: 'Consagração', artist: 'Aline Barros', families: ['propósito'] },
  { title: 'Deus é Deus', artist: 'Delino Marçal', families: ['fé', 'alegria'] },
  { title: 'Está Tudo Bem', artist: 'Gabriela Gomes', families: ['ansiedade', 'esperança'] },
  { title: 'Perto Quero Estar', artist: 'Nívea Soares', families: ['paz', 'gratidão'] },
];

interface ItunesTrack {
  trackName: string; artistName: string;
  trackViewUrl: string; previewUrl?: string;
}

async function searchItunes(title: string, artist: string): Promise<ItunesTrack | null> {
  const term = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&country=BR&limit=5`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { results: ItunesTrack[] };
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const wantT = norm(title), wantA = norm(artist);
  for (const r of data.results ?? []) {
    const t = norm(r.trackName), a = norm(r.artistName);
    // nunca aceitar versões instrumentais/karaokê
    if (/playback|instrumental|karaoke|remix/.test(t)) continue;
    // o título do catálogo precisa CONTER o buscado (ou ser igual sem sufixos) —
    // nunca o contrário, senão "Está Tudo Bem" casa com uma faixa chamada "Tudo".
    const catalogBase = t.split('(')[0].trim();
    const titleOk = t.includes(wantT) || catalogBase === wantT;
    const artistOk = a.includes(wantA) || wantA.includes(a);
    if (titleOk && artistOk) return r;
  }
  return null;
}

const searchUrl = (t: string, a: string) => ({
  spotify: `https://open.spotify.com/search/${encodeURIComponent(`${a} ${t}`)}`,
  youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${a} ${t}`)}`,
});

async function main() {
  let ok = 0;
  const rejected: string[] = [];
  for (const c of CANDIDATES) {
    const hit = await searchItunes(c.title, c.artist);
    if (!hit && !c.spotify) {
      rejected.push(`${c.artist} — ${c.title}`);
      console.log(`✗ NÃO ENCONTRADA: ${c.artist} — ${c.title} (fica fora)`);
      continue;
    }
    // usa o nome OFICIAL devolvido pelo catálogo quando houver
    const title = hit?.trackName ?? c.title;
    const artist = hit?.artistName ?? c.artist;
    const links = searchUrl(title, artist);
    await pool.query(
      `INSERT INTO musics (title, artist, families, spotify_url, youtube_url, itunes_url, preview_url, verified_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (title, artist) DO UPDATE SET
         families = EXCLUDED.families,
         spotify_url = EXCLUDED.spotify_url,
         youtube_url = EXCLUDED.youtube_url,
         itunes_url = EXCLUDED.itunes_url,
         preview_url = EXCLUDED.preview_url,
         verified_by = EXCLUDED.verified_by,
         verified_at = now()`,
      [title, artist, c.families, c.spotify ?? links.spotify, links.youtube,
       hit?.trackViewUrl ?? null, hit?.previewUrl ?? null,
       c.spotify ? 'manual+itunes' : 'itunes']
    );
    ok++;
    console.log(`✓ ${artist} — ${title}  [${c.families.join(', ')}]${c.spotify ? ' (faixa exata)' : ''}`);
    await new Promise((r) => setTimeout(r, 350)); // gentileza com a API
  }
  console.log(`\n${ok} músicas validadas e gravadas · ${rejected.length} rejeitadas`);
  const { rows } = await pool.query(
    `SELECT f.family, count(*) n FROM musics m, unnest(m.families) f(family) GROUP BY 1 ORDER BY 1`);
  console.log('\ncobertura por família:');
  rows.forEach((r: any) => console.log(`  ${r.family}: ${r.n}`));
}

main().catch((e) => { console.error('ERRO', e.message); process.exit(1); }).finally(() => pool.end());
