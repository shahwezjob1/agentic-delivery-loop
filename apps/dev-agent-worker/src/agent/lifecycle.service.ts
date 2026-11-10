import type { WingmanVerificationResult } from '@agentic-delivery-loop/contracts';
import type { DomainClient } from '../domain/domain-client';
import type { GitHubClient } from '../github/github-client';
import type { DevLogger } from '../observability/logger';
import {
  assertCanStartTicket,
  assertHasActiveTicket,
  type ActiveTicketSummary,
  type DevAgentErrorState,
  type DevAgentState,
  type PullRequestSummary,
} from './dev-state';
export interface LifecycleDependencies {
  domain: DomainClient;
  github: GitHubClient;
  setState(n: DevAgentState): void;
  getState(): DevAgentState;
  log: DevLogger;
}
export async function startOldestTicket(
  d: LifecycleDependencies,
): Promise<ActiveTicketSummary | null> {
  assertCanStartTicket(d.getState());
  const t = await d.domain.startOldestAcceptedTicket();
  if (!t) return null;
  const a = { id: t.id, name: t.name, description: t.description, status: 'in_progress' as const };
  d.setState({ ...d.getState(), status: 'ticket_started', activeTicket: a, lastError: null });
  return a;
}
export function recordBranch(s: DevAgentState, branch: string): DevAgentState {
  return { ...s, status: 'branch_ready', branch, lastError: null };
}
export async function recordPullRequest(d: LifecycleDependencies, p: PullRequestSummary) {
  const s = d.getState();
  assertHasActiveTicket(s);
  await d.domain.saveTicketPullRequestUrl({ ticketId: s.activeTicket.id, pullRequestUrl: p.url });
  const n = {
    ...s,
    status: 'pr_open' as const,
    pullRequest: p,
    branch: p.branch,
    lastError: null,
  };
  d.setState(n);
  return n;
}
export async function completeVerifiedTicket(
  d: LifecycleDependencies,
  r: WingmanVerificationResult,
) {
  const s = d.getState();
  assertHasActiveTicket(s);
  await d.domain.completeTicket({ ticketId: s.activeTicket.id });
  const n = {
    ...s,
    status: 'idle' as const,
    activeTicket: null,
    branch: null,
    pullRequest: null,
    expectedToolName: null,
    lastVerification: r,
    lastError: null,
  };
  d.setState(n);
  return n;
}
export function retainAfterFailure(s: DevAgentState, e: DevAgentErrorState): DevAgentState {
  return { ...s, lastError: e };
}
// After a merge, new commits are not deployed or reviewed yet: back to branch_ready for a new PR.
export function markBranchChanged(s: DevAgentState): DevAgentState {
  return s.status === 'pr_merged' ? { ...s, status: 'branch_ready', lastError: null } : s;
}
export function markPullRequestMerged(s: DevAgentState): DevAgentState {
  return { ...s, status: 'pr_merged', lastError: null };
}
