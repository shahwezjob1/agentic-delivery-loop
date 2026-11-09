import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import type { PoEnv } from '../env';
import type { PoDecision } from '../policies/decision.schema';
import type {
  CandidateMatch,
  CommitResult,
  HydratedTicketCandidate,
} from '../workflow/workflow.types';
import { PENDING_REQUEST_PAGE_SIZE } from '../workflow/workflow-options';
import { unwrapRpcResult } from './domain-rpc';
export async function loadPendingRequests(input: {
  domainApi: PoEnv['DOMAIN_API'];
}): Promise<FeatureRequestDto[]> {
  return unwrapRpcResult(
    await input.domainApi.listRequests({
      page: 1,
      pageSize: PENDING_REQUEST_PAGE_SIZE,
      status: 'pending',
    }),
  ).items;
}
export async function loadCandidateTickets(input: {
  domainApi: PoEnv['DOMAIN_API'];
  matches: CandidateMatch[];
}): Promise<HydratedTicketCandidate[]> {
  const candidates: HydratedTicketCandidate[] = [];
  for (const match of input.matches) {
    const ticket = unwrapRpcResult(await input.domainApi.getTicket({ ticketId: match.ticketId }));
    candidates.push({
      ticketId: ticket.id,
      ticketName: ticket.name,
      ticketDescription: ticket.description,
      status: ticket.status,
      similarityScore: match.similarityScore,
    });
  }
  return candidates;
}
export async function commitPoDecision(input: {
  domainApi: PoEnv['DOMAIN_API'];
  request: FeatureRequestDto;
  decision: PoDecision;
  candidates: HydratedTicketCandidate[];
}): Promise<CommitResult> {
  if (input.decision.action === 'create') {
    const result = unwrapRpcResult(
      await input.domainApi.createTicketAndLinkRequest({
        requestId: input.request.id,
        ticketName: input.decision.ticketName,
        ticketDescription: input.decision.ticketDescription,
      }),
    );
    return {
      action: 'create',
      requestId: input.request.id,
      ticketId: result.ticket.id,
      ticketName: result.ticket.name,
      ticketDescription: result.ticket.description,
      refinementNote: input.decision.refinementNote,
    };
  }
  const result = unwrapRpcResult(
    await input.domainApi.linkRequestToTicket({
      requestId: input.request.id,
      ticketId: input.decision.ticketId,
    }),
  );
  return {
    action: 'link',
    requestId: input.request.id,
    ticketId: result.ticket.id,
    ticketName: result.ticket.name,
    ticketDescription: result.ticket.description,
    refinementNote: 'Linked to existing ticket.',
  };
}
