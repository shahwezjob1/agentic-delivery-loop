import type {
  AppendPoLogInput,
  ListPoLogsInput,
  PageResult,
  PoLogDto,
} from '@agentic-delivery-loop/contracts';
import { calculateTotalPages } from '../../pagination/pagination';
import { nowIso } from '../../time/clock';
import { toPoLogDto } from './po-log.mapper';
import { PoLogRepository } from './po-log.repository';
export class PoLogService {
  constructor(private readonly logs: PoLogRepository) {}
  async appendPoLog(i: AppendPoLogInput) {
    return toPoLogDto(
      await this.logs.insert({ id: crypto.randomUUID(), message: i.message, createdAt: nowIso() }),
    );
  }
  async listPoLogs(
    i: ListPoLogsInput & { page: number; pageSize: number },
  ): Promise<PageResult<PoLogDto>> {
    const { rows, total } = await this.logs.list(i);
    return {
      items: rows.map(toPoLogDto),
      page: i.page,
      pageSize: i.pageSize,
      totalPages: calculateTotalPages(total, i.pageSize),
    };
  }
}
