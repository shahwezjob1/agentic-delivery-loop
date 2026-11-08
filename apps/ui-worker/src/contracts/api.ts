export interface ApiErrorResponse {
  error: { code: string; message: string };
}
export function isApiErrorResponse(v: unknown): v is ApiErrorResponse {
  return typeof v === 'object' && v !== null && 'error' in v;
}
