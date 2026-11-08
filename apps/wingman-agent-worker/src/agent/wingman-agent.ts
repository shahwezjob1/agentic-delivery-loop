import type { InvokeWingmanTurnInput, WingmanTurnResult } from '@agentic-delivery-loop/contracts';
import { AIChatAgent } from '@cloudflare/ai-chat';
import type { UIMessage } from 'ai';
import { InvalidWingmanPromptError } from '../errors/wingman-errors';
import { invokeProgrammaticTurn } from '../invocation/programmatic-turn.service';
import { createWingmanTools, getWingmanToolNames } from '../tools/tool-registry';
import { buildPrunedModelMessages, validatePrompt } from './conversation-policy';
import { executeWingmanTurn } from './turn-executor';
import { buildWingmanSystemPrompt } from './wingman-prompt';

function latestUserText(messages: UIMessage[]): string {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  if (!latest) return '';
  return latest.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export class WingmanAgent extends AIChatAgent<Env> {
  async onChatMessage(): Promise<Response> {
    try {
      validatePrompt(latestUserText(this.messages));
      const tools = createWingmanTools(this.env);
      const result = executeWingmanTurn({
        env: this.env,
        modelMessages: await buildPrunedModelMessages(this.messages),
        systemPrompt: buildWingmanSystemPrompt(getWingmanToolNames(tools)),
        tools,
      });
      return result.toUIMessageStreamResponse();
    } catch (error) {
      if (error instanceof InvalidWingmanPromptError) {
        return new Response(error.message, { status: 400 });
      }
      throw error;
    }
  }

  async invokeTurn(input: InvokeWingmanTurnInput): Promise<WingmanTurnResult> {
    return invokeProgrammaticTurn(input, {
      env: this.env,
      persistedMessages: this.messages,
    });
  }
}
