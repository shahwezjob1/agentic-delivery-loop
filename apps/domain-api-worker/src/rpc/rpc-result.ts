import type { RpcResult } from '@agentic-delivery-loop/contracts';
export function rpcSuccess<T>(data: T): RpcResult<T> {
  return { ok: true, data };
}
