import type { TicketStatus } from '@agentic-delivery-loop/contracts';
import type { FeatureRequestRow, TicketRow } from '../../db/rows';
import { requireSuccessfulBatch, requireSuccessfulWrite } from '../../db/write-result';
import { conflictError, internalError } from '../../errors/app-error';
import { calculateOffset } from '../../pagination/pagination';
export interface TicketListQuery {
  page: number;
  pageSize: number;
  status?: TicketStatus;
}
export class TicketRepository {
  constructor(private readonly db: D1Database) {}
  async findById(id: string): Promise<TicketRow | null> {
    return this.db.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first<TicketRow>();
  }
  async findOldestAccepted(): Promise<TicketRow | null> {
    return this.db
      .prepare(
        "SELECT * FROM tickets WHERE status = 'accepted' ORDER BY created_at ASC,id ASC LIMIT 1",
      )
      .first<TicketRow>();
  }
  async list(q: TicketListQuery): Promise<{ rows: TicketRow[]; total: number }> {
    const where = q.status ? ' WHERE status = ?' : '';
    const ds = this.db.prepare(
      `SELECT * FROM tickets${where} ORDER BY created_at ASC,id ASC LIMIT ? OFFSET ?`,
    );
    const cs = this.db.prepare(`SELECT COUNT(*) AS total FROM tickets${where}`);
    const d = q.status
      ? ds.bind(q.status, q.pageSize, calculateOffset(q.page, q.pageSize))
      : ds.bind(q.pageSize, calculateOffset(q.page, q.pageSize));
    const c = q.status ? cs.bind(q.status) : cs;
    const [dr, cr] = await this.db.batch([d, c]);
    if (!dr?.success || !cr?.success) throw internalError();
    return {
      rows: dr.results as TicketRow[],
      total: Number((cr.results[0] as { total: number | string } | undefined)?.total ?? 0),
    };
  }
  async createTicketAndLinkRequestAtomic(i: {
    ticketId: string;
    requestId: string;
    ticketName: string;
    ticketDescription: string;
    timestamp: string;
  }): Promise<{ ticket: TicketRow; request: FeatureRequestRow }> {
    const insert = this.db
      .prepare(
        `INSERT INTO tickets (id,name,description,status,pull_request_url,created_at,updated_at) SELECT ?,?,?,'accepted',NULL,?,? WHERE EXISTS (SELECT 1 FROM feature_requests WHERE id=? AND status='pending' AND linked_ticket_id IS NULL)`,
      )
      .bind(i.ticketId, i.ticketName, i.ticketDescription, i.timestamp, i.timestamp, i.requestId);
    const update = this.db
      .prepare(
        `UPDATE feature_requests SET status='accepted',linked_ticket_id=?,updated_at=? WHERE id=? AND status='pending' AND linked_ticket_id IS NULL`,
      )
      .bind(i.ticketId, i.timestamp, i.requestId);
    const r = await this.db.batch([insert, update]);
    requireSuccessfulBatch(r, [
      { operation: 'create linked ticket', expectedChanges: 1 },
      { operation: 'link request', expectedChanges: 1 },
    ]);
    const [ticket, request] = await Promise.all([
      this.findById(i.ticketId),
      this.db
        .prepare('SELECT * FROM feature_requests WHERE id=?')
        .bind(i.requestId)
        .first<FeatureRequestRow>(),
    ]);
    if (!ticket || !request) throw internalError();
    return { ticket, request };
  }
  async linkRequestToTicket(i: {
    requestId: string;
    ticketId: string;
    ticketStatus: TicketStatus;
    timestamp: string;
  }): Promise<FeatureRequestRow> {
    const r = await this.db
      .prepare(
        `UPDATE feature_requests SET status=?,linked_ticket_id=?,updated_at=? WHERE id=? AND status='pending' AND linked_ticket_id IS NULL`,
      )
      .bind(i.ticketStatus, i.ticketId, i.timestamp, i.requestId)
      .run();
    requireSuccessfulWrite(r, { operation: 'link request to ticket', expectedChanges: 1 });
    const row = await this.db
      .prepare('SELECT * FROM feature_requests WHERE id=?')
      .bind(i.requestId)
      .first<FeatureRequestRow>();
    if (!row) throw internalError();
    return row;
  }
  async startTicketAndSynchronizeRequestsAtomic(i: {
    ticketId: string;
    timestamp: string;
  }): Promise<TicketRow> {
    const ticket = this.db
      .prepare(
        `UPDATE tickets SET status='in_progress',updated_at=? WHERE id=? AND status='accepted'`,
      )
      .bind(i.timestamp, i.ticketId);
    const requests = this.db
      .prepare(
        `UPDATE feature_requests SET status='in_progress',updated_at=? WHERE linked_ticket_id=? AND status='accepted'`,
      )
      .bind(i.timestamp, i.ticketId);
    const r = await this.db.batch([ticket, requests]);
    if (!r[0]) throw internalError();
    requireSuccessfulWrite(r[0], { operation: 'start ticket', expectedChanges: 1 });
    if (!r[1]?.success) throw internalError();
    const row = await this.findById(i.ticketId);
    if (!row) throw internalError();
    return row;
  }
  async savePullRequestUrl(i: {
    ticketId: string;
    pullRequestUrl: string;
    timestamp: string;
  }): Promise<TicketRow | null> {
    const r = await this.db
      .prepare('UPDATE tickets SET pull_request_url=?,updated_at=? WHERE id=?')
      .bind(i.pullRequestUrl, i.timestamp, i.ticketId)
      .run();
    if (!r.success) throw internalError();
    if ((r.meta.changes ?? 0) === 0) return null;
    return this.findById(i.ticketId);
  }
  async completeTicketAndSynchronizeRequestsAtomic(i: {
    ticketId: string;
    timestamp: string;
  }): Promise<TicketRow> {
    const ticket = this.db
      .prepare(`UPDATE tickets SET status='done',updated_at=? WHERE id=? AND status='in_progress'`)
      .bind(i.timestamp, i.ticketId);
    const requests = this.db
      .prepare(
        `UPDATE feature_requests SET status='done',updated_at=? WHERE linked_ticket_id=? AND status='in_progress'`,
      )
      .bind(i.timestamp, i.ticketId);
    const r = await this.db.batch([ticket, requests]);
    if (!r[0]) throw internalError();
    requireSuccessfulWrite(r[0], { operation: 'complete ticket', expectedChanges: 1 });
    if (!r[1]?.success) throw internalError();
    const row = await this.findById(i.ticketId);
    if (!row) throw internalError();
    return row;
  }
}
