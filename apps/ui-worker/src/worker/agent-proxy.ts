export const isWingmanAgentPath = (p: string) => p.startsWith('/agents/wingman-agent/');
export const isDevAgentPath = (p: string) => p.startsWith('/agents/dev-agent/');
export function proxyAgentRequest(request: Request, binding: Fetcher): Promise<Response> {
  return binding.fetch(request);
}
