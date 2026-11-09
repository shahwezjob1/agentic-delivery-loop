import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import type { PoEnv } from '../env';
import type { CommitResult } from '../workflow/workflow.types';
import { unwrapRpcResult } from '../domain/domain-rpc';
export function formatSuccessfulPoLog(input: {
  request: FeatureRequestDto;
  commit: CommitResult;
}): string {
  const verb = input.commit.action === 'create' ? 'Created' : 'Linked';
  return [
    `Selected request ID: ${input.request.id} | Request name: ${input.request.name}`,
    `${verb} ticket ID: ${input.commit.ticketId} | Ticket name: ${input.commit.ticketName}`,
    `Refinement note: ${input.commit.refinementNote}`,
  ].join('\n');
}
export async function appendSuccessfulPoLog(input: {
  domainApi: PoEnv['DOMAIN_API'];
  request: FeatureRequestDto;
  commit: CommitResult;
}): Promise<void> {
  unwrapRpcResult(await input.domainApi.appendPoLog({ message: formatSuccessfulPoLog(input) }));
}
