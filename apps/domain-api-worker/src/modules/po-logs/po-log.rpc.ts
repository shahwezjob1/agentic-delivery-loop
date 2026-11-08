import type { PageResult, PoLogDto, RpcResult } from '@agentic-delivery-loop/contracts';
import { toRpcResult } from '../../rpc/rpc-error';
import { appendPoLogInputSchema, listPoLogsInputSchema } from './po-log.schema';
import { PoLogService } from './po-log.service';
export class PoLogRpc {
  constructor(private readonly service: PoLogService) {}
  appendPoLog(i: unknown): Promise<RpcResult<PoLogDto>> {
    return toRpcResult(() => this.service.appendPoLog(appendPoLogInputSchema.parse(i)));
  }
  listPoLogs(i: unknown): Promise<RpcResult<PageResult<PoLogDto>>> {
    return toRpcResult(() => this.service.listPoLogs(listPoLogsInputSchema.parse(i)));
  }
}
