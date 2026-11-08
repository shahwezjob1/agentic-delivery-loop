import { z } from 'zod';

export const requestStatusSchema = z.enum(['pending', 'accepted', 'in_progress', 'done']);
export type RequestStatus = z.infer<typeof requestStatusSchema>;
export const ticketStatusSchema = z.enum(['accepted', 'in_progress', 'done']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export interface FeatureRequestDto {
  id: string;
  name: string;
  description: string;
  status: RequestStatus;
  linkedTicketId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface TicketDto {
  id: string;
  name: string;
  description: string;
  status: TicketStatus;
  pullRequestUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PoLogDto {
  id: string;
  message: string;
  createdAt: string;
}
export interface CreateRequestInput {
  name: string;
  description: string;
}
export interface GetRequestInput {
  requestId: string;
}
export interface ListRequestsInput {
  page?: number;
  pageSize?: number;
  status?: RequestStatus;
}
export interface GetTicketInput {
  ticketId: string;
}
export interface ListTicketsInput {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
}
export interface CreateTicketAndLinkRequestInput {
  requestId: string;
  ticketName: string;
  ticketDescription: string;
}
export interface CreateTicketAndLinkRequestResult {
  ticket: TicketDto;
  request: FeatureRequestDto;
}
export interface LinkRequestToTicketInput {
  requestId: string;
  ticketId: string;
}
export interface LinkRequestToTicketResult {
  ticket: TicketDto;
  request: FeatureRequestDto;
}
export interface SaveTicketPullRequestUrlInput {
  ticketId: string;
  pullRequestUrl: string;
}
export interface CompleteTicketInput {
  ticketId: string;
}
export interface AppendPoLogInput {
  message: string;
}
export interface ListPoLogsInput {
  page?: number;
  pageSize?: number;
}
