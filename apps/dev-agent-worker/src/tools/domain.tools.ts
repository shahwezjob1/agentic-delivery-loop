import { tool } from 'ai';
import { z } from 'zod';
import { startOldestTicket } from '../agent/lifecycle.service';
import type { DevToolContext } from './tool-context';
export function createDomainTools(c: DevToolContext) {
  const deps = {
    domain: c.domain,
    github: c.github,
    getState: c.getState,
    setState: c.setState,
    log: c.logger,
  };
  return {
    start_oldest_accepted_ticket: tool({
      description: `
Claim the oldest accepted development ticket and mark it in progress.
Use this when the user asks to start, continue, or take the next ticket.
Call it with no arguments. Do not use it when a ticket is already active.
Returns the ticket id, name and description, or a message saying no accepted
ticket exists. After success the next step is create_branch.
`,
      inputSchema: z.object({}).strict(),
      execute: async () => {
        const ticket = await startOldestTicket(deps);
        return ticket
          ? { ok: true, ticket }
          : { ok: false, code: 'NO_ACCEPTED_TICKET', message: 'No accepted ticket is available.' };
      },
    }),
  };
}
