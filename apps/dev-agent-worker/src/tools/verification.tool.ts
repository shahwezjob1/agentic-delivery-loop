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
Check that the newly merged and deployed Wingman tool really works. Call it only after the
pull request is confirmed merged and the user says Wingman is deployed.
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
