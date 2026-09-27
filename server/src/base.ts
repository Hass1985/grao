// O endereço público do backend, num lugar só.
//
// Ele aparece em três lugares que a pessoa vê: o link do louvor na mensagem do
// WhatsApp, a og:image que o rastreador busca para montar o cartão do link, e
// o link do painel no aviso de risco emocional.
//
// POR QUE ISTO VIROU UM MÓDULO
//
// Estava escrito duas vezes, com NOMES DIFERENTES: whatsapp.ts lia
// PUBLIC_BASE_URL e alerta.ts lia BASE_URL. Como só a primeira estava
// configurada no Render, o aviso de risco saía com "O que foi dito está no
// painel: /admin" — um link para lugar nenhum, na única mensagem do sistema
// que existe para alguém agir rápido.
//
// O erro passou despercebido porque o script de teste definia BASE_URL antes
// de disparar. O teste criava a condição que escondia o defeito, que é a
// maneira mais educada de um teste mentir.
//
// O PADRÃO É O DOMÍNIO PRÓPRIO
//
// Era `grao-backend.onrender.com`, o endereço que a hospedagem nos deu. Um
// endereço emprestado: ele diz em quem estamos hospedados e deixa de existir
// no dia em que mudarmos de hospedagem. Como ele sai em mensagem de WhatsApp,
// em cartão de link e em aviso de risco, cada um desses é um lugar onde a
// troca de hospedagem viraria link quebrado — inclusive em conversas antigas,
// que ninguém reescreve.
//
// `api.graoapp.com.br` é nosso e aponta para onde quisermos. PUBLIC_BASE_URL
// continua vencendo quando definida, para um ambiente de teste poder apontar
// para outro lugar sem mexer em código.

export const BASE_URL = () =>
  (process.env.PUBLIC_BASE_URL || 'https://api.graoapp.com.br').replace(/\/+$/, '');

/** O painel, para os avisos que mandam alguém olhar lá. */
export const PAINEL_URL = () => `${BASE_URL()}/admin`;
