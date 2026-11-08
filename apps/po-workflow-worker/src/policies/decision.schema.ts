import { z } from 'zod';
const ticketName = z.string().trim().min(1).max(50);
const ticketDescription = z.string().trim().min(1).max(1000);
export const createDecisionZodSchema = z
  .object({ action: z.literal('create'), ticketName, ticketDescription })
  .strict();
export const linkDecisionZodSchema = z
  .object({ action: z.literal('link'), ticketId: z.string().trim().min(1) })
  .strict();
export const poDecisionZodSchema = z.discriminatedUnion('action', [
  createDecisionZodSchema,
  linkDecisionZodSchema,
]);
export type CreateDecision = z.infer<typeof createDecisionZodSchema>;
export type LinkDecision = z.infer<typeof linkDecisionZodSchema>;
export type PoDecision = z.infer<typeof poDecisionZodSchema>;
export const createDecisionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['create'] },
    ticketName: { type: 'string', minLength: 1, maxLength: 50 },
    ticketDescription: { type: 'string', minLength: 1, maxLength: 1000 },
  },
  required: ['action', 'ticketName', 'ticketDescription'],
} as const;
export const poDecisionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['create', 'link'] },
    ticketName: { type: 'string', minLength: 1, maxLength: 50 },
    ticketDescription: { type: 'string', minLength: 1, maxLength: 1000 },
    ticketId: { type: 'string', minLength: 1 },
  },
  required: ['action'],
  allOf: [
    {
      if: { properties: { action: { const: 'create' } } },
      then: { required: ['ticketName', 'ticketDescription'] },
    },
    { if: { properties: { action: { const: 'link' } } }, then: { required: ['ticketId'] } },
  ],
} as const;
