import type { CandidateMatch, HydratedTicketCandidate } from '../workflow/workflow.types';
export const VECTOR_TOP_K = 3;
export const MINIMUM_CANDIDATE_SIMILARITY = 0.7;
export function filterCandidateMatches(matches: CandidateMatch[]): CandidateMatch[] {
  return matches.filter((match) => match.similarityScore >= MINIMUM_CANDIDATE_SIMILARITY);
}
// Matches the model's ticket ID case-insensitively and returns the real candidate ID.
export function resolveSelectedCandidate(input: {
  ticketId: string;
  candidates: HydratedTicketCandidate[];
}): string {
  const wanted = input.ticketId.trim().toLowerCase();
  const match = input.candidates.find((candidate) => candidate.ticketId.toLowerCase() === wanted);
  if (!match) throw new Error(`Model selected unavailable candidate ticket: ${input.ticketId}`);
  return match.ticketId;
}
