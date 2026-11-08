import type { FeatureRequestDto, PageResult, RequestStatus } from '../../contracts/domain';
import { getJson } from '../../api/http-client';
export interface RequestsPageQuery {
  page: number;
  status?: RequestStatus;
}
export function listRequests(q: RequestsPageQuery) {
  const p = new URLSearchParams({ page: String(q.page) });
  if (q.status) p.set('status', q.status);
  return getJson<PageResult<FeatureRequestDto>>(`/api/requests?${p}`);
}
