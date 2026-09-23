// Tetos de requisição.
//
// Até aqui não havia nenhum: a mesma chamada podia ser repetida na velocidade
// que o computador do outro lado aguentasse. Duas contas pagam esse silêncio —
// a da Anthropic, porque /onboarding/opening chama o Opus, e a do Supabase,
// que tem 60 conexões no total e não distingue carga legítima de enxurrada.
//
// A ideia aqui não é impedir abuso sofisticado (para isso existe WAF, e ele
// entra junto com o domínio próprio). É impedir o laço de repetição bobo, que
// é o que acontece de verdade quando alguém descobre um endpoint aberto.
//
// Quem conta: a pessoa, quando dá para saber quem é; o IP, quando não dá. Sem
// isso, o Wi-Fi de uma igreja inteira dividiria um teto só.

import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

/** Um teto desligado atrapalha mais do que ajuda: fica só para a emergência. */
const LIGADO = (process.env.TETOS ?? 'ligados').trim().toLowerCase() !== 'desligados';

/**
 * O token identifica melhor que o IP: um celular troca de IP no elevador, e um
 * prédio inteiro divide o mesmo IP. Quando há token, ele manda.
 *
 * Não é o token inteiro, e sim a parte final da assinatura — o bastante para
 * separar duas pessoas, sem guardar credencial em memória de biblioteca.
 */
function quem(req: Request): string {
  const auth = req.header('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token.length > 20) return 't:' + token.slice(-24);
  return 'ip:' + faixaDoIp(req.ip ?? '');
}

/**
 * IPv6 contado pela faixa /64, não pelo endereço.
 *
 * Uma operadora entrega um /64 inteiro para cada linha, e o aparelho troca de
 * endereço dentro dela o tempo todo — por privacidade, inclusive. Contando o
 * endereço cheio, cada requisição pareceria vir de alguém novo e o teto nunca
 * fecharia. IPv4 fica como está.
 */
function faixaDoIp(ip: string): string {
  if (!ip.includes(':')) return ip;
  // ::ffff:189.4.x.x — IPv4 embrulhado em IPv6, comum atrás de proxy.
  const embrulhado = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (embrulhado) return embrulhado[1];
  return ip.split(':').slice(0, 4).join(':') + '::/64';
}

function teto(nome: string, minutos: number, quantas: number, isento?: (req: Request) => boolean) {
  const opcoes: Partial<Options> = {
    windowMs: minutos * 60_000,
    limit: quantas,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: quem,
    skip: (req: Request) => !LIGADO || !!isento?.(req),
    handler: (req: Request, res: Response) => {
      console.warn(`[teto] ${nome} estourado — ${req.method} ${req.path}`);
      res.status(429).json({
        error: 'Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.',
        codigo: 'teto',
      });
    },
  };
  return rateLimit(opcoes);
}

/**
 * Quem nunca pode ser barrado.
 *
 * O webhook da Meta chega em rajada quando várias pessoas respondem ao mesmo
 * tempo, e ele vem todo do mesmo punhado de IPs da Meta — barrar ali é perder
 * relato de gente de verdade. Ele já tem a própria porta: a assinatura HMAC.
 * /health e /ready são o Render perguntando se o processo está vivo.
 */
function isentos(req: Request): boolean {
  const p = req.path;
  return p === '/health' || p === '/ready' || p.startsWith('/whatsapp/webhook');
}

/**
 * O teto geral. Folgado de propósito: a tela Hoje faz várias chamadas de uma
 * vez, e o Campo carrega histórico. Quem passa disso não está usando o app.
 */
export const tetoGeral = teto('geral', 1, 240, isentos);

/**
 * As rotas que chamam modelo. Cada uma custa dinheiro de verdade, e nenhuma
 * pessoa precisa de mais que isto num dia — a Abertura acontece uma vez na
 * vida, e a troca de sentimento já tem limite de 3 por dia na própria regra.
 */
export const tetoCaro = teto('modelo', 60, 20);

/**
 * Login e vínculo. Chamado a cada abertura do app, então não pode ser apertado;
 * mas é a porta onde se tenta token atrás de token.
 */
export const tetoAuth = teto('auth', 5, 40);

/** O painel: poucas pessoas, e é onde se tentaria adivinhar o token. */
export const tetoAdmin = teto('admin', 5, 30);
