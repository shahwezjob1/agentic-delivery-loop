import type { WingmanVerificationResult } from '@agentic-delivery-loop/contracts';
export type DevLifecycleStatus =
  | 'idle' // no active ticket
  | 'ticket_started' // ticket in progress, no branch yet
  | 'branch_ready' // branch exists, implementing
  | 'pr_open' // PR raised, awaiting human review/merge
  | 'pr_merged'; // merge confirmed, verification allowed
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
export function assertStatus(s: DevAgentState, ...allowed: DevLifecycleStatus[]) {
  if (!allowed.includes(s.status)) throw new Error('INVALID_LIFECYCLE_STATE');
}
export function assertCanVerify(s: DevAgentState) {
  if ((s.status !== 'pr_open' && s.status !== 'pr_merged') || !s.activeTicket || !s.pullRequest)
    throw new Error('INVALID_LIFECYCLE_STATE');
}
