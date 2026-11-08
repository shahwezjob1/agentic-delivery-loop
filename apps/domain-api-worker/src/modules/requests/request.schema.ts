import { requestStatusSchema } from '@agentic-delivery-loop/contracts';
import { z } from 'zod';
import { requestTicketPageSchema } from '../../pagination/pagination.schema';
const uuid = z.string().uuid();
export const createRequestInputSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    description: z.string().trim().min(1).max(1000),
  })
  .strict();
export const getRequestInputSchema = z.object({ requestId: uuid }).strict();
export const listRequestsInputSchema = requestTicketPageSchema
  .extend({ status: requestStatusSchema.optional() })
  .strict();
