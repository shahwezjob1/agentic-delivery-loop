import { ticketStatusSchema } from '@agentic-delivery-loop/contracts';
import { z } from 'zod';
import { requestTicketPageSchema } from '../../pagination/pagination.schema';
const uuid = z.string().uuid();
export const getTicketInputSchema = z.object({ ticketId: uuid }).strict();
export const listTicketsInputSchema = requestTicketPageSchema
  .extend({ status: ticketStatusSchema.optional() })
  .strict();
export const createTicketAndLinkRequestInputSchema = z
  .object({
    requestId: uuid,
    ticketName: z.string().trim().min(1).max(50),
    ticketDescription: z.string().trim().min(1).max(1000),
  })
  .strict();
export const linkRequestToTicketInputSchema = z
  .object({ requestId: uuid, ticketId: uuid })
  .strict();
export const saveTicketPullRequestUrlInputSchema = z
  .object({ ticketId: uuid, pullRequestUrl: z.string().trim().min(1).max(200) })
  .strict();
export const completeTicketInputSchema = z.object({ ticketId: uuid }).strict();
