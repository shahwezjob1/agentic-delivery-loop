import { z } from 'zod';

// One schema: used to validate the response and, converted, as the JSON Schema sent to the model.
// Not strict, so stray extra fields are ignored instead of failing the decision.
export const createDecisionZodSchema = z.object({
  action: z.literal('create'),
  ticketName: z.string().trim().min(1).max(50),
  ticketDescription: z.string().trim().min(1).max(1000),
  refinementNote: z.string().trim().min(1).max(200),
});
export const linkDecisionZodSchema = z.object({
  action: z.literal('link'),
  ticketId: z.string().trim().min(1),
});
export const poDecisionZodSchema = z.discriminatedUnion('action', [
  createDecisionZodSchema,
  linkDecisionZodSchema,
]);
export type CreateDecision = z.infer<typeof createDecisionZodSchema>;
export type LinkDecision = z.infer<typeof linkDecisionZodSchema>;
export type PoDecision = z.infer<typeof poDecisionZodSchema>;

const toJsonSchema = (schema: z.ZodType) => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { io: 'input' });
  return rest;
};
export const createDecisionJsonSchema = toJsonSchema(createDecisionZodSchema);
export const poDecisionJsonSchema = toJsonSchema(poDecisionZodSchema);
