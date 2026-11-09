import type { RpcResult, TicketDto } from '@agentic-delivery-loop/contracts';
import type { Env } from '../env';
import type { DevLogger } from '../observability/logger';
export class DomainRpcError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainRpcError';
  }
}
export function unwrapRpcResult<T>(r: RpcResult<T>): T {
  if (!r.ok) throw new DomainRpcError(r.error.code, r.error.message);
  return r.data;
}
export class DomainClient {
  constructor(
    private readonly service: Env['DOMAIN_API'],
    private readonly log: DevLogger,
  ) {}
  private async call<T>(name: string, fn: () => Promise<RpcResult<T>>) {
    const started = Date.now();
    this.log.info('domain_rpc_started', { operation: name });
    try {
      const v = unwrapRpcResult(await fn());
      this.log.info('domain_rpc_completed', { operation: name, durationMs: Date.now() - started });
      return v;
    } catch (e) {
      this.log.error('domain_rpc_failed', {
        operation: name,
        errorCode: e instanceof DomainRpcError ? e.code : 'UPSTREAM_ERROR',
      });
      throw e;
    }
  }
  startOldestAcceptedTicket() {
    return this.call<TicketDto | null>(
      'startOldestAcceptedTicket',
      () => this.service.startOldestAcceptedTicket() as Promise<RpcResult<TicketDto | null>>,
    );
  }
  saveTicketPullRequestUrl(input: { ticketId: string; pullRequestUrl: string }) {
    return this.call<TicketDto>(
      'saveTicketPullRequestUrl',
      () => this.service.saveTicketPullRequestUrl(input) as Promise<RpcResult<TicketDto>>,
    );
  }
  completeTicket(input: { ticketId: string }) {
    return this.call<TicketDto>(
      'completeTicket',
      () => this.service.completeTicket(input) as Promise<RpcResult<TicketDto>>,
    );
  }
}
