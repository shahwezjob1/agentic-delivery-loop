import type { Tool } from 'ai';
import { createAddTool } from './add.tool';
import { createFeatureRequestTool } from './create-feature-request.tool';
import { createCalcSquareRootTool } from './calc_square_root.tool';

export function createWingmanTools(env: Pick<Env, 'DOMAIN_API'>): Record<string, Tool> {
  return {
    add: createAddTool(),
    create_feature_request: createFeatureRequestTool(env.DOMAIN_API),
    calc_square_root: createCalcSquareRootTool(),
  };
}

export function getWingmanToolNames(tools: Record<string, Tool>): string[] {
  return Object.keys(tools);
}
