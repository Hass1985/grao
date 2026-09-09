// A Bíblia para consulta livre dentro do app.
//
// O texto já estava aqui: 31.102 versículos, 66 livros, na Bíblia Livre
// (BLIVRE) — a mesma que sustenta o versículo literal das sementes e do
// devocional. É domínio público, e por isso pode ser lida, copiada e
// compartilhada sem licença, sem contrato e sem contar acessos.
//
// SOBRE A NVI: é tradução com direitos da Biblica/Editora Vida. Distribuir o
// texto dentro do app exige licença comercial — não é algo que se resolve
// importando um arquivo. O desenho aqui já espera esse dia: `translation` é
// coluna da tabela e parâmetro das rotas, então acrescentar a NVI no futuro é
// importar linhas e ligar um seletor, não refazer a tela.
//
// Servida pelo servidor, e não embutida no app, por dois motivos: são ~4 MB de
// texto que ninguém quer baixar junto com o aplicativo, e a correção de um
// versículo errado precisa valer no mesmo dia para todo mundo.

import type { Express, Request, Response } from 'express';
import { pool } from './db.js';

const PADRAO = 'BLIVRE';

export function registerBibliaRoutes(app: Express) {
  /** Os 66 livros, na ordem canônica, com quantos capítulos cada um tem. */
  app.get('/biblia/livros', async (req: Request, res: Response) => {
    try {
      const traducao = String(req.query.traducao ?? PADRAO);
      const { rows } = await pool.query(
        `SELECT book_nr numero, book nome, max(chapter)::int capitulos,
                (book_nr <= 39) "antigo"
           FROM bible_verses WHERE translation = $1
          GROUP BY book_nr, book ORDER BY book_nr`, [traducao]);
      res.json({ traducao, livros: rows });
    } catch (err: any) {
      console.error('[biblia/livros]', err?.message || err);
      res.status(500).json({ error: 'Falha ao listar os livros.' });
    }
  });

  /** Um capítulo inteiro. É a unidade de leitura — ninguém lê versículo solto. */
  app.get('/biblia/:livro/:capitulo', async (req: Request, res: Response) => {
    try {
      const traducao = String(req.query.traducao ?? PADRAO);
      const capitulo = Number(req.params.capitulo);
      if (!Number.isInteger(capitulo) || capitulo < 1) {
        return res.status(400).json({ error: 'capítulo inválido' });
      }
      const { rows } = await pool.query(
        `SELECT verse numero, text texto
           FROM bible_verses
          WHERE translation = $1 AND book = $2 AND chapter = $3
          ORDER BY verse`, [traducao, req.params.livro, capitulo]);
      if (!rows.length) return res.status(404).json({ error: 'capítulo não encontrado' });

      const { rows: [info] } = await pool.query(
        `SELECT max(chapter)::int capitulos, min(book_nr)::int numero
           FROM bible_verses WHERE translation = $1 AND book = $2`,
        [traducao, req.params.livro]);

      res.json({
        livro: req.params.livro, capitulo, traducao,
        capitulos: info?.capitulos ?? capitulo,
        versiculos: rows,
      });
    } catch (err: any) {
      console.error('[biblia/capitulo]', err?.message || err);
      res.status(500).json({ error: 'Falha ao ler o capítulo.' });
    }
  });

  /**
   * Busca por palavra.
   *
   * Sem índice de texto completo: `ILIKE` com limite baixo resolve para 31 mil
   * versículos e não exige extensão nem manutenção. Se um dia a busca ficar
   * lenta ou precisar entender radicais, aí vale um índice de verdade — antes
   * disso seria complexidade paga sem contrapartida.
   */
  app.get('/biblia/busca', async (req: Request, res: Response) => {
    try {
      const termo = String(req.query.q ?? '').trim();
      if (termo.length < 3) return res.json({ termo, resultados: [] });
      const traducao = String(req.query.traducao ?? PADRAO);
      const { rows } = await pool.query(
        `SELECT book livro, chapter capitulo, verse versiculo, text texto
           FROM bible_verses
          WHERE translation = $1 AND text ILIKE '%' || $2 || '%'
          ORDER BY book_nr, chapter, verse
          LIMIT 60`, [traducao, termo]);
      res.json({ termo, resultados: rows });
    } catch (err: any) {
      console.error('[biblia/busca]', err?.message || err);
      res.status(500).json({ error: 'Falha na busca.' });
    }
  });
}
