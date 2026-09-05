// As rotas e o aviso de cobrança.
//
// A reclamação NÚMERO UM contra o concorrente é cobrança sem aviso claro:
// gente cobrada sem perceber que o teste acabou, gente que queria o mensal e
// foi cobrada no anual. E a segunda é cancelamento arrastado, resolvido em
// metade dos casos, com resposta que já levou 30 dias.
//
// As duas se resolvem no mesmo lugar, e nenhuma é feature difícil: é decisão de
// operação. Por isso vira código explícito aqui, e não uma promessa numa página
// de termos.
//
//  - aviso 24h antes, pelo WhatsApp, com valor e plano escritos por extenso;
//  - cancelamento respondendo "CANCELAR" na própria conversa, sem formulário,
//    sem e-mail, sem falar com ninguém.

import type { Express, Request, Response } from 'express';
import { pool, logEvent } from './db.js';
import {
  asaasConfigurado, criarCliente, criarAssinatura, cancelarAssinatura,
  cobrancasDeAmanha, webhookAutentico, aplicarEvento, PLANOS, type Plano,
} from './asaas.js';
import { sendText } from './meta.js';

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * O aviso que o concorrente não dá.
 *
 * Escrito por extenso de propósito: valor, plano, quando, e como sair. Uma
 * pessoa que lê isto e decide continuar está de fato escolhendo; uma pessoa
 * surpreendida pela fatura vira reclamação, pedido de reembolso e uma nota na
 * loja de aplicativos que fica lá para sempre.
 *
 * "CANCELAR" em maiúsculas porque é o que ela vai digitar de volta, e precisa
 * ficar óbvio à primeira leitura.
 */
export function textoDoAviso(dados: {
  nome: string | null; plano: string; valorCentavos: number; quando: string;
}): string {
  const ciclo = dados.plano === 'anual' ? 'por ano' : 'por mês';
  // Sem nome, a frase precisa começar com maiúscula. Detalhe pequeno que, numa
  // mensagem sobre dinheiro, é a diferença entre parecer cuidado e parecer robô.
  const abertura = dados.nome
    ? `${dados.nome}, um aviso, sem susto:`
    : 'Um aviso, sem susto:';
  return [
    `${abertura} amanhã (${dados.quando}) começa a cobrança do seu plano.`,
    '',
    `*Plano:* ${dados.plano === 'anual' ? 'Anual' : 'Plantio'}`,
    `*Valor:* ${reais(dados.valorCentavos)} ${ciclo}`,
    `*Forma:* Pix`,
    '',
    'Se quiser continuar, não precisa fazer nada.',
    '',
    'Se preferir parar, responda *CANCELAR* aqui mesmo. Cancela na hora, sem ' +
    'formulário e sem falar com ninguém. Você continua com o devocional diário ' +
    'de graça, para sempre.',
  ].join('\n');
}

/**
 * Varre quem tem cobrança amanhã e manda o aviso.
 *
 * De hora em hora, chamada pela mesma agenda que entrega a semente. A consulta
 * já exclui quem foi avisado desta cobrança, então rodar de novo não duplica.
 */
export async function avisarCobrancasProximas(): Promise<{ avisados: number; falhas: number }> {
  let avisados = 0, falhas = 0;
  for (const c of await cobrancasDeAmanha()) {
    const r = await sendText(c.telefone, textoDoAviso({
      nome: c.nome, plano: c.plano, valorCentavos: c.valorCentavos, quando: c.quando,
    }));
    if (r.ok) {
      await pool.query(
        `UPDATE subscriptions SET avisado_em = now() WHERE user_id = $1`, [c.userId]);
      void logEvent(c.userId, 'cobranca_avisada', { plano: c.plano, quando: c.quando });
      avisados++;
    } else {
      falhas++;
      console.error(`[cobrança] falha ao avisar ${c.telefone}: ${r.erro}`);
    }
  }
  if (avisados || falhas) console.log(`[cobrança] ${avisados} aviso(s), ${falhas} falha(s)`);
  return { avisados, falhas };
}

/**
 * Cancelamento em um passo.
 *
 * Devolve a mensagem já pronta, porque quem chama (o webhook do WhatsApp) só
 * precisa enviar. E cancelar NUNCA tira o devocional diário: o gratuito é
 * gratuito para sempre, e dizer isso na hora do cancelamento é o que
 * transforma uma saída em uma pausa.
 */
