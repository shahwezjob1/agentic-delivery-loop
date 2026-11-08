import { useState } from 'react';
import { usePaginatedResource } from '../../hooks/use-paginated-resource';
import { listPoLogs } from './po-logs.api';
export function usePoLogs() {
  const [page, setPage] = useState(1);
  return { page, setPage, ...usePaginatedResource(() => listPoLogs(page), [page]) };
}
