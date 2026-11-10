import { z } from 'zod';

export const TICKET_NAME_MAX = 50;
export const TICKET_DESCRIPTION_MAX = 1000;
export const REFINEMENT_NOTE_MAX = 200;
const DEFAULT_REFINEMENT_NOTE = 'No note provided.';

// Single source of truth: the Zod schemas below are also converted into the JSON Schema sent to
// Workers AI, so the model contract and the application check cannot drift apart.
const ticketName = z.string().min(1).max(TICKET_NAME_MAX);
const ticketDescription = z.string().min(1).max(TICKET_DESCRIPTION_MAX);
const refinementNote = z.string().min(1).max(REFINEMENT_NOTE_MAX);

export const createDecisionZodSchema = z
  .object({ action: z.enum(['create']), ticketName, ticketDescription, refinementNote })
  .strict();
export const linkDecisionZodSchema = z
  .object({ action: z.enum(['link']), ticketId: z.string().min(1) })
  .strict();
export const poDecisionZodSchema = z.discriminatedUnion('action', [
  createDecisionZodSchema,
  linkDecisionZodSchema,
]);
export type CreateDecision = z.infer<typeof createDecisionZodSchema>;
export type LinkDecision = z.infer<typeof linkDecisionZodSchema>;
export type PoDecision = z.infer<typeof poDecisionZodSchema>;

// Flat shape sent to the model when links are possible. Per-action required fields are enforced
// by the Zod schemas after generation, which keeps this schema simple for constrained decoding.
const poDecisionWireSchema = z.object({
  action: z.enum(['create', 'link', 'CREATE', 'LINK']),
  ticketName: ticketName.optional(),
  ticketDescription: ticketDescription.optional(),
  refinementNote: refinementNote.optional(),
  ticketId: z.string().min(1).optional(),
});

function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}
export const createDecisionJsonSchema = toJsonSchema(createDecisionZodSchema);
export const poDecisionJsonSchema = toJsonSchema(poDecisionWireSchema);

// Lenient pre-parse: tolerate harmless model quirks before strict validation.
// - action is matched case-insensitively and trimmed
// - fields that do not belong to the chosen action are dropped
// - strings are trimmed and over-long text is truncated instead of rejected
// - a missing refinement note gets a neutral default
// Anything else (missing required fields, wrong types, unknown action) is left for Zod to reject.
export function normalizeDecision(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  const text = (value: unknown, max: number): unknown =>
    typeof value === 'string' ? value.trim().slice(0, max) : value;
  const action = typeof r.action === 'string' ? r.action.trim().toLowerCase() : r.action;
  if (action === 'create')
    return {
      action,
      ticketName: text(r.ticketName, TICKET_NAME_MAX),
      ticketDescription: text(r.ticketDescription, TICKET_DESCRIPTION_MAX),
      refinementNote:
        text(r.refinementNote, REFINEMENT_NOTE_MAX) || DEFAULT_REFINEMENT_NOTE,
    };
  if (action === 'link')
    return { action, ticketId: typeof r.ticketId === 'string' ? r.ticketId.trim() : r.ticketId };
  return { ...r, action };
}
