import { z } from 'zod';

export interface PageRequest {
  page: number;
  pageSize: number;
}
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
}
export const pageRequestSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export function normalizePage(
  input: PageRequest,
  defaults: { pageSize: number; maxPageSize: number },
): PageRequest {
  const page = Number.isFinite(input.page) ? Math.max(1, Math.trunc(input.page)) : 1;
  const requested = Number.isFinite(input.pageSize)
    ? Math.trunc(input.pageSize)
    : defaults.pageSize;
  return { page, pageSize: Math.min(defaults.maxPageSize, Math.max(1, requested)) };
}
