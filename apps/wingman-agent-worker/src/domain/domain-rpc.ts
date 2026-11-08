import type { RpcResult } from '@agentic-delivery-loop/contracts';

export class DomainRpcError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainRpcError';
  }
}

export function unwrapRpcResult<T>(result: RpcResult<T>): T {
  if (!result.ok) {
    throw new DomainRpcError(result.error.code, result.error.message);
  }
  return result.data;
}
