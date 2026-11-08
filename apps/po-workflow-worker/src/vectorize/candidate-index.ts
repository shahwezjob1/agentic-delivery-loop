import { assertEmbedding } from '../ai/embedding.service';
import { filterCandidateMatches, VECTOR_TOP_K } from '../policies/candidate-policy';
import { toCanonicalVector } from './canonical-vector';
import type { CandidateMatch } from '../workflow/workflow.types';
export async function queryCandidateMatches(input: {
  index: VectorizeIndex;
  embedding: number[];
}): Promise<CandidateMatch[]> {
  assertEmbedding(input.embedding);
  const result = await input.index.query(input.embedding, {
    topK: VECTOR_TOP_K,
    returnValues: false,
    returnMetadata: 'none',
  });
  return filterCandidateMatches(
    result.matches.map((match) => ({ ticketId: match.id, similarityScore: match.score })),
  );
}
export async function upsertCanonicalVector(input: {
  index: VectorizeIndex;
  ticketId: string;
  embedding: number[];
}): Promise<void> {
  await input.index.upsert([toCanonicalVector(input)]);
}
