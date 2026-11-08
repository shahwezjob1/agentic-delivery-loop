import type { WingmanVerificationResult } from '@agentic-delivery-loop/contracts';
export type { WingmanVerificationResult } from '@agentic-delivery-loop/contracts';
export interface DevAgentState {
  status: string;
  ticketId?: string;
  branchName?: string;
  pullRequestUrl?: string;
  error?: string;
  activeTicket?: { id: string; name: string; description: string; status: string } | null;
  branch?: string | null;
  pullRequest?: { number: number; url: string; branch: string; baseBranch: string } | null;
  expectedToolName?: string | null;
  lastVerification?: WingmanVerificationResult | null;
  lastError?: { phase: string; code: string; message: string; occurredAt: string } | null;
}
export const INITIAL_DEV_AGENT_STATE: DevAgentState = { status: 'idle' };
export function normalizeDevAgentState(v: unknown): DevAgentState {
  return typeof v === 'object' &&
    v !== null &&
    'status' in v &&
    typeof (v as { status?: unknown }).status === 'string'
    ? (v as DevAgentState)
    : INITIAL_DEV_AGENT_STATE;
}
