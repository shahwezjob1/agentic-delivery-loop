import type { PoLogRow } from '../../db/rows';
import { requireSuccessfulWrite } from '../../db/write-result';
import { internalError } from '../../errors/app-error';
import { calculateOffset } from '../../pagination/pagination';
export class PoLogRepository {
  constructor(private readonly db: D1Database) {}
  async insert(i: { id: string; message: string; createdAt: string }): Promise<PoLogRow> {
    const r = await this.db
      .prepare('INSERT INTO po_logs (id,message,created_at) VALUES (?,?,?)')
      .bind(i.id, i.message, i.createdAt)
      .run();
    requireSuccessfulWrite(r, { operation: 'append PO log', expectedChanges: 1 });
    const row = await this.db
      .prepare('SELECT * FROM po_logs WHERE id=?')
      .bind(i.id)
      .first<PoLogRow>();
    if (!row) throw internalError();
    return row;
  }
  async list(i: { page: number; pageSize: number }): Promise<{ rows: PoLogRow[]; total: number }> {
    const [d, c] = await this.db.batch([
      this.db
        .prepare('SELECT * FROM po_logs ORDER BY created_at ASC,id ASC LIMIT ? OFFSET ?')
        .bind(i.pageSize, calculateOffset(i.page, i.pageSize)),
      this.db.prepare('SELECT COUNT(*) AS total FROM po_logs'),
    ]);
    if (!d?.success || !c?.success) throw internalError();
    return {
      rows: d.results as PoLogRow[],
      total: Number((c.results[0] as { total: number | string } | undefined)?.total ?? 0),
    };
  }
}
