import { tool } from 'ai';
import { z } from 'zod';
import { assertCanVerify } from '../agent/dev-state';
import { completeVerifiedTicket } from '../agent/lifecycle.service';
import type { VerifyWingmanCapabilityInput } from '../verification/verification-types';
import type { DevToolContext } from './tool-context';
export const verifyWingmanCapabilityInputSchema = z
  .object({ prompt: z.string().trim().min(1).max(100), expectedToolName: z.string().trim().min(1) })
  .strict();
export function createVerificationTool(c: DevToolContext) {
  return tool({
    description: 'Verify a deployed Wingman capability after its PR is merged.',
    inputSchema: verifyWingmanCapabilityInputSchema,
    execute: async (input: VerifyWingmanCapabilityInput) => {
      const s = c.getState();
      assertCanVerify(s);
      const pr = await c.github.getPullRequest(s.pullRequest!.number);
      if (pr.merged_at === null) throw new Error('PULL_REQUEST_NOT_MERGED');
      c.setState({
        ...s,
        status: 'verifying',
        expectedToolName: input.expectedToolName,
        lastError: null,
      });
      try {
        const result = await c.verification.verifyDeployedWingman(input);
        c.setState({ ...c.getState(), status: 'awaiting_human', lastVerification: result });
        if (result.verified)
          await completeVerifiedTicket(
            {
              domain: c.domain,
              github: c.github,
              getState: c.getState,
              setState: c.setState,
              log: c.logger,
            },
            result,
          );
        return result;
      } catch (e) {
        c.setState({
          ...c.getState(),
          status: 'awaiting_human',
          lastError: {
            phase: 'verification',
            code: 'WINGMAN_VERIFICATION_FAILED',
            message: e instanceof Error ? e.message : 'Verification failed.',
            occurredAt: new Date().toISOString(),
          },
        });
        throw e;
      }
    },
  });
}
