import type { WingmanVerificationResult } from '@agentic-delivery-loop/contracts';
export type DevLifecycleStatus = 'idle' | 'implementing' | 'awaiting_human' | 'verifying';
export interface ActiveTicketSummary {
  id: string;
  name: string;
  description: string;
  status: 'in_progress';
}
export interface PullRequestSummary {
  number: number;
  url: string;
  branch: string;
  baseBranch: string;
}
export interface DevAgentErrorState {
  phase: 'implementation' | 'pull_request' | 'verification';
  code: string;
  message: string;
  occurredAt: string;
}
export interface DevAgentState {
  status: DevLifecycleStatus;
  activeTicket: ActiveTicketSummary | null;
  branch: string | null;
  pullRequest: PullRequestSummary | null;
  expectedToolName: string | null;
  lastVerification: WingmanVerificationResult | null;
  lastError: DevAgentErrorState | null;
}
export const INITIAL_DEV_AGENT_STATE: DevAgentState = {
  status: 'idle',
  activeTicket: null,
  branch: null,
  pullRequest: null,
  expectedToolName: null,
  lastVerification: null,
  lastError: null,
};
export function assertCanStartTicket(s: DevAgentState) {
  if (s.status !== 'idle') throw new Error('ACTIVE_TICKET_EXISTS');
}
export function assertHasActiveTicket(
  s: DevAgentState,
): asserts s is DevAgentState & { activeTicket: ActiveTicketSummary } {
  if (!s.activeTicket) throw new Error('INVALID_LIFECYCLE_STATE');
}
export function assertCanVerify(s: DevAgentState) {
  if (s.status !== 'awaiting_human' || !s.activeTicket || !s.pullRequest)
    throw new Error('INVALID_LIFECYCLE_STATE');
}
