export interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
}
export function toErrorResult(error: unknown): NormalizedError {
  return {
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Unexpected error',
  };
}
