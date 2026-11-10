import type { Tool } from 'ai';
import { createAddTool } from './add.tool';
import { createFeatureRequestTool } from './create-feature-request.tool';
import { createMultTool } from './mult.tool';
import { createFactorialTool } from './factorial.tool';

export function createWingmanTools(env: Pick<Env, 'DOMAIN_API'>): Record<string, Tool> {
  return {
    add: createAddTool(),
    create_feature_request: createFeatureRequestTool(env.DOMAIN_API),
    mult: createMultTool(),
    factorial: createFactorialTool(),
  };
}

export function getWingmanToolNames(tools: Record<string, Tool>): string[] {
  return Object.keys(tools);
}
