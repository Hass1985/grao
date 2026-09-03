// Página-ponte para o louvor do dia.
//
// O problema que ela resolve: no WhatsApp, o link da música gerava um preview
// do Spotify — miniatura borrada e o título "Search | Spotify", que parece
// link quebrado logo acima da semente.
//
// O preview vem do site de DESTINO. Apontando o link para cá, quem manda a
// imagem e o título é o Grão. A pessoa toca, vê o card do Grão, e chega no
// mesmo lugar: a página redireciona para o louvor.
//
// Bônus: como todo toque passa por aqui, dá para saber quais louvores as
// pessoas realmente ouvem.
//
// O NOME da imagem é versionado porque o WhatsApp guarda cache pela URL da
// IMAGEM, não da página. Trocar o conteúdo do arquivo não adianta: ele reusa
// o que já baixou. Ao mudar o desenho, incremente a versão.
//
// A imagem reproduz o SVG do site, com os números exatos (viewBox 26):
//   ellipse cx=13 cy=13 rx=14.95 ry=9.75 stroke-width=1.5
// O rx é MAIOR que a metade do quadro — é por isso que a elipse é cortada em
// reta nas laterais. Foram três tentativas erradas antes de eu procurar o
// arquivo real: desenhei uma elipse fechada, com traço fino demais.
//
// O traço vale 5,77% do quadro. Três decisões vieram de comparar as opções
// numa simulação da miniatura, e não de intuição:
//
//  - 256×256, perto do tamanho exibido. Resolução MAIOR piora: cada redução
//    suaviza a borda, e o WhatsApp ainda reduz de novo por cima.
//  - margem de 2%. Quanto maior a marca dentro do quadro, mais grosso o traço
//    fica em pixels absolutos na miniatura — é o que mais melhora a nitidez.
//  - traço de largura CONSTANTE, carimbando círculos ao longo da curva. O
//    outline do PIL varia a espessura conforme a curvatura: numa elipse
//    achatada como esta, a lateral saía fina e o topo grosso, e a borda
//    ficava suja. Foi a última fonte de borrão que restava.
//
// Limite honesto: o WhatsApp embute uma miniatura JPEG pequena na própria
// mensagem. Existe um piso de nitidez que não depende do nosso arquivo. Foi
// esse piso que decidiu a questão — o card está DESLIGADO por padrão desde
// então (WA_LINK_PREVIEW, em meta.ts), e as meta tags abaixo ficam dormentes.
//
// A página continua valendo a pena mesmo sem card, por dois motivos: todo
// toque passa por aqui, então sabemos quais louvores as pessoas realmente
// ouvem (é o que alimenta "louvores mais abertos" no painel); e no dia em que
// o card voltar, quem manda a imagem é o Grão, não o Spotify.

import type { Express, Request, Response } from 'express';
import { pool, logEvent } from './db.js';

/** Nome versionado da imagem de preview — ver a nota sobre cache acima. */
const OG_IMAGEM = 'og-v7.png';

/** Escapa para inserir com segurança em atributo HTML. */
function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function registerOuvirRoutes(app: Express, baseUrl: () => string) {
  app.get('/ouvir/:seedId', async (req: Request, res: Response) => {
    try {
      const { rows: [s] } = await pool.query(
        `SELECT music_title, music_artist,
                coalesce(music_spotify, music_youtube) url
           FROM seeds WHERE id = $1`, [req.params.seedId]);

      if (!s?.url) return res.status(404).send('Louvor não encontrado.');

      void logEvent(null, 'musica_aberta', { seedId: req.params.seedId, titulo: s.music_title });

      const titulo = `${s.music_title}${s.music_artist ? ` — ${s.music_artist}` : ''}`;
      const og = `${baseUrl()}/${OG_IMAGEM}`;

      // O redirecionamento é por JS e por meta refresh, nunca por HTTP 302:
      // um 302 faria o rastreador do WhatsApp seguir até o Spotify e ler as
      // meta tags DE LÁ — voltando ao preview borrado que queremos evitar.
      // Assim o rastreador para nesta página e o navegador segue adiante.
      res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · Grão</title>
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="Grão">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="O louvor da sua semente de hoje. 🌱">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="256">
<meta property="og:image:height" content="256">
<meta property="og:image:alt" content="Grão">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url=${esc(s.url)}">
<style>
  body{margin:0;display:grid;place-items:center;min-height:100vh;
       font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
       background:#F7F3EA;color:#3A3227;text-align:center;padding:1.5rem}
  a{color:#B4762A}
</style>
</head><body>
<div>
  <p style="font-size:2rem;margin:0 0 .5rem">🌱</p>
  <p style="margin:0 0 .25rem"><strong>${esc(s.music_title ?? '')}</strong></p>
  <p style="margin:0 0 1.25rem;opacity:.7">${esc(s.music_artist ?? '')}</p>
  <p style="opacity:.7">Abrindo o louvor…</p>
  <p><a href="${esc(s.url)}">Se não abrir, toque aqui.</a></p>
</div>
<script>location.replace(${JSON.stringify(s.url)});</script>
</body></html>`);
    } catch (err: any) {
      console.error('[ouvir]', err?.message || err);
      res.status(500).send('Falha ao abrir o louvor.');
    }
  });
}
