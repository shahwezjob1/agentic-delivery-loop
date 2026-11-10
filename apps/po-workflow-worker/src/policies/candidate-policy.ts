import type { CandidateMatch, HydratedTicketCandidate } from '../workflow/workflow.types';
export const VECTOR_TOP_K = 3;
export const MINIMUM_CANDIDATE_SIMILARITY = 0.7;
export function filterCandidateMatches(matches: CandidateMatch[]): CandidateMatch[] {
  return matches.filter((match) => match.similarityScore >= MINIMUM_CANDIDATE_SIMILARITY);
}
export function assertSelectedCandidate(input: {
  ticketId: string;
  candidates: HydratedTicketCandidate[];
}): void {
  if (!input.candidates.some((candidate) => candidate.ticketId === input.ticketId))
    throw new Error(`Model selected unavailable candidate ticket: ${input.ticketId}`);
}
