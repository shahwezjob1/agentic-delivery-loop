import type {
  CreateRequestInput,
  FeatureRequestDto,
  GetRequestInput,
  ListRequestsInput,
  PageResult,
} from '@agentic-delivery-loop/contracts';
import { notFoundError } from '../../errors/app-error';
import { calculateTotalPages } from '../../pagination/pagination';
import { nowIso } from '../../time/clock';
import { toFeatureRequestDto } from './request.mapper';
import { RequestRepository } from './request.repository';
export class RequestService {
  constructor(private readonly requests: RequestRepository) {}
  async createRequest(i: CreateRequestInput) {
    return toFeatureRequestDto(
      await this.requests.insert({
        id: crypto.randomUUID(),
        name: i.name,
        description: i.description,
        createdAt: nowIso(),
      }),
    );
  }
  async getRequest(i: GetRequestInput) {
    const r = await this.requests.findById(i.requestId);
    if (!r) throw notFoundError('Request', i.requestId);
    return toFeatureRequestDto(r);
  }
  async listRequests(
    i: ListRequestsInput & { page: number; pageSize: number },
  ): Promise<PageResult<FeatureRequestDto>> {
    const q: { page: number; pageSize: number; status?: typeof i.status } = {
      page: i.page,
      pageSize: i.pageSize,
    };
    if (i.status) q.status = i.status;
    const { rows, total } = await this.requests.list(q);
    return {
      items: rows.map(toFeatureRequestDto),
      page: i.page,
      pageSize: i.pageSize,
      totalPages: calculateTotalPages(total, i.pageSize),
    };
  }
}
