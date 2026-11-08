import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import type { HydratedTicketCandidate } from '../workflow/workflow.types';
export type PoDecisionMessage = { role: 'system' | 'user'; content: string };
export function buildPoDecisionMessages(input: {
  request: FeatureRequestDto;
  candidates: HydratedTicketCandidate[];
}): PoDecisionMessage[] {
  const candidateText =
    input.candidates.length === 0
      ? 'No candidate tickets are available. You must create a ticket.'
      : JSON.stringify(input.candidates);
  return [
    {
      role: 'system',
      content:
        'Act as a product owner. Return only the schema-constrained result and no reasoning. Link only to a supplied candidate ID. Similarity is advisory, not decisive. Prefer create when no candidate is semantically appropriate. Ticket names must be at most 50 characters and descriptions at most 1000 characters.',
    },
    {
      role: 'user',
      content: `Feature request name: ${input.request.name}\nFeature request description: ${input.request.description}\nCandidates: ${candidateText}\nChoose whether to create a clear implementation ticket or link to a semantically appropriate supplied ticket. Do not invent unrelated scope.`,
    },
  ];
}
