import type { DevAgentState } from '../../contracts/dev-agent-state';
import { VerificationResult } from './VerificationResult';
export function DevStatePanel({ state }: { state: DevAgentState }) {
  return (
    <aside>
      <h3>Agent state</h3>
      <dl>
        <dt>Status</dt>
        <dd>{state.status}</dd>
        {(state.branchName || state.branch) && (
          <>
            <dt>Branch</dt>
            <dd>{state.branchName || state.branch}</dd>
          </>
        )}
        {state.ticketId && (
          <>
            <dt>Ticket</dt>
            <dd>{state.ticketId}</dd>
          </>
        )}
        {state.activeTicket && (
          <>
            <dt>Active ticket</dt>
            <dd>
              <strong>{state.activeTicket.name}</strong> ({state.activeTicket.id})
              <p>{state.activeTicket.description}</p>
            </dd>
          </>
        )}
        {state.expectedToolName && (
          <>
            <dt>Expected tool</dt>
            <dd>{state.expectedToolName}</dd>
          </>
        )}
      </dl>
      {(state.pullRequestUrl || state.pullRequest?.url) && (
        <a
          href={state.pullRequestUrl || state.pullRequest?.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open pull request
        </a>
      )}
      {state.lastVerification && <VerificationResult result={state.lastVerification} />}{' '}
      {(state.error || state.lastError) && (
        <p role="alert">{state.error || state.lastError?.message}</p>
      )}
    </aside>
  );
}
