import { useState } from 'react';
import type { RequestStatus } from '../../contracts/domain';
import { usePaginatedResource } from '../../hooks/use-paginated-resource';
import { listRequests } from './requests.api';
export function useRequests() {
  const [page, setPage] = useState(1),
    [status, setRaw] = useState<RequestStatus>();
  const data = usePaginatedResource(
    () => listRequests({ page, ...(status ? { status } : {}) }),
    [page, status],
  );
  return {
    page,
    status,
    setPage,
    setStatus(v: RequestStatus | undefined) {
      setRaw(v);
      setPage(1);
    },
    ...data,
  };
}
