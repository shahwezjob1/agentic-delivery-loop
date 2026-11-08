import type { PoLogDto } from '@agentic-delivery-loop/contracts';
import type { PoLogRow } from '../../db/rows';
export function toPoLogDto(r: PoLogRow): PoLogDto {
  return { id: r.id, message: r.message, createdAt: r.created_at };
}
