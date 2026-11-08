import { ApiClientError } from './api-error';
export async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  let body: unknown;
  try {
    body = await r.json();
  } catch {
    throw new ApiClientError('The server returned an invalid response.', r.status);
  }
  if (!r.ok) {
    const e = body as { error?: { message?: unknown; code?: unknown } };
    throw new ApiClientError(
      typeof e.error?.message === 'string' ? e.error.message : 'Unable to load data. Try again.',
      r.status,
      typeof e.error?.code === 'string' ? e.error.code : undefined,
    );
  }
  return body as T;
}
