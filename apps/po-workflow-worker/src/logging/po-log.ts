import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import type { PoEnv } from '../env';
import type { CommitResult } from '../workflow/workflow.types';
import { unwrapRpcResult } from '../domain/domain-rpc';
export function formatSuccessfulPoLog(input: {
  request: FeatureRequestDto;
  commit: CommitResult;
}): string {
  const actionLine =
    input.commit.action === 'create'
      ? `Created and linked to new ticket ID: ${input.commit.ticketId}`
      : `Linked to existing ticket ID: ${input.commit.ticketId}`;
  return [
    `Selected request ID: ${input.request.id}`,
    actionLine,
    `Request name: ${input.request.name}`,
    `Request details: ${input.request.description}`,
    `Ticket name: ${input.commit.ticketName}`,
    `Ticket details: ${input.commit.ticketDescription}`,
  ].join('\n');
}
export async function appendSuccessfulPoLog(input: {
  domainApi: PoEnv['DOMAIN_API'];
  request: FeatureRequestDto;
  commit: CommitResult;
}): Promise<void> {
  unwrapRpcResult(await input.domainApi.appendPoLog({ message: formatSuccessfulPoLog(input) }));
}
