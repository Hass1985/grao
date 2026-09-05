// Cobrança pelo Asaas, com Pix como método principal.
//
// A escolha do Pix é estratégica, não técnica. O concorrente cobra pela loja de
// aplicativos e fica preso ao cartão de crédito; parte relevante do público
// evangélico brasileiro não tem cartão ou tem limite apertado. Cobrar por Pix
// abre uma faixa de mercado que o líder simplesmente não consegue cobrar.
//
// Documentação conferida ao escrever (setembro/2026):
//   POST /v3/customers      cria o cliente        (name e cpfCnpj obrigatórios)
//   POST /v3/subscriptions  cria a assinatura     (customer, billingType, value,
//                                                  nextDueDate, cycle)
//   header de autenticação: access_token
//   webhook chega com o header asaas-access-token, que NÓS definimos ao criar
//
// Sandbox e produção têm URLs diferentes. O ambiente sai da presença da chave:
// chave de sandbox começa com $aact_hmlg_. Não dá para errar de ambiente por
// distração, que é o jeito mais constrangedor de cobrar alguém de verdade
// durante um teste.

import { pool, logEvent } from './db.js';

const CHAVE = () => process.env.ASAAS_API_KEY ?? '';

/** Sandbox se a chave for de homologação. A própria chave diz o ambiente. */
function base(): string {
  return CHAVE().includes('_hmlg_')
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3';
}

export function asaasConfigurado(): boolean {
  return !!CHAVE();
}

export const PLANOS = {
  plantio: { valor: 19.9, ciclo: 'MONTHLY' as const, nome: 'Grão · Plantio (mensal)' },
  anual: { valor: 199.0, ciclo: 'YEARLY' as const, nome: 'Grão · Anual' },
};
export type Plano = keyof typeof PLANOS;

