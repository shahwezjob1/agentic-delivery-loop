import type { TicketStatus } from '@agentic-delivery-loop/contracts';
export interface PoWorkflowParams {
  trigger: 'cron';
}
export interface PoRunSummary {
  selected: number;
  created: number;
  linked: number;
  failed: number;
}
export interface EmbeddedRequest {
  requestId: string;
  embeddingText: string;
  embedding: number[];
}
export interface CandidateMatch {
  ticketId: string;
  similarityScore: number;
}
export interface HydratedTicketCandidate {
  ticketId: string;
  ticketName: string;
  ticketDescription: string;
  status: TicketStatus;
  similarityScore: number;
}
export interface CommitResult {
  action: 'create' | 'link';
  requestId: string;
  ticketId: string;
  ticketName: string;
  ticketDescription: string;
  refinementNote: string;
}
export type RequestProcessResult =
  | { outcome: 'created'; requestId: string; ticketId: string }
  | { outcome: 'linked'; requestId: string; ticketId: string }
  | { outcome: 'failed'; requestId: string };
