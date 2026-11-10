import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import { PO_DECISION_MODEL, PO_MODEL_MAX_TOKENS } from './models';
import { buildPoDecisionMessages } from './po-prompt';
import { resolveSelectedCandidate } from '../policies/candidate-policy';
import { logSchedulerError } from '../logging/system-log';
import {
  createDecisionJsonSchema,
  createDecisionZodSchema,
  normalizeDecision,
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
async function decideWithModel(input: {
  ai: Ai;
  request: FeatureRequestDto;
  candidates: HydratedTicketCandidate[];
}): Promise<PoDecision> {
  const noCandidates = input.candidates.length === 0;
  const result = await input.ai.run(PO_DECISION_MODEL, {
    messages: buildPoDecisionMessages(input),
    stream: false,
    max_tokens: PO_MODEL_MAX_TOKENS,
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: noCandidates ? createDecisionJsonSchema : poDecisionJsonSchema,
    },
  });
  const decoded = normalizeDecision(decodeResponse(result));
  const parsed = noCandidates
    ? createDecisionZodSchema.safeParse(decoded)
    : poDecisionZodSchema.safeParse(decoded);
  if (!parsed.success) {
    console.error('po.decision.validation-failed', {
      requestId: input.request.id,
      noCandidates,
      candidateIds: input.candidates.map((candidate) => candidate.ticketId),
      decoded,
      zodIssues: parsed.error.issues,
    });
    throw parsed.error;
  }
  let decision: PoDecision = parsed.data;
  console.info('po.decision', {
    requestId: input.request.id,
    action: decision.action,
    candidateCount: input.candidates.length,
    ...(decision.action === 'create'
      ? { ticketName: decision.ticketName, refinementNote: decision.refinementNote }
      : { ticketId: decision.ticketId }),
  });
  if (decision.action === 'link') {
    decision = {
      action: 'link',
      ticketId: resolveSelectedCandidate({
        ticketId: decision.ticketId,
        candidates: input.candidates,
      }),
    };
  }
  return decision;
}

// Safety net: if the model call, parsing, or candidate check fails for any reason, create a new
// ticket that mirrors the request instead of failing the request. The root cause goes to Worker logs.
export async function decideCreateOrLink(input: {
  ai: Ai;
  request: FeatureRequestDto;
  candidates: HydratedTicketCandidate[];
}): Promise<PoDecision> {
  try {
    return await decideWithModel(input);
  } catch (error) {
    logSchedulerError('po.decision.fallback_create', error, {
      requestId: input.request.id,
      candidateIds: input.candidates.map((candidate) => candidate.ticketId),
    });
    return {
      action: 'create',
      ticketName: input.request.name,
      ticketDescription: input.request.description,
      refinementNote: 'Kept as requested.',
    };
  }
}
