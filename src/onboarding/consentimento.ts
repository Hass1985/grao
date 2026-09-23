// Consentimento para o dado sensível.
//
// A LGPD trata convicção religiosa e dado sobre o estado emocional como dados
// sensíveis, e para eles exige consentimento específico — o aceite genérico de
// termos não cobre. É por isso que a caixa aparece na tela do relato, e não no
// cadastro: é ali que a pessoa efetivamente conta o que sente.
//
// A resposta vem do servidor, não do aparelho. Guardar "já consentiu" em
// AsyncStorage faria a caixa reaparecer a cada celular novo e sumir para quem
// limpou o cache sem nunca ter marcado nada.

import { API_URL, getUserId, apiFetch } from './aiClient';

/** Já consentiu? Em caso de dúvida (rede fora), responde que sim. */
export async function jaConsentiu(): Promise<boolean> {
  // Sem backend (build de demonstração) não há o que registrar, e travar a
  // tela numa caixa que não leva a lugar nenhum seria pior.
  if (!API_URL) return true;
  try {
    const userId = await getUserId();
    const res = await apiFetch(`/consentimento/${userId}`);
    if (!res.ok) return true;
    const j = await res.json();
    return !!j.consentiu;
  } catch {
    // Falha de rede não pode impedir alguém de desabafar. A caixa fica
    // escondida, e o consentimento é registrado na próxima vez que der.
    return true;
  }
}

/** Registra o aceite. Silencioso: o relato não pode travar por causa disto. */
export async function registrarConsentimento(origem = 'relato'): Promise<void> {
  if (!API_URL) return;
  try {
    const userId = await getUserId();
    await apiFetch(`/consentimento/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ origem }),
    });
  } catch {
    /* segue o fluxo */
  }
}
