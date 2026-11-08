import { assertEmbedding } from '../ai/embedding.service';
export function toCanonicalVector(input: {
  ticketId: string;
  embedding: number[];
}): VectorizeVector {
  assertEmbedding(input.embedding);
  return { id: input.ticketId, values: input.embedding };
}
