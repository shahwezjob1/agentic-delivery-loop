import { z } from 'zod';
import { poLogPageSchema } from '../../pagination/pagination.schema';
export const appendPoLogInputSchema = z
  .object({ message: z.string().trim().min(1).max(3000) })
  .strict();
export const listPoLogsInputSchema = poLogPageSchema.strict();
