import type {
  CreateTicketAndLinkRequestResult,
  LinkRequestToTicketResult,
  PageResult,
  RpcResult,
  TicketDto,
} from '@agentic-delivery-loop/contracts';
import { toRpcResult } from '../../rpc/rpc-error';
import {
  completeTicketInputSchema,
  createTicketAndLinkRequestInputSchema,
  getTicketInputSchema,
  linkRequestToTicketInputSchema,
  listTicketsInputSchema,
  saveTicketPullRequestUrlInputSchema,
} from './ticket.schema';
import { TicketService } from './ticket.service';
export class TicketRpc {
  constructor(private readonly service: TicketService) {}
  getTicket(i: unknown): Promise<RpcResult<TicketDto>> {
    return toRpcResult(() => this.service.getTicket(getTicketInputSchema.parse(i)));
  }
  listTickets(i: unknown): Promise<RpcResult<PageResult<TicketDto>>> {
    return toRpcResult(() => this.service.listTickets(listTicketsInputSchema.parse(i)));
  }
  createTicketAndLinkRequest(i: unknown): Promise<RpcResult<CreateTicketAndLinkRequestResult>> {
    return toRpcResult(() =>
      this.service.createTicketAndLinkRequest(createTicketAndLinkRequestInputSchema.parse(i)),
    );
  }
  linkRequestToTicket(i: unknown): Promise<RpcResult<LinkRequestToTicketResult>> {
    return toRpcResult(() =>
      this.service.linkRequestToTicket(linkRequestToTicketInputSchema.parse(i)),
    );
  }
  startOldestAcceptedTicket(): Promise<RpcResult<TicketDto | null>> {
    return toRpcResult(() => this.service.startOldestAcceptedTicket());
  }
  saveTicketPullRequestUrl(i: unknown): Promise<RpcResult<TicketDto>> {
    return toRpcResult(() =>
      this.service.saveTicketPullRequestUrl(saveTicketPullRequestUrlInputSchema.parse(i)),
    );
  }
  completeTicket(i: unknown): Promise<RpcResult<TicketDto>> {
    return toRpcResult(() => this.service.completeTicket(completeTicketInputSchema.parse(i)));
  }
}
