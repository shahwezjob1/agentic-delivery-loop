import type { RequestStatus } from '@agentic-delivery-loop/contracts';
import type { FeatureRequestRow } from '../../db/rows';
import { calculateOffset } from '../../pagination/pagination';
import { internalError } from '../../errors/app-error';
import { requireSuccessfulWrite } from '../../db/write-result';
export interface RequestListQuery {
  page: number;
  pageSize: number;
  status?: RequestStatus;
}
export class RequestRepository {
  constructor(private readonly db: D1Database) {}
  async insert(input: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
  }): Promise<FeatureRequestRow> {
    const r = await this.db
      .prepare(
        `INSERT INTO feature_requests (id,name,description,status,linked_ticket_id,created_at,updated_at) VALUES (?,?,?,'pending',NULL,?,?)`,
      )
      .bind(input.id, input.name, input.description, input.createdAt, input.createdAt)
      .run();
    requireSuccessfulWrite(r, { operation: 'create request', expectedChanges: 1 });
    return (
      (await this.findById(input.id)) ??
      (() => {
        throw internalError();
      })()
    );
  }
  async findById(id: string): Promise<FeatureRequestRow | null> {
    return this.db
      .prepare('SELECT * FROM feature_requests WHERE id = ?')
      .bind(id)
      .first<FeatureRequestRow>();
  }
  async list(q: RequestListQuery): Promise<{ rows: FeatureRequestRow[]; total: number }> {
    const where = q.status ? ' WHERE status = ?' : '';
    const data = this.db.prepare(
      `SELECT * FROM feature_requests${where} ORDER BY created_at ASC,id ASC LIMIT ? OFFSET ?`,
    );
    const count = this.db.prepare(`SELECT COUNT(*) AS total FROM feature_requests${where}`);
    const db = q.status
      ? data.bind(q.status, q.pageSize, calculateOffset(q.page, q.pageSize))
      : data.bind(q.pageSize, calculateOffset(q.page, q.pageSize));
    const cb = q.status ? count.bind(q.status) : count;
    const [dr, cr] = await this.db.batch([db, cb]);
    if (!dr?.success || !cr?.success) throw internalError();
    return {
      rows: dr.results as FeatureRequestRow[],
      total: Number((cr.results[0] as { total: number | string } | undefined)?.total ?? 0),
    };
  }
}
