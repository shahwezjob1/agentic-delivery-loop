import type { ToolSet } from 'ai';
import { createDomainTools } from './domain.tools';
import { createGitHubTools } from './github.tools';
import { createVerificationTool } from './verification.tool';
import type { DevToolContext } from './tool-context';
export function createDevTools(c: DevToolContext): ToolSet {
  const groups = [
    createDomainTools(c),
    createGitHubTools(c),
    { verify_wingman_capability: createVerificationTool(c) },
  ];
  const out: ToolSet = {};
  for (const g of groups)
    for (const [k, v] of Object.entries(g)) {
      if (k in out) throw new Error(`Duplicate tool: ${k}`);
      out[k] = v;
    }
  return out;
}
