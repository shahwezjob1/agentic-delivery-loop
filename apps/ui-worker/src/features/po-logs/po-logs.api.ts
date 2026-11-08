import type { PoLogDto, PageResult } from '../../contracts/domain';
import { getJson } from '../../api/http-client';
export const listPoLogs = (page: number) =>
  getJson<PageResult<PoLogDto>>(`/api/po-logs?page=${page}`);
