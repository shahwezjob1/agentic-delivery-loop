import type { TicketDto } from '@agentic-delivery-loop/contracts';
import type { TicketRow } from '../../db/rows';
export function toTicketDto(row: TicketRow): TicketDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    pullRequestUrl: row.pull_request_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
