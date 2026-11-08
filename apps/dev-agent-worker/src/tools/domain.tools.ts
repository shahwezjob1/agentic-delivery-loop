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
    get_ticket: tool({
      description: 'Get a development ticket by UUID.',
      inputSchema: z.object({ ticketId: z.uuid() }).strict(),
      execute: async (x) => ({ ok: true, ticket: await c.domain.getTicket(x) }),
    }),
    start_oldest_accepted_ticket: tool({
      description: 'Start the oldest accepted ticket when no ticket is active.',
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
