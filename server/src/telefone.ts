// A regra do telefone, em um arquivo só.
//
// Ela decide identidade: o mesmo número precisa virar exatamente a mesma string
// no WhatsApp, no login por telefone e na fusão de cadastros. Duas cópias
// divergem na primeira correção feita só de um lado, e o sintoma é a mesma
// pessoa virando duas no banco, uma recebendo semente e a outra abrindo o app.
//
// Morava dentro de whatsapp.ts. Saiu de lá quando o login por telefone passou a
// precisar da mesma regra: auth.ts importaria o módulo do WhatsApp, que importa
// auth.ts de volta, e um ciclo de imports quebra no dia em que alguém trocar
// uma função por uma constante.

/** Telefone em E.164 (+5511999999999). Devolve null se não der para normalizar. */
export function normalizePhone(raw: string): string | null {
  // O zero da operadora, que muita gente digita antes do DDD ("011 98765…"),
  // sai antes de qualquer coisa. Sem isto o número tinha 12 dígitos, escapava
  // da regra do DDI e virava +011987654321: uma conta com telefone inválido,
  // e a MESMA pessoa digitando certo no dia seguinte viraria outra conta.
  const digits = (raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 10 || digits.length > 15) return null;
  // Número brasileiro sem DDI: o BSP às vezes entrega assim.
  const comDDI = digits.length <= 11 ? `55${digits}` : digits;
  return `+${comDDI}`;
}
