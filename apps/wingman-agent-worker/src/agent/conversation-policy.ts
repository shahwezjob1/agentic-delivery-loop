import { convertToModelMessages, pruneMessages } from 'ai';
import type { ModelMessage, UIMessage } from 'ai';
import { InvalidWingmanPromptError } from '../errors/wingman-errors';

export const WINGMAN_PROMPT_MIN_LENGTH = 1;
export const WINGMAN_PROMPT_MAX_LENGTH = 300;
export const WINGMAN_CONTEXT_TARGET_MESSAGES = 10;

export function validatePrompt(text: string): string {
  const normalized = text.trim();
  if (normalized.length < WINGMAN_PROMPT_MIN_LENGTH) {
    throw new InvalidWingmanPromptError('Prompt must not be empty.');
  }
  if (normalized.length > WINGMAN_PROMPT_MAX_LENGTH) {
    throw new InvalidWingmanPromptError(
      `Prompt must be at most ${WINGMAN_PROMPT_MAX_LENGTH} characters.`,
    );
  }
  return normalized;
}

export async function buildPrunedModelMessages(messages: UIMessage[]): Promise<ModelMessage[]> {
  const modelMessages = await convertToModelMessages(messages);
  return pruneMessages({
    messages: modelMessages,
    toolCalls: 'before-last-2-messages',
  });
}
