import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './models';
import type { EmbeddedRequest } from '../workflow/workflow.types';
export function assertEmbedding(value: unknown): asserts value is number[] {
  if (
    !Array.isArray(value) ||
    value.length !== EMBEDDING_DIMENSIONS ||
    !value.every((item) => typeof item === 'number' && Number.isFinite(item))
  )
    throw new Error(`Embedding must contain exactly ${EMBEDDING_DIMENSIONS} finite numbers`);
}
export async function embedRequestText(input: {
  ai: Ai;
  requestId: string;
  text: string;
}): Promise<EmbeddedRequest> {
  const response = await input.ai.run(EMBEDDING_MODEL, { text: [input.text], pooling: 'cls' });
  const data = (response as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length !== 1)
    throw new Error('Workers AI returned an invalid embedding response');
  const embedding = data[0];
  assertEmbedding(embedding);
  return { requestId: input.requestId, embeddingText: input.text, embedding };
}
