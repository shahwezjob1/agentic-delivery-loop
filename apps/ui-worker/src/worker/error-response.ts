export interface ApiErrorResponse {
  error: { code: string; message: string };
}
export function apiErrorResponse(status: 500 | 502, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}
