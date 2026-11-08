import type { FeatureRequestDto, PageResult, RpcResult } from '@agentic-delivery-loop/contracts';
import { toRpcResult } from '../../rpc/rpc-error';
import {
  createRequestInputSchema,
  getRequestInputSchema,
  listRequestsInputSchema,
} from './request.schema';
import { RequestService } from './request.service';
export class RequestRpc {
  constructor(private readonly service: RequestService) {}
  createRequest(i: unknown): Promise<RpcResult<FeatureRequestDto>> {
    return toRpcResult(() => this.service.createRequest(createRequestInputSchema.parse(i)));
  }
  getRequest(i: unknown): Promise<RpcResult<FeatureRequestDto>> {
    return toRpcResult(() => this.service.getRequest(getRequestInputSchema.parse(i)));
  }
  listRequests(i: unknown): Promise<RpcResult<PageResult<FeatureRequestDto>>> {
    return toRpcResult(() => this.service.listRequests(listRequestsInputSchema.parse(i)));
  }
}
