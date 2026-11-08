import { z } from 'zod';
export function createPageSchema(options: { defaultPageSize: number; maximumPageSize: number }) {
  return z.object({
    page: z.number().finite().int().min(1).optional().default(1),
    pageSize: z
      .number()
      .finite()
      .int()
      .min(1)
      .optional()
      .default(options.defaultPageSize)
      .transform((v) => Math.min(v, options.maximumPageSize)),
  });
}
export const requestTicketPageSchema = createPageSchema({
  defaultPageSize: 5,
  maximumPageSize: 50,
});
export const poLogPageSchema = createPageSchema({ defaultPageSize: 20, maximumPageSize: 100 });
