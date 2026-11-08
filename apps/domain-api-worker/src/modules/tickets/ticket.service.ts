import type {
  CompleteTicketInput,
  CreateTicketAndLinkRequestInput,
  CreateTicketAndLinkRequestResult,
  GetTicketInput,
  LinkRequestToTicketInput,
  LinkRequestToTicketResult,
  ListTicketsInput,
  PageResult,
  SaveTicketPullRequestUrlInput,
  TicketDto,
} from '@agentic-delivery-loop/contracts';
import { conflictError, invalidTransitionError, notFoundError } from '../../errors/app-error';
import { calculateTotalPages } from '../../pagination/pagination';
import { nowIso } from '../../time/clock';
import { toFeatureRequestDto } from '../requests/request.mapper';
import { RequestRepository } from '../requests/request.repository';
import { toTicketDto } from './ticket.mapper';
import { TicketRepository } from './ticket.repository';
export class TicketService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly requests: RequestRepository,
  ) {}
  async getTicket(i: GetTicketInput) {
    const t = await this.tickets.findById(i.ticketId);
    if (!t) throw notFoundError('Ticket', i.ticketId);
    return toTicketDto(t);
  }
  async listTickets(
    i: ListTicketsInput & { page: number; pageSize: number },
  ): Promise<PageResult<TicketDto>> {
    const q: { page: number; pageSize: number; status?: typeof i.status } = {
      page: i.page,
      pageSize: i.pageSize,
    };
    if (i.status) q.status = i.status;
    const { rows, total } = await this.tickets.list(q);
    return {
      items: rows.map(toTicketDto),
      page: i.page,
      pageSize: i.pageSize,
      totalPages: calculateTotalPages(total, i.pageSize),
    };
  }
  async createTicketAndLinkRequest(
    i: CreateTicketAndLinkRequestInput,
  ): Promise<CreateTicketAndLinkRequestResult> {
    const r = await this.requests.findById(i.requestId);
    if (!r) throw notFoundError('Request', i.requestId);
    if (r.status !== 'pending' || r.linked_ticket_id !== null)
      throw conflictError('Request is not pending and unlinked');
    const x = await this.tickets.createTicketAndLinkRequestAtomic({
      ticketId: crypto.randomUUID(),
      requestId: i.requestId,
      ticketName: i.ticketName,
      ticketDescription: i.ticketDescription,
      timestamp: nowIso(),
    });
    return { ticket: toTicketDto(x.ticket), request: toFeatureRequestDto(x.request) };
  }
  async linkRequestToTicket(i: LinkRequestToTicketInput): Promise<LinkRequestToTicketResult> {
    const [r, t] = await Promise.all([
      this.requests.findById(i.requestId),
      this.tickets.findById(i.ticketId),
    ]);
    if (!r) throw notFoundError('Request', i.requestId);
    if (!t) throw notFoundError('Ticket', i.ticketId);
    if (r.status !== 'pending' || r.linked_ticket_id !== null)
      throw conflictError('Request is not pending and unlinked');
    const updated = await this.tickets.linkRequestToTicket({
      requestId: i.requestId,
      ticketId: i.ticketId,
      ticketStatus: t.status,
      timestamp: nowIso(),
    });
    return { ticket: toTicketDto(t), request: toFeatureRequestDto(updated) };
  }
  async startOldestAcceptedTicket(): Promise<TicketDto | null> {
    const t = await this.tickets.findOldestAccepted();
    if (!t) return null;
    return toTicketDto(
      await this.tickets.startTicketAndSynchronizeRequestsAtomic({
        ticketId: t.id,
        timestamp: nowIso(),
      }),
    );
  }
  async saveTicketPullRequestUrl(i: SaveTicketPullRequestUrlInput): Promise<TicketDto> {
    const t = await this.tickets.savePullRequestUrl({
      ticketId: i.ticketId,
      pullRequestUrl: i.pullRequestUrl,
      timestamp: nowIso(),
    });
    if (!t) throw notFoundError('Ticket', i.ticketId);
    return toTicketDto(t);
  }
  async completeTicket(i: CompleteTicketInput): Promise<TicketDto> {
    const t = await this.tickets.findById(i.ticketId);
    if (!t) throw notFoundError('Ticket', i.ticketId);
    if (t.status !== 'in_progress')
      throw invalidTransitionError('Ticket must be in progress before completion');
    return toTicketDto(
      await this.tickets.completeTicketAndSynchronizeRequestsAtomic({
        ticketId: i.ticketId,
        timestamp: nowIso(),
      }),
    );
  }
}
