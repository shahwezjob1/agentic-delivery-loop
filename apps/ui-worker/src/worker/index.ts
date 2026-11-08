import { app } from './app';
import type { Env } from './env';
import { isDevAgentPath, isWingmanAgentPath, proxyAgentRequest } from './agent-proxy';
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const p = new URL(request.url).pathname;
    if (p.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (isWingmanAgentPath(p)) return proxyAgentRequest(request, env.WINGMAN_AGENT);
    if (isDevAgentPath(p)) return proxyAgentRequest(request, env.DEV_AGENT);
    if (p.startsWith('/agents/')) return new Response('Agent route not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
