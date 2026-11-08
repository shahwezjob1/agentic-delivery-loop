import type { WorkflowStepConfig } from 'cloudflare:workers';
export const PENDING_REQUEST_PAGE_SIZE = 5;
export const ZERO_RETRY_STEP_CONFIG = {
  retries: { limit: 0, delay: '0 seconds', backoff: 'constant' },
} as const satisfies WorkflowStepConfig;
export function buildStepName(input: {
  position: number;
  step: number;
  operation: string;
  requestId: string;
}): string {
  return `R${input.position}-S${input.step}-${input.operation}-${input.requestId}`;
}
