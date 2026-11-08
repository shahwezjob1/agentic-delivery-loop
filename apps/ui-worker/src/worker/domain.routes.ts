import type { Hono } from 'hono';
import type { AppEnv } from './app';
import { logWorkerError, errorMetadata } from './structured-log';
const page = (v: string | undefined) => (v === undefined ? 1 : Number(v));
function failure(
  route: string,
  operation: string,
  p: number,
  status: string | undefined,
  error: unknown,
  rpcErrorCode?: string,
) {
  const m = errorMetadata(error);
  logWorkerError({
    event: 'domain_rpc_failed',
    route,
    operation,
    page: p,
    ...(status ? { status } : {}),
    ...(rpcErrorCode ? { rpcErrorCode } : {}),
    ...m,
    timestamp: new Date().toISOString(),
  });
  return Response.json(
    {
      error: {
        code: 'UPSTREAM_ERROR',
        message: `Unable to load ${route.split('/').pop()}. Try again.`,
      },
    },
    { status: 502 },
  );
}
export function registerDomainRoutes(app: Hono<AppEnv>): void {
  app.get('/api/requests', async (c) => {
    const p = page(c.req.query('page')),
      status = c.req.query('status');
    try {
      const r = await c.env.DOMAIN_API.listRequests({
        page: p,
        pageSize: 5,
        ...(status ? { status } : {}),
      });
      return r.ok
        ? c.json(r.data)
        : failure('/api/requests', 'listRequests', p, status, r.error, r.error.code);
    } catch (e) {
      return failure('/api/requests', 'listRequests', p, status, e);
    }
  });
  app.get('/api/tickets', async (c) => {
    const p = page(c.req.query('page')),
      status = c.req.query('status');
    try {
      const r = await c.env.DOMAIN_API.listTickets({
        page: p,
        pageSize: 5,
        ...(status ? { status } : {}),
      });
      return r.ok
        ? c.json(r.data)
        : failure('/api/tickets', 'listTickets', p, status, r.error, r.error.code);
    } catch (e) {
      return failure('/api/tickets', 'listTickets', p, status, e);
    }
  });
  app.get('/api/po-logs', async (c) => {
    const p = page(c.req.query('page'));
    try {
      const r = await c.env.DOMAIN_API.listPoLogs({ page: p, pageSize: 20 });
      return r.ok
        ? c.json(r.data)
        : failure('/api/po-logs', 'listPoLogs', p, undefined, r.error, r.error.code);
    } catch (e) {
      return failure('/api/po-logs', 'listPoLogs', p, undefined, e);
    }
  });
}
