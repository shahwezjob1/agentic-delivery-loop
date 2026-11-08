import { createAI } from 'agents/models/ai-sdk';
import { stepCountIs, streamText } from 'ai';
import type { ModelMessage, Tool } from 'ai';

export const WINGMAN_MODEL = '@cf/zai-org/glm-4.7-flash';
export const WINGMAN_MAX_STEPS = 5;
export const WINGMAN_MAX_OUTPUT_TOKENS = 400;

export interface ExecuteWingmanTurnInput {
  env: Env;
  modelMessages: ModelMessage[];
  systemPrompt: string;
  tools: Record<string, Tool>;
}

export function executeWingmanTurn(input: ExecuteWingmanTurnInput) {
  const ai = createAI({ binding: input.env.AI });
  return streamText({
    model: ai(WINGMAN_MODEL),
    system: input.systemPrompt,
    messages: input.modelMessages,
    tools: input.tools,
    stopWhen: stepCountIs(WINGMAN_MAX_STEPS),
    maxOutputTokens: WINGMAN_MAX_OUTPUT_TOKENS,
  });
}
