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
function objects(v: JsonValue, out: Record<string, JsonValue>[] = []): Record<string, JsonValue>[] {
  if (Array.isArray(v)) for (const x of v) objects(x, out);
  else if (v && typeof v === 'object') {
    out.push(v as Record<string, JsonValue>);
    for (const x of Object.values(v)) objects(x, out);
  }
  return out;
}
function inspect(r: WingmanTurnResult) {
  const all = objects(r);
  const names = [
    ...new Set(all.map((x) => x.toolName).filter((x): x is string => typeof x === 'string')),
  ];
  const candidate = all.find(
    (x) => typeof x.id === 'string' && x.role === 'assistant' && Array.isArray(x.parts),
  );
  if (!candidate) throw new Error('Wingman result did not contain a final assistant UIMessage.');
  return { message: candidate as unknown as UIMessage, names };
}
export class VerificationService {
  constructor(
    private ns: Env['WINGMAN_AGENT'],
    private log: DevLogger,
  ) {}
  async verifyDeployedWingman(i: VerifyWingmanCapabilityInput): Promise<WingmanVerificationResult> {
    const started = Date.now();
    const id = crypto.randomUUID();
    this.log.info('wingman_verification_started', { conversationId: id });
    try {
      const wingman = await getAgentByName(this.ns, id);
      const r = (await wingman.invokeTurn({ prompt: i.prompt })) as WingmanTurnResult;
      const x = inspect(r);
      const result = {
        verified: x.names.includes(i.expectedToolName),
        expectedToolName: i.expectedToolName,
        wingmanResponse: x.message,
        toolsCalled: x.names.map((toolName) => ({ toolName })),
      };
      this.log.info('wingman_verification_completed', {
        conversationId: id,
        verificationStatus: result.verified ? 'verified' : 'not_verified',
        durationMs: Date.now() - started,
      });
      return result;
    } catch (e) {
      this.log.error('wingman_verification_failed', {
        conversationId: id,
        verificationStatus: 'error',
        durationMs: Date.now() - started,
        errorCode: 'WINGMAN_VERIFICATION_FAILED',
      });
      throw e;
    }
  }
}
