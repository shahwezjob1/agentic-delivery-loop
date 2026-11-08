import { WorkerEntrypoint } from 'cloudflare:workers';
import type {
  CreateTicketAndLinkRequestResult,
  FeatureRequestDto,
  LinkRequestToTicketResult,
  PageResult,
  PoLogDto,
  RpcResult,
  TicketDto,
} from '@agentic-delivery-loop/contracts';
import { getDb } from '../db/d1';
import type { Env } from '../env';
import { PoLogRepository } from '../modules/po-logs/po-log.repository';
import { PoLogRpc } from '../modules/po-logs/po-log.rpc';
import { PoLogService } from '../modules/po-logs/po-log.service';
import { RequestRepository } from '../modules/requests/request.repository';
import { RequestRpc } from '../modules/requests/request.rpc';
import { RequestService } from '../modules/requests/request.service';
import { TicketRepository } from '../modules/tickets/ticket.repository';
import { TicketRpc } from '../modules/tickets/ticket.rpc';
import { TicketService } from '../modules/tickets/ticket.service';
export class DomainApi extends WorkerEntrypoint<Env> {
  private readonly requestRpc: RequestRpc;
  private readonly ticketRpc: TicketRpc;
  private readonly poLogRpc: PoLogRpc;
  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env);
    const db = getDb(env);
    const requests = new RequestRepository(db);
    this.requestRpc = new RequestRpc(new RequestService(requests));
    this.ticketRpc = new TicketRpc(new TicketService(new TicketRepository(db), requests));
    this.poLogRpc = new PoLogRpc(new PoLogService(new PoLogRepository(db)));
  }
  createRequest(i: unknown): Promise<RpcResult<FeatureRequestDto>> {
    return this.requestRpc.createRequest(i);
  }
  getRequest(i: unknown): Promise<RpcResult<FeatureRequestDto>> {
    return this.requestRpc.getRequest(i);
  }
  listRequests(i: unknown): Promise<RpcResult<PageResult<FeatureRequestDto>>> {
    return this.requestRpc.listRequests(i);
  }
  getTicket(i: unknown): Promise<RpcResult<TicketDto>> {
    return this.ticketRpc.getTicket(i);
  }
  listTickets(i: unknown): Promise<RpcResult<PageResult<TicketDto>>> {
    return this.ticketRpc.listTickets(i);
  }
  createTicketAndLinkRequest(i: unknown): Promise<RpcResult<CreateTicketAndLinkRequestResult>> {
    return this.ticketRpc.createTicketAndLinkRequest(i);
  }
  linkRequestToTicket(i: unknown): Promise<RpcResult<LinkRequestToTicketResult>> {
    return this.ticketRpc.linkRequestToTicket(i);
  }
  startOldestAcceptedTicket(): Promise<RpcResult<TicketDto | null>> {
    return this.ticketRpc.startOldestAcceptedTicket();
  }
  saveTicketPullRequestUrl(i: unknown): Promise<RpcResult<TicketDto>> {
    return this.ticketRpc.saveTicketPullRequestUrl(i);
  }
  completeTicket(i: unknown): Promise<RpcResult<TicketDto>> {
    return this.ticketRpc.completeTicket(i);
  }
  appendPoLog(i: unknown): Promise<RpcResult<PoLogDto>> {
    return this.poLogRpc.appendPoLog(i);
  }
  listPoLogs(i: unknown): Promise<RpcResult<PageResult<PoLogDto>>> {
    return this.poLogRpc.listPoLogs(i);
  }
  async fetch(): Promise<Response> {
    return new Response('Domain API is available through Cloudflare service bindings.', {
      status: 404,
    });
  }
}
