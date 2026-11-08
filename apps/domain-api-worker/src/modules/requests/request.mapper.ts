import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import type { FeatureRequestRow } from '../../db/rows';
export function toFeatureRequestDto(row: FeatureRequestRow): FeatureRequestDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    linkedTicketId: row.linked_ticket_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
