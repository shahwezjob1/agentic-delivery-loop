import type { TicketDto, PageResult, TicketStatus } from '../../contracts/domain';
import { getJson } from '../../api/http-client';
export interface TicketsPageQuery {
  page: number;
  status?: TicketStatus;
}
export function listTickets(q: TicketsPageQuery) {
  const p = new URLSearchParams({ page: String(q.page) });
  if (q.status) p.set('status', q.status);
  return getJson<PageResult<TicketDto>>(`/api/tickets?${p}`);
}
