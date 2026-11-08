import { useState } from 'react';
import type { TicketStatus } from '../../contracts/domain';
import { usePaginatedResource } from '../../hooks/use-paginated-resource';
import { listTickets } from './tickets.api';
export function useTickets() {
  const [page, setPage] = useState(1),
    [status, setRaw] = useState<TicketStatus>();
  const data = usePaginatedResource(
    () => listTickets({ page, ...(status ? { status } : {}) }),
    [page, status],
  );
  return {
    page,
    status,
    setPage,
    setStatus(v: TicketStatus | undefined) {
      setRaw(v);
      setPage(1);
    },
    ...data,
  };
}
