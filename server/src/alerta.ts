// Aviso de risco emocional, para fora do painel.
//
// O detector já existia e funciona: `risco_detectado` é gravado em quatro
// pontos (abertura, resposta, WhatsApp e troca de sentimento) e aparece no
// /admin com o rótulo de sinal de risco. O problema é que ele aparece APENAS
// para quem abrir o painel. Ninguém é avisado.
//
// Com nós quatro testando isso não custou nada: são 5 eventos até hoje. Com
// mil pessoas, alguém escreve algo grave numa quinta à noite e ninguém vê
// antes de segunda.
//
// POR QUE WEBHOOK, E NÃO E-MAIL OU WHATSAPP
//
// WhatsApp para o time exigiria template aprovado pela Meta (a janela de 24h
// está fechada para quem não escreveu para o bot hoje), e isso são dias de
// espera. E-mail exigiria conta em mais um serviço. Um webhook é uma variável
// de ambiente e funciona hoje com Slack, Discord, Google Chat, n8n ou o que
// estiver à mão — o formato abaixo serve aos três primeiros sem adaptação.
//
// O QUE NÃO VAI NO AVISO
//
// O `trecho` fica de fora. Ele é o pedaço literal da fala que acionou o
// detector, ou seja, a frase mais delicada que aquela pessoa já nos disse;
// mandar isso para um chat de terceiro é exatamente o que a revisão de
// segurança existe para evitar. O aviso leva o necessário para alguém agir —
// quem, quão grave, por onde e quando — e um link para o painel, onde o
// contexto está, atrás do token.

import { pool } from './db.js';

const URL_AVISO = () => (process.env.ALERTA_WEBHOOK_URL ?? '').trim();
const PAINEL = () => (process.env.BASE_URL ?? '').replace(/\/+$/, '') + '/admin';

/**
 * Um aviso por pessoa a cada 30 minutos.
 *
 * Em memória, de propósito: é uma trava contra repetição na mesma conversa,
 * não um registro. Reiniciar o processo e mandar um aviso a mais é barato;
 * deixar de mandar um é o erro que não dá para desfazer.
 */
const ULTIMO = new Map<string, number>();
const ESPERA_MS = 30 * 60_000;

function cedoDemais(userId: string): boolean {
  const antes = ULTIMO.get(userId);
  const agora = Date.now();
  if (antes && agora - antes < ESPERA_MS) return true;
  ULTIMO.set(userId, agora);
  // A tabela não cresce: sem limpeza, um processo de meses acumularia uma
  // entrada por pessoa que já passou por aqui.
  if (ULTIMO.size > 5_000) {
    for (const [k, t] of ULTIMO) if (agora - t > ESPERA_MS) ULTIMO.delete(k);
  }
  return false;
}

/** Mesma regra do painel: dá para reconhecer quem é sem expor o número. */
function mascarar(e164: string | null): string {
  if (!e164 || e164.length < 4) return 'sem telefone';
  return '••••' + e164.slice(-4);
}

type Dados = { nivel: 'atencao' | 'grave'; origem: string; teste?: boolean };

/**
 * Avisa o time. Nunca lança, nunca espera: é chamado com `void` de dentro de
 * fluxos que estão no meio de uma conversa com uma pessoa, e uma falha aqui
 * não pode atrapalhar a resposta de cuidado que ela está prestes a receber.
 */
export async function avisarRisco(userId: string, dados: Dados): Promise<void> {
  const url = URL_AVISO();
  if (!url) return;
  if (cedoDemais(userId)) return;

  try {
    const { rows: [u] } = await pool.query(
      `SELECT name, phone_e164 FROM users WHERE id = $1`, [userId]);

    const quem = u?.name || 'alguém sem nome no cadastro';
    const grave = dados.nivel === 'grave';
    const nivel = grave ? 'grave' : 'atenção';
    const texto =
      `${grave ? '🚨' : '⚠️'} Sinal de risco emocional${dados.teste ? ' (em demonstração)' : ''}\n` +
      `${quem} · ${mascarar(u?.phone_e164 ?? null)} · nível ${nivel} · veio de ${dados.origem}\n` +
      `O que foi dito está no painel: ${PAINEL()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // text serve o Slack e o Google Chat, content serve o Discord. Os campos
      // soltos ficam para quem plugar um n8n e quiser ramificar por nível.
      body: JSON.stringify({
        text: texto, content: texto,
        nivel: dados.nivel, origem: dados.origem, teste: !!dados.teste,
        userId, painel: PAINEL(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[alerta] webhook recusou: ${res.status}`);
      // Não avisou, então não vale a espera de 30 min: a próxima tentativa
      // precisa poder sair. Sem isto, um webhook com a URL errada engoliria
      // todos os sinais daquela pessoa por meia hora, em silêncio.
      ULTIMO.delete(userId);
    }
  } catch (e: any) {
    console.error('[alerta] falha ao avisar:', e?.message || e);
    ULTIMO.delete(userId);
  }
}