async function chamar<T>(
  caminho: string,
  metodo: 'GET' | 'POST' | 'DELETE',
  corpo?: unknown,
): Promise<{ ok: boolean; dados?: T; erro?: string }> {
  if (!asaasConfigurado()) return { ok: false, erro: 'ASAAS_API_KEY ausente' };

  const res = await fetch(`${base()}${caminho}`, {
    method: metodo,
    headers: {
      access_token: CHAVE(),
      'Content-Type': 'application/json',
      // O Asaas pede identificação da aplicação; ajuda o suporte deles a achar
      // nossas chamadas quando algo dá errado.
      'User-Agent': 'GraoApp/1.0',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    // O Asaas devolve os problemas em errors[].description; sem extrair isso, o
    // log mostra "[object Object]" e a causa some.
    const detalhe = j?.errors?.map((e: any) => e.description).join('; ')
      || j?.message || `HTTP ${res.status}`;
    return { ok: false, erro: detalhe };
  }
  return { ok: true, dados: j as T };
}

/**
 * Cria (ou reaproveita) o cliente no Asaas.
 *
 * `externalReference` recebe o nosso userId: é o que permite reencontrar a
 * pessoa quando o webhook chegar falando de uma cobrança, sem depender de
 * casar por e-mail ou telefone, que mudam.
 */
export async function criarCliente(dados: {
  userId: string; nome: string; cpfCnpj: string; email?: string; telefone?: string;
}): Promise<{ ok: boolean; customerId?: string; erro?: string }> {
  const r = await chamar<{ id: string }>('/customers', 'POST', {
    name: dados.nome,
    cpfCnpj: dados.cpfCnpj.replace(/\D/g, ''),
    email: dados.email,
    mobilePhone: dados.telefone?.replace(/\D/g, ''),
    externalReference: dados.userId,
    notificationDisabled: true,   // quem avisa é o Grão, pelo WhatsApp
  });
  return r.ok ? { ok: true, customerId: r.dados!.id } : { ok: false, erro: r.erro };
}

/**
 * Cria a assinatura recorrente.
 *
 * A primeira cobrança fica para o 8º dia: são os 7 dias grátis prometidos na
 * tela de planos. Prometer teste e cobrar no ato é exatamente a reclamação
 * número um contra o concorrente, e não vamos repeti-la.
 */
export async function criarAssinatura(dados: {
  customerId: string; plano: Plano; userId: string; diasDeTeste?: number;
}): Promise<{ ok: boolean; subscriptionId?: string; primeiraCobranca?: string; erro?: string }> {
  const p = PLANOS[dados.plano];
  const dias = dados.diasDeTeste ?? 7;
  const vencimento = new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

  const r = await chamar<{ id: string; nextDueDate: string }>('/subscriptions', 'POST', {
    customer: dados.customerId,
    billingType: 'PIX',
    value: p.valor,
    nextDueDate: vencimento,
    cycle: p.ciclo,
    description: p.nome,
    externalReference: dados.userId,
  });
  return r.ok
    ? { ok: true, subscriptionId: r.dados!.id, primeiraCobranca: r.dados!.nextDueDate }
    : { ok: false, erro: r.erro };
}

/**
 * Cancela a assinatura.
 *
 * Um clique, sem formulário e sem e-mail. É o outro lado da bandeira de
 * confiança: cancelamento difícil é o que gera metade das reclamações contra o
 * concorrente, e um cancelamento fácil custa menos que uma reputação.
 */
export async function cancelarAssinatura(
  subscriptionId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const r = await chamar(`/subscriptions/${subscriptionId}`, 'DELETE');
  return r.ok ? { ok: true } : { ok: false, erro: r.erro };
}

/** Assinaturas cuja próxima cobrança cai amanhã, para o aviso de 24h. */
export async function cobrancasDeAmanha(): Promise<{
  userId: string; nome: string | null; telefone: string; plano: string;
  valorCentavos: number; quando: string;
}[]> {
  const { rows } = await pool.query(
    `SELECT s.user_id "userId", u.name nome, u.phone_e164 telefone,
            s.plan plano, s.price_cents "valorCentavos",
            to_char(s.next_charge_at AT TIME ZONE u.timezone, 'DD/MM') quando
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
      WHERE s.status IN ('trial', 'ativa')
        AND s.next_charge_at IS NOT NULL
        AND u.phone_e164 IS NOT NULL
        AND (s.next_charge_at AT TIME ZONE u.timezone)::date
          = ((now() AT TIME ZONE u.timezone) + interval '1 day')::date
        AND (s.avisado_em IS NULL
             OR s.avisado_em < s.next_charge_at - interval '2 days')`);
  return rows as any[];
}

/** Confere o header que o Asaas manda no webhook. */
export function webhookAutentico(recebido: string | undefined): boolean {
  const esperado = (process.env.ASAAS_WEBHOOK_TOKEN ?? '').trim();
  if (!esperado) return false;
  return (recebido ?? '').trim() === esperado;
}

/**
 * Aplica um evento de cobrança na assinatura.
 *
 * Só os eventos que mudam o ACESSO da pessoa importam aqui. Os outros são
 * registrados e ignorados de propósito: cada estado que o código conhece é um
 * estado que alguém precisa manter, e o Asaas tem dezenas.
 */
export async function aplicarEvento(evento: string, pagamento: any): Promise<string> {
  const userId = pagamento?.externalReference;
  if (!userId) return 'sem externalReference';

  const vencimento = pagamento?.dueDate ? new Date(pagamento.dueDate) : null;

  // PAYMENT_CREATED é quem sabe QUANDO é a próxima cobrança.
  //
  // Eu tinha lido o vencimento do PAYMENT_CONFIRMED, e está errado: ali o
  // vencimento é o da cobrança que ACABOU de ser paga, ou seja, uma data no
  // passado. O aviso de 24h nunca mais dispararia depois do primeiro mês, e o
  // sintoma só apareceria na segunda cobrança de cada assinante, como uma
  // fatura sem aviso. Exatamente a reclamação que este produto quer não ter.
  //
  // Quando o Asaas gera a cobrança do ciclo seguinte, ele avisa por aqui com o
  // vencimento novo. `avisado_em` volta a NULL porque é outra cobrança, e ela
  // merece o seu próprio aviso.
  if (evento === 'PAYMENT_CREATED') {
    if (!vencimento) return 'PAYMENT_CREATED sem dueDate';
    const { rowCount } = await pool.query(
      `UPDATE subscriptions
          SET next_charge_at = $2, avisado_em = NULL, updated_at = now()
        WHERE user_id = $1`, [userId, vencimento]);
    void logEvent(userId, 'pagamento_evento',
      { evento, aplicado: true, proximaCobranca: pagamento.dueDate });
    return rowCount
      ? `próxima cobrança marcada para ${pagamento.dueDate}`
      : 'assinatura não encontrada';
  }

  const novo =
    evento === 'PAYMENT_CONFIRMED' || evento === 'PAYMENT_RECEIVED' ? 'ativa'
    : evento === 'PAYMENT_OVERDUE' ? 'expirada'
    : evento === 'PAYMENT_REFUNDED' || evento === 'PAYMENT_DELETED' ? 'cancelada'
    : null;

  if (!novo) {
    void logEvent(userId, 'pagamento_evento', { evento, aplicado: false });
    return `evento ${evento} registrado, sem efeito no acesso`;
  }

  // O status muda, o next_charge_at NÃO: quem o define é o PAYMENT_CREATED.
  const { rowCount } = await pool.query(
    `UPDATE subscriptions SET status = $2, updated_at = now() WHERE user_id = $1`,
    [userId, novo]);

  void logEvent(userId, 'pagamento_evento', { evento, aplicado: true, status: novo });
  return rowCount ? `${evento} → ${novo}` : 'assinatura não encontrada';
}
