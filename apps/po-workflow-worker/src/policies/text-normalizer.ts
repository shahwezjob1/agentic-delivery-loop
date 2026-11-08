import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
export function toEmbeddingText(request: Pick<FeatureRequestDto, 'name' | 'description'>): string {
  return `${normalizeWhitespace(request.name)} ${normalizeWhitespace(request.description)}`;
}
