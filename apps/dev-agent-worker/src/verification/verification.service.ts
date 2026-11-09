import { getAgentByName } from 'agents';
import type {
  JsonValue,
  WingmanTurnResult,
  WingmanVerificationResult,
} from '@agentic-delivery-loop/contracts';
import type { UIMessage } from 'ai';
import type { Env } from '../env';
import type { DevLogger } from '../observability/logger';
import type { VerifyWingmanCapabilityInput } from './verification-types';
function collectToolNames(value: JsonValue, names: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectToolNames(item, names);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (typeof value.toolName === 'string') {
    names.add(value.toolName);
  }
  for (const child of Object.values(value)) {
    collectToolNames(child, names);
  }
}
function inspect(result: WingmanTurnResult): {
  message: UIMessage;
  toolNames: string[];
} {
  const names = new Set<string>();
  collectToolNames(result, names);
  const text = typeof result.text === 'string' ? result.text : '';
  const message: UIMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text,
      },
    ],
  };
  return {
    message,
    toolNames: [...names],
  };
}
export class VerificationService {
  constructor(
    private ns: Env['WINGMAN_AGENT'],
    private log: DevLogger,
  ) {}
  async verifyDeployedWingman(
    input: VerifyWingmanCapabilityInput,
  ): Promise<WingmanVerificationResult> {
    const started = Date.now();
    const conversationId = crypto.randomUUID();
    this.log.info('wingman_verification_started', {
      conversationId,
      expectedToolName: input.expectedToolName,
    });
    try {
      const wingman = await getAgentByName(this.ns, conversationId);
      const wingmanResult = (await wingman.invokeTurn({
        prompt: input.prompt,
      })) as WingmanTurnResult;
      const inspected = inspect(wingmanResult);
      const verified = inspected.toolNames.some((toolName) => toolName === input.expectedToolName);
      const result: WingmanVerificationResult = {
        verified,
        expectedToolName: input.expectedToolName,
        wingmanResponse: inspected.message,
        toolsCalled: inspected.toolNames.map((toolName) => ({
          toolName,
          input: null,
        })),
      };
      this.log.info('wingman_verification_completed', {
        conversationId,
        expectedToolName: input.expectedToolName,
        toolsCalled: inspected.toolNames,
        verificationStatus: verified ? 'verified' : 'not_verified',
        durationMs: Date.now() - started,
      });
      return result;
    } catch (error) {
      this.log.error('wingman_verification_failed', {
        conversationId,
        verificationStatus: 'error',
        durationMs: Date.now() - started,
        errorCode: 'WINGMAN_VERIFICATION_FAILED',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
