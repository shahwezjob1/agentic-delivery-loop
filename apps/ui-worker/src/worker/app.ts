import { Hono } from 'hono';
import type { Env } from './env';
import { registerDomainRoutes } from './domain.routes';
import { apiErrorResponse } from './error-response';
import { errorMetadata, logWorkerError } from './structured-log';
export type AppEnv = { Bindings: Env };
export const app = new Hono<AppEnv>();
registerDomainRoutes(app);
app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } }, 404));
app.onError((e, c) => {
  const m = errorMetadata(e);
  logWorkerError({
    event: 'api_unhandled_error',
    route: new URL(c.req.url).pathname,
    ...m,
    timestamp: new Date().toISOString(),
  });
  return apiErrorResponse(500, 'INTERNAL_ERROR', 'Unexpected error. Try again.');
});
