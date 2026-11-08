import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import { PO_DECISION_MODEL, PO_MODEL_MAX_TOKENS } from './models';
import { buildPoDecisionMessages } from './po-prompt';
import { assertSelectedCandidate } from '../policies/candidate-policy';
import {
  createDecisionJsonSchema,
  createDecisionZodSchema,
  poDecisionJsonSchema,
  poDecisionZodSchema,
  type PoDecision,
} from '../policies/decision.schema';
import type { HydratedTicketCandidate } from '../workflow/workflow.types';
function decodeResponse(value: unknown): unknown {
  const response = (value as { response?: unknown }).response;
  if (typeof response === 'string') return JSON.parse(response);
  if (response !== undefined) return response;
  throw new Error('Workers AI returned no structured response');
}
export async function decideCreateOrLink(input: {
  ai: Ai;
  request: FeatureRequestDto;
  candidates: HydratedTicketCandidate[];
}): Promise<PoDecision> {
  const noCandidates = input.candidates.length === 0;
  const result = await input.ai.run(PO_DECISION_MODEL, {
    messages: buildPoDecisionMessages(input),
    stream: false,
    max_tokens: PO_MODEL_MAX_TOKENS,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: noCandidates ? createDecisionJsonSchema : poDecisionJsonSchema,
    },
  });
  const decoded = decodeResponse(result);
  const decision: PoDecision = noCandidates
    ? createDecisionZodSchema.parse(decoded)
    : poDecisionZodSchema.parse(decoded);
  if (decision.action === 'link')
    assertSelectedCandidate({ ticketId: decision.ticketId, candidates: input.candidates });
  return decision;
}
