import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, SAVE_PROFILE_TOOL } from './prompt.js';

// A chave vem de ANTHROPIC_API_KEY (nunca hardcode).
const client = new Anthropic();
const MODEL = process.env.GRAO_MODEL || 'claude-opus-4-8';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type TurnResult =
  | { kind: 'question'; text: string }
  | { kind: 'profile'; profile: any; text: string };

/**
 * Roda uma rodada da conversa. O modelo devolve uma pergunta em texto OU,
 * quando já conhece a pessoa, chama a ferramenta `salvar_perfil` (JSON silencioso).
 */
export async function runTurn(history: ChatMessage[]): Promise<TurnResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    // Pensamento adaptativo melhora a precisão da classificação oculta.
    // (cast: o tipo do SDK instalado ainda não lista 'adaptive')
    thinking: { type: 'adaptive' } as any,
    // Prompt caching: o system é grande e estável → ~90% mais barato após a 1ª chamada.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [SAVE_PROFILE_TOOL as any],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (toolUse && toolUse.type === 'tool_use') {
      return { kind: 'profile', profile: toolUse.input, text };
    }
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return { kind: 'question', text };
}
