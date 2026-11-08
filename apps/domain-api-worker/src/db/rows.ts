import type { RequestStatus, TicketStatus } from '@agentic-delivery-loop/contracts';
export interface FeatureRequestRow {
  id: string;
  name: string;
  description: string;
  status: RequestStatus;
  linked_ticket_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface TicketRow {
  id: string;
  name: string;
  description: string;
  status: TicketStatus;
  pull_request_url: string | null;
  created_at: string;
  updated_at: string;
}
export interface PoLogRow {
  id: string;
  message: string;
  created_at: string;
}
