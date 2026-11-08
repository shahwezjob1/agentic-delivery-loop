import { routeAgentRequest } from 'agents';
export { WingmanAgent } from './agent/wingman-agent';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await routeAgentRequest(request, env);
    return response ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
