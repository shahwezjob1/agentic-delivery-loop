import type { InvokeWingmanTurnInput, WingmanTurnResult } from '@agentic-delivery-loop/contracts';
import type { UIMessage } from 'ai';
import { buildPrunedModelMessages, validatePrompt } from '../agent/conversation-policy';
import { executeWingmanTurn } from '../agent/turn-executor';
import { buildWingmanSystemPrompt } from '../agent/wingman-prompt';
import { createWingmanTools, getWingmanToolNames } from '../tools/tool-registry';
import { collectWingmanTurnResult } from './tool-call-collector';

export interface ProgrammaticTurnDependencies {
  env: Env;
  persistedMessages: UIMessage[];
}

export async function invokeProgrammaticTurn(
  input: InvokeWingmanTurnInput,
  dependencies: ProgrammaticTurnDependencies,
): Promise<WingmanTurnResult> {
  const prompt = validatePrompt(input.prompt);
  const userMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    parts: [{ type: 'text', text: prompt }],
  };
  const messages = [...dependencies.persistedMessages, userMessage];
  const modelMessages = await buildPrunedModelMessages(messages);
  const tools = createWingmanTools(dependencies.env);
  const result = executeWingmanTurn({
    env: dependencies.env,
    modelMessages,
    systemPrompt: buildWingmanSystemPrompt(getWingmanToolNames(tools)),
    tools,
  });
  return collectWingmanTurnResult(result);
}
