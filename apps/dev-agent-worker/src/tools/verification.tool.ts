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
    description: `
Check that the deployed Wingman really has the new tool and uses it. Call it only after the
user says Wingman is deployed with the changes. While the pull request is still open a pass
is only recorded and the ticket stays open: after the merge, verify again to complete the
ticket. Do not call it while new changes are waiting for a pull request.
"prompt" is one short natural sentence (at most 100 characters) a user would say to make
Wingman use the new tool. "expectedToolName" is the exact registered tool name.
Success means Wingman actually called that tool. It does not judge the answer text.
`,
    inputSchema: verifyWingmanCapabilityInputSchema,
    execute: async (input: VerifyWingmanCapabilityInput) => {
      const s = c.getState();
      assertCanVerify(s);
      c.setState({ ...s, expectedToolName: input.expectedToolName, lastError: null });
      try {
        const result = await c.verification.verifyDeployedWingman(input);
        c.setState({ ...c.getState(), lastVerification: result });
        // The ticket is completed only after the PR is merged. A pass while the PR is open
        // is recorded, and verification must be repeated after the merge.
        const complete = result.verified && s.status === 'pr_merged';
        if (complete)
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
        return {
          ...result,
          ticketCompleted: complete,
          ...(result.verified && !complete
            ? { note: 'Verified, but the pull request is not merged yet. Ask the user to merge it, then verify again to complete the ticket.' }
            : {}),
        };
      } catch (e) {
        c.setState({
          ...c.getState(),
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