export async function cancelarPara(userId: string, por = 'usuario'): Promise<string> {
  const { rows: [s] } = await pool.query(
    `SELECT provider_ref, status FROM subscriptions WHERE user_id = $1`, [userId]);

  if (!s || ['cancelada', 'expirada'].includes(s.status)) {
    return 'Você já não tem cobrança ativa por aqui. O devocional diário continua seu, de graça. 🌱';
  }

  if (s.provider_ref && asaasConfigurado()) {
    const r = await cancelarAssinatura(s.provider_ref);
    // Falha no gateway NÃO segura o cancelamento do nosso lado. Deixar a
    // pessoa presa porque uma API externa caiu é exatamente a fricção que
    // estamos tentando não repetir; a equipe concilia depois pelo painel.
    if (!r.ok) console.error(`[cobrança] Asaas recusou o cancelamento: ${r.erro}`);
  }

  await pool.query(
    `UPDATE subscriptions
        SET status = 'cancelada', canceled_at = now(), cancelado_por = $2, updated_at = now()
      WHERE user_id = $1`, [userId, por]);
  void logEvent(userId, 'assinatura_cancelada', { por });

  return [
    'Pronto, cancelado. Não vai haver cobrança.',
    '',
    'O devocional diário continua seu, de graça, todos os dias. Se um dia quiser ' +
    'voltar a receber a semente pelo WhatsApp, é só me dizer.',
    '',
    'Obrigado por ter experimentado. 🌱',
  ].join('\n');
}

export function registerCobrancaRoutes(app: Express) {
  /**
   * Assinar. Chamado pelo app depois da escolha do plano.
   *
   * CPF é exigência do Asaas para criar cliente, não capricho nosso.
   */
  app.post('/assinatura/:userId', async (req: Request, res: Response) => {
    const { plano, cpf, email } = req.body as { plano?: string; cpf?: string; email?: string };
    if (!plano || !(plano in PLANOS)) {
      return res.status(400).json({ error: `plano deve ser um de: ${Object.keys(PLANOS).join(', ')}` });
    }
    if (!cpf || cpf.replace(/\D/g, '').length < 11) {
      return res.status(400).json({ error: 'cpf é obrigatório para gerar a cobrança' });
    }
    if (!asaasConfigurado()) return res.status(503).json({ error: 'cobrança ainda não configurada' });

    try {
      const { rows: [u] } = await pool.query(
        `SELECT name, phone_e164 FROM users WHERE id = $1`, [req.params.userId]);
      if (!u) return res.status(404).json({ error: 'usuário não encontrado' });

      const cli = await criarCliente({
        userId: req.params.userId, nome: u.name || 'Assinante Grão',
        cpfCnpj: cpf, email, telefone: u.phone_e164 ?? undefined,
      });
      if (!cli.ok) return res.status(502).json({ error: cli.erro });

      const ass = await criarAssinatura({
        customerId: cli.customerId!, plano: plano as Plano, userId: req.params.userId,
      });
      if (!ass.ok) return res.status(502).json({ error: ass.erro });

      await pool.query(
        `INSERT INTO subscriptions
           (user_id, plan, status, price_cents, trial_ends_at, provider, provider_ref,
            asaas_customer_id, next_charge_at)
         VALUES ($1, $2, 'trial', $3, $4::date, 'asaas', $5, $6, $4::date)
         ON CONFLICT (user_id) DO UPDATE
           SET plan = excluded.plan, status = 'trial', price_cents = excluded.price_cents,
               trial_ends_at = excluded.trial_ends_at, provider = 'asaas',
               provider_ref = excluded.provider_ref,
               asaas_customer_id = excluded.asaas_customer_id,
               next_charge_at = excluded.next_charge_at,
               avisado_em = NULL, updated_at = now()`,
        [req.params.userId, plano, Math.round(PLANOS[plano as Plano].valor * 100),
         ass.primeiraCobranca, ass.subscriptionId, cli.customerId]);

      void logEvent(req.params.userId, 'assinatura_criada',
        { plano, primeiraCobranca: ass.primeiraCobranca });
      return res.json({ ok: true, plano, primeiraCobranca: ass.primeiraCobranca, diasGratis: 7 });
    } catch (err: any) {
      console.error('[assinatura]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao criar a assinatura.' });
    }
  });

  /** Cancelar pelo app. O mesmo caminho existe no WhatsApp, escrevendo CANCELAR. */
  app.post('/assinatura/:userId/cancelar', async (req: Request, res: Response) => {
    try {
      const mensagem = await cancelarPara(req.params.userId, 'usuario');
      return res.json({ ok: true, mensagem });
    } catch (err: any) {
      console.error('[cancelar]', err?.message || err);
      return res.status(500).json({ error: 'Falha ao cancelar.' });
    }
  });

  /**
   * Webhook do Asaas.
   *
   * Autenticado pelo header asaas-access-token, que nós definimos ao criar o
   * webhook no painel deles. Responde 200 rápido: se demorar ou falhar, o Asaas
   * enfileira e reenvia, e a fila trava os eventos seguintes.
   */
  app.post('/pagamento/webhook', async (req: Request, res: Response) => {
    if (!webhookAutentico(req.header('asaas-access-token'))) {
      console.warn('[pagamento] webhook recusado: token inválido');
      return res.status(401).send('token inválido');
    }
    res.status(200).send('ok');

    const { event, payment } = (req.body ?? {}) as { event?: string; payment?: any };
    if (!event) return;
    try {
      const efeito = await aplicarEvento(event, payment);
      console.log(`[pagamento] ${efeito}`);
    } catch (e: any) {
      console.error('[pagamento] falha ao aplicar evento:', e?.message || e);
    }
  });
}
